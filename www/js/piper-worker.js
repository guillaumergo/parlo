/*
 * Parlo — moteur de synthèse vocale neuronale embarqué (Piper), exécuté dans un Web Worker.
 * 100 % hors ligne : le phonétiseur (espeak-ng compilé en WebAssembly), le moteur ONNX
 * et le modèle de voix sont tous inclus dans l'application.
 */
/* Worker de type "module" (ES modules). */
import * as ort from '../vendor/ort/ort.wasm.min.mjs';
import { createPiperPhonemize } from '../voices/piper/piper_phonemize.mjs';

const BASE = new URL('../', import.meta.url).href;

let phonemizerPromise = null;
let pendingPrint = null;
const voices = {}; // id -> Promise<{session, cfg}>
const high = [];
const low = [];
let busy = false;

function getPhonemizer() {
  if (!phonemizerPromise) {
    phonemizerPromise = createPiperPhonemize({
      locateFile: (f) => BASE + 'voices/piper/' + f,
      print: (line) => {
        if (pendingPrint) { const p = pendingPrint; pendingPrint = null; p(line); }
      },
      printErr: () => {},
    });
  }
  return phonemizerPromise;
}

async function phonemize(text, espeakVoice) {
  const mod = await getPhonemizer();
  let out = null;
  pendingPrint = (line) => { out = line; };
  // callMain est synchrone : print() est appelé pendant l'exécution.
  mod.callMain(['-l', espeakVoice, '--input', JSON.stringify([{ text }]), '--espeak_data', '/espeak-ng-data']);
  pendingPrint = null;
  if (!out) throw new Error('Phonétisation impossible');
  return JSON.parse(out).phoneme_ids;
}

function loadVoice(voice) {
  if (!voices[voice.id]) {
    voices[voice.id] = (async () => {
      ort.env.wasm.numThreads = 1; // la WebView Android n'est pas "cross-origin isolated"
      ort.env.wasm.proxy = false;
      ort.env.wasm.wasmPaths = BASE + 'vendor/ort/';
      const cfgRes = await fetch(BASE + 'voices/' + voice.config);
      if (!cfgRes.ok) throw new Error('Configuration de voix introuvable : ' + voice.config);
      const cfg = await cfgRes.json();
      const modelRes = await fetch(BASE + 'voices/' + voice.model);
      if (!modelRes.ok) throw new Error('Modèle de voix introuvable : ' + voice.model);
      const buf = await modelRes.arrayBuffer();
      const session = await ort.InferenceSession.create(new Uint8Array(buf), {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'all',
      });
      await getPhonemizer();
      return { session, cfg };
    })();
    voices[voice.id].catch(() => { delete voices[voice.id]; });
  }
  return voices[voice.id];
}

async function synth(job) {
  const { session, cfg } = await loadVoice(job.voice);
  const espeakVoice = (cfg.espeak && cfg.espeak.voice) || 'fr';
  const ids = await phonemize(job.text, espeakVoice);
  const inf = cfg.inference || {};
  const lengthScale = (inf.length_scale || 1) * (job.lengthFactor || 1);
  const feeds = {
    input: new ort.Tensor('int64', BigInt64Array.from(ids, (x) => BigInt(x)), [1, ids.length]),
    input_lengths: new ort.Tensor('int64', BigInt64Array.from([BigInt(ids.length)]), [1]),
    scales: new ort.Tensor('float32', Float32Array.from([(inf.noise_scale != null ? inf.noise_scale : 0.667), lengthScale, (inf.noise_w != null ? inf.noise_w : 0.8)]), [3]),
  };
  if (session.inputNames.includes('sid')) {
    feeds.sid = new ort.Tensor('int64', BigInt64Array.from([BigInt(job.speaker || 0)]), [1]);
  }
  const results = await session.run(feeds);
  const out = results[session.outputNames[0]];
  const pcm = new Float32Array(out.data); // copie détachable
  return { pcm, sampleRate: (cfg.audio && cfg.audio.sample_rate) || 22050 };
}

async function pump() {
  if (busy) return;
  const job = high.shift() || low.shift();
  if (!job) return;
  busy = true;
  try {
    if (job.type === 'load') {
      await loadVoice(job.voice);
      postMessage({ type: 'loaded', id: job.id });
    } else {
      const t0 = performance.now();
      const { pcm, sampleRate } = await synth(job);
      postMessage({ type: 'audio', id: job.id, key: job.key, pcm, sampleRate, ms: performance.now() - t0 }, [pcm.buffer]);
    }
  } catch (e) {
    postMessage({ type: 'error', id: job.id, key: job.key, message: String((e && e.message) || e) });
  } finally {
    busy = false;
    setTimeout(pump, 0);
  }
}

self.onmessage = (e) => {
  const msg = e.data;
  if (msg.type === 'cancelLow') { low.length = 0; return; }
  if (msg.priority === 'low') low.push(msg); else high.push(msg);
  pump();
};
