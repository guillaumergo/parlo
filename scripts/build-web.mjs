#!/usr/bin/env node
/*
 * Prépare la version web (appli installable) :
 *  - liste tous les fichiers de www/ dans www/precache.json (pour le fonctionnement hors ligne)
 *  - donne un numéro de version au service worker, pour que les tablettes reçoivent la mise à jour
 * À lancer après "npm run assets".
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const WWW = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'www');
const SKIP = new Set(['sw.js', 'precache.json']);

async function walk(dir, base = '') {
  const out = [];
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || e.name.startsWith('_')) continue;
    const rel = base ? `${base}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...(await walk(path.join(dir, e.name), rel)));
    else if (!SKIP.has(rel)) out.push(rel);
  }
  return out;
}

const files = (await walk(WWW)).sort();
const isAsset = (f) => f.startsWith('voices/') || f.startsWith('pictos/');
const core = ['./', ...files.filter((f) => !isAsset(f))];
const assets = files.filter(isAsset);

// Version = empreinte du contenu de l'appli (hors gros fichiers)
const hash = crypto.createHash('sha256');
for (const f of core.slice(1)) hash.update(f).update(await fs.readFile(path.join(WWW, f)));
const version = new Date().toISOString().slice(0, 10) + '-' + hash.digest('hex').slice(0, 8);

await fs.writeFile(path.join(WWW, 'precache.json'), JSON.stringify({ version, core, assets }, null, 1));
const swPath = path.join(WWW, 'sw.js');
const sw = await fs.readFile(swPath, 'utf8');
await fs.writeFile(swPath, sw.replace(/const BUILD = '[^']*';/, `const BUILD = '${version}';`));

let size = 0;
for (const f of files) size += (await fs.stat(path.join(WWW, f))).size;
console.log(`✔ Version web ${version} : ${core.length} fichiers d'appli, ${assets.length} fichiers voix/pictos, ${(size / 1e6).toFixed(1)} Mo au total`);
