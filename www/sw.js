/*
 * Parlo — service worker : rend l'appli web utilisable sans internet.
 *  - "core"   : l'appli elle-même (HTML, CSS, JS, moteur ONNX). Renouvelé à chaque mise à jour.
 *  - "assets" : voix, phonétiseur, pictogrammes (gros fichiers). Conservés d'une version à l'autre.
 * La liste des fichiers vient de precache.json (générée par scripts/build-web.mjs).
 */
const BUILD = 'dev'; // remplacé automatiquement à chaque publication
const CORE = 'parlo-core-' + BUILD;
const ASSETS = 'parlo-assets';

const FALLBACK_CORE = [
  './', 'index.html', 'manifest.webmanifest', 'css/app.css',
  'js/db.js', 'js/vocab.js', 'js/tts.js', 'js/grammar.js', 'js/app.js', 'js/editor.js', 'js/piper-worker.js',
  'icons/icon-192.png', 'icons/icon-512.png',
];

async function readList() {
  try {
    const res = await fetch('precache.json', { cache: 'no-store' });
    if (res.ok) return await res.json();
  } catch (e) { /* hors ligne ou absent */ }
  return { core: FALLBACK_CORE, assets: [] };
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const list = await readList();
    const cache = await caches.open(CORE);
    await cache.addAll(list.core.map((u) => new Request(u, { cache: 'reload' })));
  })());
  // Pas de skipWaiting automatique : la nouvelle version s'installe quand l'appli le demande
  // (au retour sur l'appli), pour ne jamais changer l'écran pendant qu'un enfant l'utilise.
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith('parlo-core-') && key !== CORE) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

/** Télécharge en arrière-plan les gros fichiers (voix, pictos) et indique la progression. */
let warming = null;
async function warmAssets(client) {
  const list = await readList();
  const cache = await caches.open(ASSETS);
  const todo = [];
  for (const u of list.assets) if (!(await cache.match(u))) todo.push(u);
  const total = list.assets.length;
  let done = total - todo.length;
  const report = (extra = {}) => client && client.postMessage({ type: 'warm', done, total, ...extra });
  report();
  const queue = todo.slice();
  async function worker() {
    while (queue.length) {
      const u = queue.shift();
      try {
        const res = await fetch(u, { cache: 'reload' });
        if (res.ok) await cache.put(u, res);
      } catch (e) { report({ error: true }); }
      done++;
      report();
    }
  }
  await Promise.all([worker(), worker(), worker()]);
  report({ finished: true });
}

self.addEventListener('message', (event) => {
  const msg = event.data || {};
  if (msg.type === 'skipWaiting') self.skipWaiting();
  if (msg.type === 'warm') {
    if (!warming) warming = warmAssets(event.source).finally(() => { warming = null; });
    event.waitUntil(warming);
  }
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // ARASAAC et autres sites : réseau normal
  if (url.pathname.endsWith('/precache.json')) return;

  event.respondWith((async () => {
    // Page d'accueil : toujours la version en cache
    if (req.mode === 'navigate') {
      const page = (await caches.match('index.html', { ignoreSearch: true })) || (await caches.match('./'));
      if (page) return page;
    }
    const hit = await caches.match(req, { ignoreSearch: true });
    if (hit) return hit;
    try {
      const res = await fetch(req);
      // Les fichiers lourds récupérés au passage sont gardés pour la prochaine fois
      if (res.ok && /\/(voices|pictos)\//.test(url.pathname)) {
        const cache = await caches.open(ASSETS);
        cache.put(req, res.clone());
      }
      return res;
    } catch (e) {
      return Response.error(); // vraie erreur réseau (jamais un faux contenu)
    }
  })());
});
