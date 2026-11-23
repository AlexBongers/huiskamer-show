import { execFile, spawn, spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * Roos-opnames maken vanuit /admin.
 *
 * De server stuurt hiervoor scripts/generate-tts.py aan. Zo bepaalt één plek welke teksten een opname
 * nodig hebben en hoe die bewerkt worden (even hard, zie scripts/tts_audio.py). Nodig op de server:
 * python3, ffmpeg en de omgevingsvariabele ELEVENLABS_API_KEY. In de Docker-image zitten python3 en ffmpeg.
 */

const REPO_ROOT = path.resolve(__dirname, '../../..');
const SCRIPTS_DIR = process.env.TTS_SCRIPTS_DIR || path.join(REPO_ROOT, 'scripts');
const PYTHON = process.env.PYTHON || 'python3';
const GENERATE_SCRIPT = path.join(SCRIPTS_DIR, 'generate-tts.py');

export interface TtsMissingEntry {
  category: string;
  text: string;
  hash: string;
  itemId: string;
}

export interface TtsJobState {
  running: boolean;
  startedAt?: string;
  finishedAt?: string;
  exitCode?: number | null;
  limit?: number;
  lines: string[];
}

export interface TtsStatus {
  toolsAvailable: boolean;
  toolsMessage?: string;
  keyConfigured: boolean;
  total: number;
  recorded: number;
  missingCount: number;
  missingChars: number;
  estimatedCredits: number;
  missing: TtsMissingEntry[];
  job: TtsJobState;
}

let toolsCache: { ok: boolean; message?: string } | null = null;

export function checkTtsTools(): { ok: boolean; message?: string } {
  if (toolsCache) return toolsCache;
  if (!fs.existsSync(GENERATE_SCRIPT)) {
    toolsCache = { ok: false, message: `Script niet gevonden: ${GENERATE_SCRIPT}` };
    return toolsCache;
  }
  const py = spawnSync(PYTHON, ['--version'], { encoding: 'utf-8' });
  if (py.error || py.status !== 0) {
    toolsCache = { ok: false, message: 'python3 ontbreekt op deze server.' };
    return toolsCache;
  }
  const ff = spawnSync('ffmpeg', ['-version'], { encoding: 'utf-8' });
  if (ff.error || ff.status !== 0) {
    toolsCache = { ok: false, message: 'ffmpeg ontbreekt op deze server.' };
    return toolsCache;
  }
  toolsCache = { ok: true };
  return toolsCache;
}

const job: TtsJobState = { running: false, lines: [] };

function pushLine(line: string): void {
  const clean = line.replace(/\s+$/, '');
  if (!clean) return;
  job.lines.push(clean);
  if (job.lines.length > 200) job.lines.splice(0, job.lines.length - 200);
}

export function getTtsJob(): TtsJobState {
  return { ...job, lines: [...job.lines] };
}

/** Welke teksten hebben nog geen opname? (snel: maakt niets en gebruikt geen credits) */
export function getTtsStatus(dataDir: string): Promise<TtsStatus> {
  const tools = checkTtsTools();
  const base = {
    toolsAvailable: tools.ok,
    toolsMessage: tools.message,
    job: getTtsJob(),
  };
  if (!fs.existsSync(GENERATE_SCRIPT)) {
    return Promise.resolve({
      ...base,
      keyConfigured: Boolean(process.env.ELEVENLABS_API_KEY),
      total: 0,
      recorded: 0,
      missingCount: 0,
      missingChars: 0,
      estimatedCredits: 0,
      missing: [],
    });
  }
  return new Promise((resolve, reject) => {
    execFile(
      PYTHON,
      [GENERATE_SCRIPT, '--check', '--json', '--data-dir', dataDir],
      { env: { ...process.env, DATA_DIR: dataDir }, maxBuffer: 32 * 1024 * 1024, timeout: 60_000 },
      (err, stdout) => {
        // --check eindigt altijd met code 0 in JSON-modus; een fout is dus echt een fout
        if (err && !stdout) {
          reject(new Error('Kon de status van de opnames niet bepalen.'));
          return;
        }
        try {
          const data = JSON.parse(stdout);
          resolve({ ...base, ...data });
        } catch {
          reject(new Error('Onverwachte uitvoer van generate-tts.py.'));
        }
      }
    );
  });
}

/** Start het maken van ontbrekende opnames (één tegelijk). Geeft een foutmelding terug als het niet kan. */
export function startTtsGeneration(dataDir: string, limit?: number): string | null {
  if (job.running) return 'Er worden al opnames gemaakt.';
  const tools = checkTtsTools();
  if (!tools.ok) return tools.message || 'Benodigde programma\'s ontbreken op de server.';

  const args = [GENERATE_SCRIPT, '--data-dir', dataDir];
  if (limit && limit > 0) args.push('--limit', String(Math.floor(limit)));

  job.running = true;
  job.startedAt = new Date().toISOString();
  job.finishedAt = undefined;
  job.exitCode = undefined;
  job.limit = limit && limit > 0 ? Math.floor(limit) : undefined;
  job.lines = [];

  const child = spawn(PYTHON, ['-u', ...args], {
    env: { ...process.env, DATA_DIR: dataDir },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let buffer = '';
  const onData = (chunk: Buffer) => {
    buffer += chunk.toString('utf-8');
    const parts = buffer.split('\n');
    buffer = parts.pop() ?? '';
    parts.forEach(pushLine);
  };
  child.stdout.on('data', onData);
  child.stderr.on('data', onData);
  child.on('error', (err) => {
    pushLine(`Kon het script niet starten: ${err.message}`);
  });
  child.on('close', (code) => {
    if (buffer) pushLine(buffer);
    buffer = '';
    job.running = false;
    job.exitCode = code;
    job.finishedAt = new Date().toISOString();
  });
  return null;
}
