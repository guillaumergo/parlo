/*
 * Parlo — voix de synthèse.
 *  - "system" : moteur TTS d'Android (ou du navigateur). Hors ligne si une voix française
 *               est installée sur la tablette (Paramètres Android > Synthèse vocale).
 *  - "piper"  : voix neuronale Piper embarquée dans l'appli, toujours hors ligne.
 */
(function (root) {
  const cap = root.Capacitor;
  const IS_NATIVE = !!(cap && typeof cap.nativePromise === 'function' &&
    (typeof cap.getPlatform === 'function' ? cap.getPlatform() !== 'web' : true));

  const native = (method, opts) => cap.nativePromise('TextToSpeech', method, opts || {});

  let settings = null;
  let onStatus = () => {};
  let systemVoices = []; // {key, name, lang, local, nativeIndex?, webVoice?}
  let piperVoices = null;
  let worker = null;
  let jobSeq = 0;
  const jobs = new Map(); // id -> {resolve, reject}
  const memCache = new Map(); // key -> {pcm, sampleRate}
  const MEM_MAX = 400;
  let audioCtx = null;
  let currentSource = null;
  let speakToken = 0;

  /* ---------- Voix système ---------- */

  async function loadSystemVoices() {
    if (IS_NATIVE) {
      try {
        const { voices } = await native('getSupportedVoices');
        systemVoices = voices
          .map((v, i) => ({ key: 'n:' + v.voiceURI, name: v.name, lang: v.lang, local: v.localService, nativeIndex: i }))
          .filter((v) => /^fr/i.test(v.lang));
      } catch (e) { systemVoices = []; }
      return systemVoices;
    }
    if (!('speechSynthesis' in root)) return (systemVoices = []);
    const list = await new Promise((resolve) => {
      let v = speechSynthesis.getVoices();
      if (v.length) return resolve(v);
      const done = () => resolve(speechSynthesis.getVoices());
      speechSynthesis.onvoiceschanged = done;
      setTimeout(done, 1500);
    });
    systemVoices = list.filter((v) => /^fr/i.test(v.lang))
      .map((v) => ({ key: 'w:' + v.voiceURI, name: v.name, lang: v.lang, local: v.localService, webVoice: v }));
    return systemVoices;
  }

  function pickSystemVoice() {
    const wanted = systemVoices.find((v) => v.key === settings.systemVoice);
    if (wanted) return wanted;
    // Par défaut : une voix française locale (hors ligne)
    return systemVoices.find((v) => v.local && /fr[-_]FR/i.test(v.lang)) ||
      systemVoices.find((v) => v.local) || systemVoices[0] || null;
  }

  async function speakSystem(text) {
    const v = pickSystemVoice();
    if (IS_NATIVE) {
      const opts = { text, lang: (v && v.lang) || 'fr-FR', rate: settings.rate, pitch: settings.pitch, volume: settings.volume, queueStrategy: 0 };
      if (v) opts.voice = v.nativeIndex;
      return native('speak', opts).catch((e) => onStatus('Voix système indisponible : ' + (e.message || e), 'error'));
    }
    if (!('speechSynthesis' in root)) { onStatus('Aucune voix système dans ce navigateur', 'error'); return; }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = (v && v.lang) || 'fr-FR';
    if (v && v.webVoice) u.voice = v.webVoice;
    u.rate = settings.rate; u.pitch = settings.pitch; u.volume = settings.volume;
    speechSynthesis.speak(u);
  }

  /* ---------- Voix Piper embarquée ---------- */

  async function loadPiperVoices() {
    if (piperVoices) return piperVoices;
    try {
      const res = await fetch('voices/index.json', { cache: 'no-store' });
      piperVoices = res.ok ? await res.json() : [];
    } catch (e) { piperVoices = []; }
    return piperVoices;
  }

  let piperBroken = false;

  /** Message compréhensible pour une erreur de la voix embarquée. */
  function explain(e) {
    const m = String((e && e.message) || e || '');
    if (/magic word|fetch|network|NetworkError|Hors ligne|503|Load failed/i.test(m) || !navigator.onLine) {
      return "Voix embarquée pas encore enregistrée sur cet appareil : laissez Parlo ouvert quelques minutes avec internet";
    }
    if (/memory|allocation|RangeError/i.test(m)) {
      return 'Voix embarquée trop lourde pour la mémoire de cet appareil (' + m.slice(0, 80) + ')';
    }
    return 'Voix embarquée indisponible (' + m.slice(0, 160) + ')';
  }

  // Quand la connexion revient, on redonne sa chance à la voix embarquée
  root.addEventListener('online', () => {
    if (!piperBroken && worker) return;
    piperBroken = false;
    if (worker) { worker.terminate(); worker = null; }
    if (settings && settings.engine === 'piper') TTS.warmUp();
  });
  function currentPiperVoice() {
    if (piperBroken || !piperVoices || !piperVoices.length) return null;
    return piperVoices.find((v) => v.id === settings.piperVoice) || piperVoices[0];
  }

  function getWorker() {
    if (worker) return worker;
    worker = new Worker('js/piper-worker.js', { type: 'module' });
    worker.onmessage = (e) => {
      const m = e.data;
      const j = jobs.get(m.id);
      if (!j) return;
      jobs.delete(m.id);
      if (m.type === 'error') j.reject(new Error(m.message)); else j.resolve(m);
    };
    worker.onerror = (e) => {
      // Le worker n'a pas pu démarrer (fichiers manquants…) : on bascule sur la voix système.
      piperBroken = true;
      for (const j of jobs.values()) j.reject(new Error(e.message || 'moteur indisponible'));
      jobs.clear();
      onStatus('Erreur du moteur de voix embarqué : ' + (e.message || 'inconnue'), 'error');
    };
    return worker;
  }

  function post(msg) {
    return new Promise((resolve, reject) => {
      const id = ++jobSeq;
      jobs.set(id, { resolve, reject });
      getWorker().postMessage({ ...msg, id });
    });
  }

  const lengthFactor = () => 1 / Math.max(0.3, settings.rate || 1);
  const cacheKey = (voice, text) => voice.id + '|' + lengthFactor().toFixed(2) + '|' + text;

  function remember(key, entry) {
    memCache.set(key, entry);
    if (memCache.size > MEM_MAX) memCache.delete(memCache.keys().next().value);
  }

  async function getPiperAudio(text, priority) {
    const voice = currentPiperVoice();
    if (!voice) throw new Error("Aucune voix embarquée n'est installée dans l'appli");
    const key = cacheKey(voice, text);
    if (memCache.has(key)) return memCache.get(key);
    const stored = await root.ParloDB.get('audio', key).catch(() => null);
    if (stored) { remember(key, stored); return stored; }
    const m = await post({ type: 'synth', voice, text, lengthFactor: lengthFactor(), key, priority });
    const entry = { pcm: m.pcm, sampleRate: m.sampleRate };
    remember(key, entry);
    root.ParloDB.put('audio', key, entry).catch(() => {});
    return entry;
  }

  function ensureAudio() {
    if (!audioCtx) audioCtx = new (root.AudioContext || root.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  function stopPlayback() {
    if (currentSource) { try { currentSource.stop(); } catch (e) { /* déjà arrêté */ } currentSource = null; }
  }

  async function speakPiper(text) {
    const ctx = ensureAudio(); // doit être appelé pendant le geste de l'utilisateur
    const token = ++speakToken;
    stopPlayback();
    let audio;
    try {
      audio = await getPiperAudio(text, 'high');
    } catch (e) {
      onStatus(explain(e) + ' — voix système utilisée.', 'error');
      return speakSystem(text);
    }
    if (token !== speakToken) return; // une autre parole a été demandée entre-temps
    const buf = ctx.createBuffer(1, audio.pcm.length, audio.sampleRate);
    buf.copyToChannel(audio.pcm, 0);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const gain = ctx.createGain();
    gain.gain.value = settings.volume;
    src.connect(gain).connect(ctx.destination);
    src.start();
    currentSource = src;
  }

  /* ---------- API publique ---------- */

  const TTS = {
    IS_NATIVE,
    async init(appSettings, statusCb) {
      settings = appSettings;
      onStatus = statusCb || onStatus;
      await Promise.all([loadSystemVoices(), loadPiperVoices()]);
      if (settings.engine === 'piper' && !currentPiperVoice()) {
        onStatus("Voix embarquée absente de cette version : la voix système est utilisée.", 'warn');
      }
    },
    systemVoices: () => systemVoices,
    piperVoices: () => piperVoices || [],
    reloadSystemVoices: loadSystemVoices,
    hasPiper: () => !!currentPiperVoice(),

    speak(text) {
      text = (text || '').trim();
      if (!text || !settings) return;
      if (settings.engine === 'piper' && currentPiperVoice()) return speakPiper(text);
      return speakSystem(text);
    },

    stop() {
      speakToken++;
      stopPlayback();
      if (IS_NATIVE) native('stop').catch(() => {});
      else if ('speechSynthesis' in root) speechSynthesis.cancel();
    },

    /** Pré-calcule en arrière-plan l'audio des cases affichées (voix embarquée uniquement). */
    prefetch(texts) {
      if (!settings || settings.engine !== 'piper' || !currentPiperVoice()) return;
      getWorker().postMessage({ type: 'cancelLow' });
      for (const t of texts) {
        const text = (t || '').trim();
        if (text) getPiperAudio(text, 'low').catch(() => {});
      }
    },

    /** Charge le modèle à l'avance (évite l'attente au premier mot). */
    async warmUp() {
      const voice = currentPiperVoice();
      if (settings.engine !== 'piper' || !voice) return;
      onStatus('Chargement de la voix embarquée…', 'info');
      try {
        await post({ type: 'load', voice });
        onStatus('Voix embarquée prête', 'ok');
      } catch (e) {
        onStatus(explain(e), 'error');
      }
    },

    /** Test de la voix embarquée (utilisé par scripts/test-voice.mjs). */
    async selfTest(text) {
      const t0 = performance.now();
      const voice = currentPiperVoice();
      if (!voice) throw new Error('aucune voix embarquée');
      const m = await post({ type: 'synth', voice, text, lengthFactor: 1, key: 'selftest', priority: 'high' });
      return { voice: voice.id, samples: m.pcm.length, sampleRate: m.sampleRate, ms: performance.now() - t0, pcm: Array.from(m.pcm) };
    },

    async clearAudioCache() {
      memCache.clear();
      await root.ParloDB.clear('audio');
    },

    /** Ouvre l'écran Android d'installation des données vocales (voix hors ligne). */
    openSystemInstall() {
      if (IS_NATIVE) return native('openInstall');
      onStatus('Disponible uniquement sur la tablette Android', 'warn');
    },
  };

  root.ParloTTS = TTS;
})(self);
