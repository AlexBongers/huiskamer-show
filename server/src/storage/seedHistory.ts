import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

/**
 * Verbeteringen in de standaardvragen (server/seed) naar bestaande installaties brengen,
 * zonder eigen aanpassingen te overschrijven.
 *
 * `seed-history.json` bevat per vraag de vingerafdrukken van alle eerdere versies die ooit in de seed
 * hebben gestaan (opgebouwd uit de git-geschiedenis met scripts/build-seed-history.ts). Staat er in de
 * data-map precies zo'n oude versie, dan is die niet aangepast en mag hij worden bijgewerkt. Wijkt hij
 * af van elke bekende versie, dan heeft iemand hem in /admin aangepast en blijft hij staan.
 */
export const SEED_CONTENT_FILES = [
  'quiz.json',
  'thirtySeconds.json',
  'sounds.json',
  'zoomPhotos.json',
  'pantomime.json',
  'estimates.json',
] as const;

export type SeedContentFile = (typeof SEED_CONTENT_FILES)[number];

/** bestand -> id -> vingerafdrukken van eerdere versies (de huidige versie staat er niet in) */
export type SeedHistory = Partial<Record<SeedContentFile, Record<string, string[]>>>;

export const SEED_HISTORY_FILENAME = 'seed-history.json';

/** JSON met gesorteerde sleutels, zodat dezelfde inhoud altijd dezelfde tekst (en vingerafdruk) geeft. */
export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((v) => stableStringify(v === undefined ? null : v)).join(',')}]`;
  }
  if (value !== null && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj)
      .filter((k) => obj[k] !== undefined)
      .sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

export function contentHash(item: unknown): string {
  return crypto.createHash('sha1').update(stableStringify(item)).digest('hex');
}

export function loadSeedHistory(seedDir: string): SeedHistory {
  try {
    return JSON.parse(
      fs.readFileSync(path.join(seedDir, SEED_HISTORY_FILENAME), 'utf-8')
    ) as SeedHistory;
  } catch {
    return {};
  }
}
