/**
 * Bouwt server/seed/seed-history.json op uit de git-geschiedenis: per standaardvraag de vingerafdrukken
 * van alle eerdere versies. Daarmee kan de server verbeterde standaardvragen naar bestaande installaties
 * brengen zonder eigen aanpassingen te overschrijven (zie server/src/storage/seedHistory.ts).
 *
 *   npx tsx scripts/build-seed-history.ts          # bijwerken (na het wijzigen van een seed-bestand)
 *   npx tsx scripts/build-seed-history.ts --check  # controleren of het bestand nog klopt (voor tests/CI)
 *
 * Draai dit na het committen van een wijziging in server/seed, of ervoor: de huidige versie op schijf
 * telt altijd als "nieuwste" en komt dus niet in de lijst met oude versies.
 */
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import {
  SEED_CONTENT_FILES,
  SEED_HISTORY_FILENAME,
  SeedHistory,
  contentHash,
  stableStringify,
} from '../server/src/storage/seedHistory';

const ROOT = path.resolve(__dirname, '..');
const SEED_DIR = path.join(ROOT, 'server', 'seed');
const OUT = path.join(SEED_DIR, SEED_HISTORY_FILENAME);

function git(args: string[]): string {
  return execFileSync('git', args, {
    cwd: ROOT,
    maxBuffer: 256 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'ignore'],
  }).toString();
}

function build(): SeedHistory {
  const history: SeedHistory = {};
  for (const file of SEED_CONTENT_FILES) {
    const rel = `server/seed/${file}`;
    const versions = new Map<string, Set<string>>();
    const shas = git(['log', '--format=%H', '--', rel]).split('\n').filter(Boolean);
    for (const sha of shas) {
      let items: Array<{ id?: string }>;
      try {
        items = JSON.parse(git(['show', `${sha}:${rel}`]));
      } catch {
        continue; // bestand bestond in die commit niet of was geen geldige JSON
      }
      if (!Array.isArray(items)) continue;
      for (const item of items) {
        if (!item || typeof item.id !== 'string') continue;
        if (!versions.has(item.id)) versions.set(item.id, new Set());
        versions.get(item.id)!.add(contentHash(item));
      }
    }

    const current = JSON.parse(fs.readFileSync(path.join(SEED_DIR, file), 'utf-8')) as Array<{ id: string }>;
    const currentHash = new Map(current.map((it) => [it.id, contentHash(it)]));
    const perId: Record<string, string[]> = {};
    for (const [id, hashes] of [...versions.entries()].sort(([a], [b]) => a.localeCompare(b))) {
      const old = [...hashes].filter((h) => h !== currentHash.get(id)).sort();
      if (old.length > 0) perId[id] = old;
    }
    if (Object.keys(perId).length > 0) history[file] = perId;
  }
  return history;
}

function main(): void {
  const check = process.argv.includes('--check');
  const fresh = build();
  const freshText = JSON.stringify(JSON.parse(stableStringify(fresh)), null, 1) + '\n';
  if (check) {
    const existing = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf-8') : '';
    if (existing !== freshText) {
      console.error(
        `${SEED_HISTORY_FILENAME} is niet actueel. Draai: npx tsx scripts/build-seed-history.ts en commit het resultaat.`
      );
      process.exit(1);
    }
    console.log(`${SEED_HISTORY_FILENAME} is actueel.`);
    return;
  }
  fs.writeFileSync(OUT, freshText, 'utf-8');
  const count = Object.values(fresh).reduce((n, perId) => n + Object.keys(perId ?? {}).length, 0);
  console.log(`${SEED_HISTORY_FILENAME} bijgewerkt: ${count} standaardvragen met eerdere versies.`);
}

main();
