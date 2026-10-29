#!/usr/bin/env node
/*
 * Prépare les fichiers embarqués dans l'appli (à lancer avant de construire l'APK) :
 *   1. le moteur ONNX Runtime Web (depuis node_modules)
 *   2. la ou les voix Piper françaises (depuis Hugging Face, ~60 Mo par voix)
 *   3. les pictogrammes ARASAAC du vocabulaire de base
 *
 * Variables d'environnement :
 *   VOICES="fr_FR-siwis-medium,fr_FR-tom-medium"   voix à intégrer
 *   SKIP_PICTOS=1                                   ne pas télécharger les pictos
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WWW = path.join(ROOT, 'www');
const require = createRequire(import.meta.url);

const VOICE_NAMES = {
  siwis: 'Siwis — voix féminine',
  tom: 'Tom — voix masculine',
  gilles: 'Gilles — voix masculine',
  upmc: 'UPMC — voix mixte',
  mls: 'MLS — voix multiple',
};

const exists = (p) => fs.access(p).then(() => true, () => false);

async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(dest, buf);
  return buf.length;
}

/* 1. ONNX Runtime Web */
async function copyOrt() {
  const dist = path.join(path.dirname(require.resolve('onnxruntime-web/package.json')), 'dist');
  const out = path.join(WWW, 'vendor', 'ort');
  await fs.mkdir(out, { recursive: true });
  const files = (await fs.readdir(dist)).filter((f) =>
    f === 'ort.wasm.min.mjs' || /^ort-wasm-simd-threaded\.(mjs|wasm)$/.test(f));
  if (!files.includes('ort.wasm.min.mjs') || !files.some((f) => f.endsWith('.wasm'))) {
    throw new Error('Fichiers onnxruntime-web introuvables dans ' + dist + ' : ' + files.join(', '));
  }
  for (const f of files) await fs.copyFile(path.join(dist, f), path.join(out, f));
  console.log('✔ ONNX Runtime Web :', files.join(', '));
}

/* 2. Voix Piper */
async function fetchVoices() {
  const ids = (process.env.VOICES || 'fr_FR-siwis-medium').split(',').map((s) => s.trim()).filter(Boolean);
  const dir = path.join(WWW, 'voices');
  await fs.mkdir(dir, { recursive: true });
  const index = [];
  for (const id of ids) {
    const [locale, name, quality] = id.split('-');
    const lang = locale.split('_')[0];
    const base = `https://huggingface.co/rhasspy/piper-voices/resolve/main/${lang}/${locale}/${name}/${quality}/${id}`;
    const model = `${id}.onnx`;
    const config = `${id}.onnx.json`;
    for (const f of [model, config]) {
      const dest = path.join(dir, f);
      if (await exists(dest)) { console.log('  (déjà présent)', f); continue; }
      const size = await download(base.replace(/[^/]+$/, '') + f, dest);
      console.log(`  ↓ ${f} (${(size / 1e6).toFixed(1)} Mo)`);
    }
    const card = path.join(dir, `${id}.MODEL_CARD.txt`);
    if (!(await exists(card))) {
      await download(base.replace(/[^/]+$/, '') + 'MODEL_CARD', card).catch(() => {});
    }
    let license = '';
    try { license = (/License:\s*(.+)/i.exec(await fs.readFile(card, 'utf8')) || [])[1] || ''; } catch { /* rien */ }
    index.push({ id, name: `${VOICE_NAMES[name] || name} (${quality})`, model, config, license: license.trim() });
  }
  await fs.writeFile(path.join(dir, 'index.json'), JSON.stringify(index, null, 2));
  console.log('✔ Voix embarquées :', index.map((v) => v.id).join(', '));
}

/* 3. Pictogrammes ARASAAC du vocabulaire de base */
async function fetchPictos() {
  if (process.env.SKIP_PICTOS) { console.log('— Pictos ignorés (SKIP_PICTOS)'); return; }
  const { allPictoKeywords } = require(path.join(WWW, 'js', 'vocab.js'));
  const dir = path.join(WWW, 'pictos');
  await fs.mkdir(dir, { recursive: true });
  const indexPath = path.join(dir, 'index.json');
  const index = (await exists(indexPath)) ? JSON.parse(await fs.readFile(indexPath, 'utf8')) : {};
  const queue = allPictoKeywords().filter((k) => !index[k]);
  let ok = 0, ko = 0;
  async function worker() {
    while (queue.length) {
      const kw = queue.shift();
      try {
        const res = await fetch(`https://api.arasaac.org/v1/pictograms/es/bestsearch/${encodeURIComponent(kw)}`);
        if (!res.ok) throw new Error(res.status);
        const [first] = await res.json();
        const file = `${first._id}.png`;
        const dest = path.join(dir, file);
        if (!(await exists(dest))) {
          await download(`https://static.arasaac.org/pictograms/${first._id}/${first._id}_300.png`, dest);
        }
        index[kw] = file; ok++;
      } catch (e) { ko++; console.warn('  ⚠ picto introuvable :', kw); }
    }
  }
  await Promise.all(Array.from({ length: 6 }, worker));
  await fs.writeFile(indexPath, JSON.stringify(index, null, 1));
  console.log(`✔ Pictos ARASAAC : ${Object.keys(index).length} au total (${ok} nouveaux, ${ko} introuvables)`);
}

try {
  await copyOrt();
  await fetchVoices();
  await fetchPictos();
} catch (e) {
  console.error('✖', e.message);
  process.exit(1);
}
