// Kestrel Post — the hand-in program.
// One clear job: copy game/ and screenshots/ into the output directory
// and write dossier.json with buildDossier from vendor/makefun-game.ts.
// Runs as `node main.ts` (Node 22), stdlib only, no network.
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildDossier } from './vendor/makefun-game.ts';

const OUT = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const ROOT = new URL('.', import.meta.url).pathname;

function copyTree(src: string, dest: string): void {
  mkdirSync(dest, { recursive: true });
  for (const name of readdirSync(src)) {
    const from = join(src, name);
    const to = join(dest, name);
    if (statSync(from).isDirectory()) {
      copyTree(from, to);
    } else {
      cpSync(from, to);
    }
  }
}

function countFiles(dir: string): number {
  let n = 0;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    n += statSync(p).isDirectory() ? countFiles(p) : 1;
  }
  return n;
}

const gameDir = join(ROOT, 'game');
const shotsDir = join(ROOT, 'screenshots');
if (!existsSync(gameDir)) throw new Error('game/ is missing from the repository');
if (!existsSync(shotsDir)) throw new Error('screenshots/ is missing from the repository');
if (!existsSync(join(gameDir, 'index.html'))) throw new Error('game/index.html is missing');

mkdirSync(OUT, { recursive: true });
copyTree(gameDir, join(OUT, 'game'));
copyTree(shotsDir, join(OUT, 'screenshots'));

const dossier = buildDossier(OUT, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 48 * 1024 * 1024,
  game_path_max_bytes: 1000
});
writeFileSync(join(OUT, 'dossier.json'), dossier);
const parsed = JSON.parse(readFileSync(join(OUT, 'dossier.json'), 'utf8'));
if (!parsed || typeof parsed !== 'object') throw new Error('dossier.json did not parse after writing');

const shotNames = readdirSync(join(OUT, 'screenshots')).filter((n) => !n.startsWith('.')).sort();
console.log(`Kestrel Post: ${countFiles(join(OUT, 'game'))} game files, ${shotNames.length} screenshots (${shotNames.join(', ')})`);
console.log(`dossier.json: ${dossier.length} bytes written to ${OUT}`);
