#!/usr/bin/env node
/*
 * Vérifie que la voix embarquée fonctionne vraiment (dans Chromium, comme dans la WebView Android)
 * et enregistre un exemple audio dans test-output/exemple-voix.wav.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { serve } from './serve.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEXT = "Bonjour ! Je m'appelle Parlo. J'ai faim, je veux manger des pâtes.";

function wav(samples, sampleRate) {
  const buf = Buffer.alloc(44 + samples.length * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + samples.length * 2, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sampleRate, 24); buf.writeUInt32LE(sampleRate * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((s, i) => buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(s * 32767))), 44 + i * 2));
  return buf;
}

const server = await serve(0);
const port = server.address().port;
const browser = await chromium.launch();
let failed = false;
try {
  const page = await browser.newPage();
  page.on('console', (m) => console.log('[page]', m.text()));
  page.on('pageerror', (e) => console.log('[erreur page]', e.message));
  await page.goto(`http://localhost:${port}/index.html`);
  await page.waitForFunction(() => self.ParloTTS && self.ParloTTS.piperVoices().length > 0, null, { timeout: 20000 });
  const r1 = await page.evaluate((t) => self.ParloTTS.selfTest(t), TEXT);
  const r2 = await page.evaluate(() => self.ParloTTS.selfTest('oui'));
  console.log(`Voix ${r1.voice} : phrase ${(r1.samples / r1.sampleRate).toFixed(2)} s d'audio en ${Math.round(r1.ms)} ms (chargement inclus)`);
  console.log(`Mot isolé « oui » : ${Math.round(r2.ms)} ms`);
  if (r1.samples < r1.sampleRate) throw new Error('audio trop court');
  const peak = r1.pcm.reduce((m, x) => Math.max(m, Math.abs(x)), 0);
  if (peak < 0.05) throw new Error('audio silencieux');
  await fs.mkdir(path.join(ROOT, 'test-output'), { recursive: true });
  await fs.writeFile(path.join(ROOT, 'test-output', 'exemple-voix.wav'), wav(r1.pcm, r1.sampleRate));
  console.log('✔ Voix embarquée OK — exemple : test-output/exemple-voix.wav');
} catch (e) {
  failed = true;
  console.error('✖ Test de la voix embarquée échoué :', e.message);
} finally {
  await browser.close();
  server.close();
}
process.exit(failed ? 1 : 0);
