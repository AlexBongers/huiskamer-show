#!/usr/bin/env python3
"""
Generate Dutch female studio voice-overs for De Grote Huiskamer Show
using ElevenLabs Flash v2.5 (Voice: Roos, 7qdUFMklKPaaAVMsBTBt)
with two-pass EBU R128 loudness normalization (-16 LUFS, -1.5 dBTP)
via ffmpeg so every single spoken clip has uniform volume.
"""
import concurrent.futures
import json
import os
import pathlib
import re
import subprocess
import sys
import tempfile
import threading
import time
import urllib.error
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
SEED_DIR = ROOT / "server" / "seed"
OUT_DIR = ROOT / "server" / "data" / "tts"
ENV_FILE = ROOT / ".env"

VOICE_ID = "7qdUFMklKPaaAVMsBTBt"  # Roos — warm Dutch female voice
MODEL_ID = "eleven_flash_v2_5"
TARGET_LUFS = -16.0
TARGET_TP = -1.5
TARGET_LRA = 7.0
MIN_CREDIT_BUFFER = 1500  # Keep safety buffer on shared Starter account

# TV Showmaster studio announcements (played on /tv when not muted)
TV_ANNOUNCEMENTS = [
    "Welkom bij De Grote Familie Bongers Show! Pak jullie telefoons en maak je klaar!",
    "Tijd voor de Slimme Quiz! Kijk snel op je eigen scherm!",
    "Tijd voor Dertig Seconden! Omschrijf zoveel mogelijk woorden zonder het woord te zeggen!",
    "Spits je oren! Het is tijd voor de Geluidsronde!",
    "Ogen op de televisie! Wat zie je op deze ingezoomde foto?",
    "Tijd voor Pantomime! Uitbeelden maar, zonder geluid!",
    "Tijd voor de Schattingsvraag! Wie zit het dichtst bij het juiste getal?",
    "Even pauze! Alle klokken staan netjes stil.",
    "We gaan weer verder! Veel succes allemaal!",
    "En dat was de grote finale! Wat een fantastische show, applaus voor iedereen!",
]

# Fixed 4 answer button colors for non-readers (Lucas)
ANSWER_COLOR_WORDS = ["Rood", "Blauw", "Groen", "Geel"]


def fnv1a_64_hex(text: str) -> str:
    """Deterministic 64-bit FNV-1a hash matching client/server TypeScript implementation."""
    h = 0xCBF29CE484222325
    prime = 0x100000001B3
    mask = 0xFFFFFFFFFFFFFFFF
    for b in text.strip().encode("utf-8"):
        h ^= b
        h = (h * prime) & mask
    return f"{h:016x}"


def load_api_key() -> str:
    if os.environ.get("ELEVENLABS_API_KEY"):
        return os.environ["ELEVENLABS_API_KEY"].strip()
    if ENV_FILE.exists():
        for line in ENV_FILE.read_text(errors="ignore").splitlines():
            if line.strip().startswith("ELEVENLABS_API_KEY="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    raise RuntimeError("ELEVENLABS_API_KEY not found in env or .env")


def get_subscription(api_key: str) -> dict:
    req = urllib.request.Request(
        "https://api.elevenlabs.io/v1/user/subscription",
        headers={"xi-api-key": api_key, "Accept": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read().decode())


def collect_texts() -> list[tuple[str, str]]:
    """Return ordered list of (category_label, text) deduplicated by hash, highest priority first."""
    quiz = json.loads((SEED_DIR / "quiz.json").read_text())
    ts = json.loads((SEED_DIR / "thirtySeconds.json").read_text())
    est = json.loads((SEED_DIR / "estimates.json").read_text())
    panto = json.loads((SEED_DIR / "pantomime.json").read_text())
    snd = json.loads((SEED_DIR / "sounds.json").read_text())

    raw_items: list[tuple[str, str]] = []

    # Priority 1: TV Showmaster announcements & 4 answer color words
    for t in TV_ANNOUNCEMENTS:
        raw_items.append(("tv_showmaster", t))
    for c in ANSWER_COLOR_WORDS:
        raw_items.append(("answer_colors", c))

    # Priority 1b: Answer option labels for Ontdekker (Lucas) & Sound Challenges
    for q in quiz:
        if q.get("level") == "ontdekker":
            for opt in q.get("options", []):
                raw_items.append(("ontdekker_opt", opt["label"]))
    for s in snd:
        for opt in s.get("options", []):
            raw_items.append(("sound_opt", opt["label"]))

    # Priority 2: Ontdekker (Lucas) & Avonturier (Lana) Quiz questions
    for lvl in ["ontdekker", "avonturier"]:
        for q in quiz:
            if q.get("level") == lvl:
                raw_items.append((f"quiz_{lvl}", q.get("spokenPrompt") or q["prompt"]))

    # Priority 3: Estimates, Pantomime, Sound prompts
    for e in est:
        raw_items.append(("estimates", e.get("spokenPrompt") or e["prompt"]))
    for p in panto:
        hint = p.get("hint", "")
        raw_items.append(("pantomime", f"{p['prompt']}! {hint}".strip()))
    for s in snd:
        raw_items.append(("sounds", s["prompt"]))

    # Priority 4: 30 Seconds words (ontdekker -> avonturier -> meester)
    for lvl in ["ontdekker", "avonturier", "meester"]:
        for c in ts:
            if c.get("level") == lvl:
                for it in c.get("items", []):
                    raw_items.append((f"30s_{lvl}", it["word"]))

    # Priority 5: Meester (Papa & Mama) Quiz questions
    for q in quiz:
        if q.get("level") == "meester":
            raw_items.append(("quiz_meester", q.get("spokenPrompt") or q["prompt"]))

    seen: set[str] = set()
    ordered: list[tuple[str, str]] = []
    for cat, text in raw_items:
        clean = text.strip()
        if not clean:
            continue
        h = fnv1a_64_hex(clean)
        if h not in seen:
            seen.add(h)
            ordered.append((cat, clean))
    return ordered


def normalize_mp3_loudness(raw_mp3: bytes, out_path: pathlib.Path) -> None:
    """Broadcast vocal leveling (gentle highpass + plosive compressor + EBU R128 loudnorm -16 LUFS)."""
    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp_in:
        tmp_in.write(raw_mp3)
        in_path = tmp_in.name
    tmp_out = str(out_path) + ".tmp.mp3"
    try:
        af = (
            "highpass=f=80,"
            "acompressor=threshold=-20dB:ratio=3.5:attack=5:release=60:makeup=3,"
            f"loudnorm=I={TARGET_LUFS}:TP={TARGET_TP}:LRA=6"
        )
        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-hide_banner",
                "-loglevel",
                "error",
                "-i",
                in_path,
                "-af",
                af,
                "-ar",
                "44100",
                "-ac",
                "1",
                "-b:a",
                "64k",
                tmp_out,
            ],
            check=True,
        )
        os.replace(tmp_out, out_path)
    finally:
        for p in (in_path, tmp_out):
            try:
                if os.path.exists(p):
                    os.unlink(p)
            except OSError:
                pass


def generate_one(api_key: str, text: str, out_path: pathlib.Path) -> int:
    payload = json.dumps(
        {
            "text": text,
            "model_id": MODEL_ID,
            "language_code": "nl",
            "voice_settings": {
                "stability": 0.58,
                "similarity_boost": 0.78,
                "style": 0.0,
                "use_speaker_boost": True,
            },
        }
    ).encode("utf-8")

    for attempt in range(4):
        try:
            req = urllib.request.Request(
                f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}?output_format=mp3_44100_128",
                data=payload,
                headers={
                    "xi-api-key": api_key,
                    "Content-Type": "application/json",
                    "Accept": "audio/mpeg",
                },
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=30) as resp:
                cost_hdr = resp.headers.get("character-cost")
                cost = int(cost_hdr) if cost_hdr and cost_hdr.isdigit() else max(1, len(text) // 2)
                raw = resp.read()
            normalize_mp3_loudness(raw, out_path)
            return cost
        except urllib.error.HTTPError as e:
            if e.code == 429 or e.code >= 500:
                time.sleep(1.5 * (attempt + 1))
                continue
            body = e.read().decode("utf-8", errors="ignore")
            raise RuntimeError(f"HTTP {e.code}: {body[:200]}") from e
        except Exception:
            if attempt < 3:
                time.sleep(1.0 * (attempt + 1))
                continue
            raise
    raise RuntimeError("Max retries exceeded")


def write_manifest() -> int:
    files = sorted(p.stem for p in OUT_DIR.glob("*.mp3"))
    manifest = {
        "voiceId": VOICE_ID,
        "voiceName": "Roos (NL)",
        "modelId": MODEL_ID,
        "targetLufs": TARGET_LUFS,
        "count": len(files),
        "hashes": files,
    }
    (OUT_DIR / "manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
    return len(files)


def main() -> None:
    api_key = load_api_key()
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    sub = get_subscription(api_key)
    start_used = sub.get("character_count", 0)
    limit = sub.get("character_limit", 40000)
    max_spend = max(0, (limit - start_used) - MIN_CREDIT_BUFFER)
    print(
        f"ElevenLabs Starter budget: used={start_used:,} / {limit:,} | "
        f"remaining={limit - start_used:,} | max_spend (keeping {MIN_CREDIT_BUFFER:,} buffer)={max_spend:,}",
        flush=True,
    )

    items = collect_texts()
    todo = [(cat, txt, fnv1a_64_hex(txt)) for cat, txt in items if not (OUT_DIR / f"{fnv1a_64_hex(txt)}.mp3").exists()]
    print(f"Total unique clips: {len(items)} | Already cached: {len(items) - len(todo)} | To generate: {len(todo)}", flush=True)

    spent_credits = 0
    generated = 0
    stopped_budget = False
    lock = threading.Lock()
    t0 = time.time()

    # Process in small parallel batches of 4 so we stay fast AND respect rate limits + budget cleanly
    batch_size = 4
    i = 0
    while i < len(todo):
        if spent_credits >= max_spend:
            stopped_budget = True
            print(f"Reached safe budget ceiling ({spent_credits:,} / {max_spend:,} credits). Stopping cleanly.", flush=True)
            break

        batch = todo[i : i + batch_size]
        i += batch_size

        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as ex:
            futs = {
                ex.submit(generate_one, api_key, txt, OUT_DIR / f"{h}.mp3"): (cat, txt, h)
                for cat, txt, h in batch
            }
            for fut in concurrent.futures.as_completed(futs):
                cat, txt, h = futs[fut]
                try:
                    cost = fut.result()
                    with lock:
                        spent_credits += cost
                        generated += 1
                except Exception as e:
                    print(f"ERROR on [{cat}] {txt[:40]!r}: {e}", flush=True)
                    if "quota" in str(e).lower() or "401" in str(e) or "402" in str(e):
                        stopped_budget = True

        if stopped_budget:
            break

        if generated % 40 == 0 or i >= len(todo):
            elapsed = time.time() - t0
            rate = generated / max(elapsed, 0.1)
            print(
                f"Progress: {generated}/{len(todo)} clips | spent~={spent_credits:,} credits | "
                f"{rate:.1f} clips/s | last_cat={batch[-1][0]}",
                flush=True,
            )

    total_cached = write_manifest()
    sub_after = get_subscription(api_key)
    print(
        f"\nDONE! Generated={generated} | Total in manifest={total_cached} | "
        f"Tracked cost={spent_credits:,} | API reported used={sub_after.get('character_count', 0):,} / {sub_after.get('character_limit', 0):,}",
        flush=True,
    )


if __name__ == "__main__":
    main()
