#!/usr/bin/env python3
"""
Roos-opnamen (NL vrouwenstem) voor De Grote Huiskamer Show, met ElevenLabs Flash v2.5
(stem: Roos, 7qdUFMklKPaaAVMsBTBt).

Elke opname wordt bewerkt door tts_audio.py: zachte voorbewerking en daarna nauwkeurig op -16 LUFS gebracht
(true peak hooguit -1 dBTP), ook de korte opnames van losse woorden.  Zo klinkt alles even hard.

Gebruik:
  python3 scripts/generate-tts.py --check      # welke teksten missen nog een opname? (geen sleutel nodig)
  python3 scripts/generate-tts.py              # maak de ontbrekende opnames (ELEVENLABS_API_KEY in env of in .env)

De map met opnames is <data-map>/tts, dezelfde map waar de server ze vandaan haalt (standaard ./data/tts, of
$DATA_DIR/tts).  Bestaande opnames worden nooit opnieuw gemaakt; alleen wat ontbreekt kost credits.
De vragen komen uit server/seed plus de eigen vragen in de data-map (die je in /admin hebt toegevoegd of aangepast).
Zie ook: python3 scripts/tts_audio.py check|fix <map>  om bestaande opnames te meten en even hard te maken.
"""
import argparse
import concurrent.futures
import json
import os
import pathlib
import sys
import threading
import time
import urllib.error
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import tts_audio  # noqa: E402
SEED_DIR = ROOT / "server" / "seed"
ENV_FILE = ROOT / ".env"

VOICE_ID = "7qdUFMklKPaaAVMsBTBt"  # Roos — warm Dutch female voice
MODEL_ID = "eleven_flash_v2_5"
CREDITS_PER_CHAR = 0.5  # Flash v2.5 rekent 0,5 credit per teken
# Alleen voor tests aan te passen (een nagebootste ElevenLabs op localhost)
API_BASE = os.environ.get("ELEVENLABS_API_BASE", "https://api.elevenlabs.io").rstrip("/")
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


def key_configured() -> bool:
    try:
        return bool(load_api_key())
    except RuntimeError:
        return False


def get_subscription(api_key: str) -> dict:
    req = urllib.request.Request(
        f"{API_BASE}/v1/user/subscription",
        headers={"xi-api-key": api_key, "Accept": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read().decode())


def default_data_dir() -> pathlib.Path:
    """Dezelfde keuze als de server: $DATA_DIR, anders ./data in deze repo."""
    env = os.environ.get("DATA_DIR")
    return pathlib.Path(env).expanduser() if env else ROOT / "data"


def load_content(name: str, data_dir: pathlib.Path | None) -> list[dict]:
    """Seed-inhoud, aangevuld en overschreven door de eigen inhoud in de data-map (op id)."""
    items = {it["id"]: it for it in json.loads((SEED_DIR / name).read_text())}
    if data_dir is not None and (data_dir / name).exists():
        try:
            for it in json.loads((data_dir / name).read_text()):
                items[it["id"]] = it
        except (json.JSONDecodeError, KeyError, TypeError):
            print(f"Let op: {data_dir / name} is geen geldige inhoud; alleen de seed wordt gebruikt.", flush=True)
    return list(items.values())


def collect_text_entries(data_dir: pathlib.Path | None = None) -> list[tuple[str, str, str]]:
    """Geordende lijst (categorie, tekst, id van de vraag of opdracht), zonder dubbelen, belangrijkste eerst."""
    quiz = load_content("quiz.json", data_dir)
    ts = load_content("thirtySeconds.json", data_dir)
    est = load_content("estimates.json", data_dir)
    panto = load_content("pantomime.json", data_dir)
    snd = load_content("sounds.json", data_dir)

    raw_items: list[tuple[str, str, str]] = []

    # Priority 1: TV Showmaster announcements & 4 answer color words
    for t in TV_ANNOUNCEMENTS:
        raw_items.append(("tv_showmaster", t, ""))
    for c in ANSWER_COLOR_WORDS:
        raw_items.append(("answer_colors", c, ""))

    # Priority 1b: Answer option labels for Ontdekker (Lucas), Avonturier (Lana) & Sound Challenges
    for lvl in ["ontdekker", "avonturier"]:
        for q in quiz:
            if q.get("level") == lvl:
                for opt in q.get("options", []):
                    raw_items.append((f"{lvl}_opt", opt["label"], q["id"]))
    for s in snd:
        for opt in s.get("options", []):
            raw_items.append(("sound_opt", opt["label"], s["id"]))

    # Priority 2: Ontdekker (Lucas) & Avonturier (Lana) Quiz questions
    for lvl in ["ontdekker", "avonturier"]:
        for q in quiz:
            if q.get("level") == lvl:
                raw_items.append((f"quiz_{lvl}", q.get("spokenPrompt") or q["prompt"], q["id"]))

    # Priority 3: Estimates, Pantomime, Sound prompts
    for e in est:
        raw_items.append(("estimates", e.get("spokenPrompt") or e["prompt"], e["id"]))
    for p in panto:
        hint = p.get("hint", "")
        raw_items.append(("pantomime", f"{p['prompt']}! {hint}".strip(), p["id"]))
    for s in snd:
        raw_items.append(("sounds", s["prompt"], s["id"]))

    # Priority 4: 30 Seconds words (ontdekker -> avonturier -> meester)
    for lvl in ["ontdekker", "avonturier", "meester"]:
        for c in ts:
            if c.get("level") == lvl:
                for it in c.get("items", []):
                    raw_items.append((f"30s_{lvl}", it["word"], c["id"]))

    # Priority 5: Meester (Papa & Mama) Quiz questions
    for q in quiz:
        if q.get("level") == "meester":
            raw_items.append(("quiz_meester", q.get("spokenPrompt") or q["prompt"], q["id"]))

    seen: set[str] = set()
    ordered: list[tuple[str, str, str]] = []
    for cat, text, item_id in raw_items:
        clean = text.strip()
        if not clean:
            continue
        h = fnv1a_64_hex(clean)
        if h not in seen:
            seen.add(h)
            ordered.append((cat, clean, item_id))
    return ordered


def collect_texts(data_dir: pathlib.Path | None = None) -> list[tuple[str, str]]:
    """Return ordered list of (category_label, text) deduplicated by hash, highest priority first."""
    return [(cat, text) for cat, text, _ in collect_text_entries(data_dir)]


def generate_one(api_key: str, text: str, out_path: pathlib.Path) -> tuple[int, dict]:
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

    raw = b""
    cost = 0
    for attempt in range(4):
        try:
            req = urllib.request.Request(
                f"{API_BASE}/v1/text-to-speech/{VOICE_ID}?output_format=mp3_44100_128",
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
            break
        except urllib.error.HTTPError as e:
            if e.code == 429 or e.code >= 500:
                time.sleep(1.5 * (attempt + 1))
                continue
            body = e.read().decode("utf-8", errors="ignore")
            raise RuntimeError(f"HTTP {e.code}: {body[:200]}") from e
        except (urllib.error.URLError, TimeoutError, ConnectionError):
            if attempt < 3:
                time.sleep(1.0 * (attempt + 1))
                continue
            raise
    else:
        raise RuntimeError("Max retries exceeded")

    # Bewerken gebeurt buiten de herhaal-lus: mislukt dat, dan vragen we de opname niet opnieuw aan (dat kost credits)
    report = tts_audio.process_raw_mp3(raw, out_path)
    return cost, report


def write_manifest(out_dir: pathlib.Path) -> int:
    """Handig voor mensen en scripts; de server zelf kijkt naar de mp3-bestanden in de map."""
    files = sorted(p.stem for p in out_dir.glob("*.mp3"))
    manifest = {
        "voiceId": VOICE_ID,
        "voiceName": "Roos (NL)",
        "modelId": MODEL_ID,
        "targetLufs": tts_audio.TARGET_LUFS,
        "count": len(files),
        "hashes": files,
    }
    (out_dir / "manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
    return len(files)


def main() -> None:
    ap = argparse.ArgumentParser(description="Roos-opnamen (ElevenLabs Flash v2.5) voor De Grote Huiskamer Show")
    ap.add_argument("--data-dir", type=pathlib.Path, default=None,
                    help="data-map van de show (standaard: $DATA_DIR of ./data); daaruit komen eigen vragen en de map tts/")
    ap.add_argument("--out-dir", type=pathlib.Path, default=None,
                    help="waar de mp3's heen gaan (standaard: <data-map>/tts)")
    ap.add_argument("--check", action="store_true",
                    help="alleen tonen welke teksten nog geen opname hebben; maakt niets en heeft geen sleutel nodig")
    ap.add_argument("--json", action="store_true", help="bij --check: uitvoer als JSON (voor /admin)")
    ap.add_argument("--limit", type=int, default=0, help="maak hooguit zoveel opnames (0 = alles wat ontbreekt)")
    args = ap.parse_args()

    data_dir = (args.data_dir or default_data_dir()).expanduser().resolve()
    out_dir = (args.out_dir or data_dir / "tts").expanduser().resolve()
    if not args.json:
        print(f"Data-map:      {data_dir}\nOpnamen-map:   {out_dir}", flush=True)

    entries = collect_text_entries(data_dir)
    items = [(cat, txt) for cat, txt, _ in entries]
    missing = [(cat, txt, fnv1a_64_hex(txt), item_id) for cat, txt, item_id in entries
               if not (out_dir / f"{fnv1a_64_hex(txt)}.mp3").exists()]
    todo = [(cat, txt, h) for cat, txt, h, _ in missing]
    chars = sum(len(t) for _, t, _ in todo)

    if args.check and args.json:
        print(json.dumps({
            "total": len(items),
            "recorded": len(items) - len(todo),
            "missingCount": len(todo),
            "missingChars": chars,
            "estimatedCredits": int(chars * CREDITS_PER_CHAR),
            "keyConfigured": key_configured(),
            "missing": [{"category": c, "text": t, "hash": h, "itemId": i} for c, t, h, i in missing],
        }, ensure_ascii=False))
        sys.exit(0)
    print(
        f"Teksten in totaal: {len(items)} | al opgenomen: {len(items) - len(todo)} | ontbreekt: {len(todo)} "
        f"({chars:,} tekens, ongeveer {int(chars * CREDITS_PER_CHAR):,} credits)",
        flush=True,
    )

    if args.check:
        for cat, txt, _ in todo[:25]:
            print(f"  ontbreekt [{cat}] {txt[:100]!r}")
        if len(todo) > 25:
            print(f"  ... en nog {len(todo) - 25}")
        sys.exit(1 if todo else 0)

    if args.limit and args.limit > 0:
        todo = todo[: args.limit]

    if not todo:
        print("Niets te doen: alle teksten hebben al een opname.")
        out_dir.mkdir(parents=True, exist_ok=True)
        write_manifest(out_dir)
        return

    api_key = load_api_key()
    out_dir.mkdir(parents=True, exist_ok=True)

    sub = get_subscription(api_key)
    start_used = sub.get("character_count", 0)
    limit = sub.get("character_limit", 40000)
    max_spend = max(0, (limit - start_used) - MIN_CREDIT_BUFFER)
    print(
        f"ElevenLabs-tegoed: gebruikt {start_used:,} / {limit:,} | "
        f"over {limit - start_used:,} | uitgeven mag tot {max_spend:,} (met {MIN_CREDIT_BUFFER:,} als reserve)",
        flush=True,
    )

    spent_credits = 0
    generated = 0
    stopped_budget = False
    lock = threading.Lock()
    reports: list[dict] = []
    t0 = time.time()

    # In kleine groepjes van 4 tegelijk, zodat we snel zijn en de limieten en het budget netjes respecteren
    batch_size = 4
    i = 0
    while i < len(todo):
        if spent_credits >= max_spend:
            stopped_budget = True
            print(f"Veilig budget bereikt ({spent_credits:,} / {max_spend:,} credits). Netjes gestopt.", flush=True)
            break

        batch = todo[i : i + batch_size]
        i += batch_size

        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as ex:
            futs = {
                ex.submit(generate_one, api_key, txt, out_dir / f"{h}.mp3"): (cat, txt, h)
                for cat, txt, h in batch
            }
            for fut in concurrent.futures.as_completed(futs):
                cat, txt, h = futs[fut]
                try:
                    cost, report = fut.result()
                    with lock:
                        spent_credits += cost
                        generated += 1
                        reports.append(report)
                except Exception as e:
                    print(f"FOUT bij [{cat}] {txt[:40]!r}: {e}", flush=True)
                    if "quota" in str(e).lower() or "401" in str(e) or "402" in str(e):
                        stopped_budget = True

        if stopped_budget:
            break

        if generated % 40 == 0 or i >= len(todo):
            elapsed = time.time() - t0
            rate = generated / max(elapsed, 0.1)
            print(
                f"Voortgang: {generated}/{len(todo)} opnames | kosten ~{spent_credits:,} credits | "
                f"{rate:.1f} opnames/s | laatste categorie: {batch[-1][0]}",
                flush=True,
            )

    total_cached = write_manifest(out_dir)
    sub_after = get_subscription(api_key)
    print(
        f"\nKLAAR! Gemaakt={generated} | In de map={total_cached} | "
        f"Kosten={spent_credits:,} | ElevenLabs meldt gebruikt: {sub_after.get('character_count', 0):,} / {sub_after.get('character_limit', 0):,}",
        flush=True,
    )
    if reports:
        ls = [r["after_lufs"] for r in reports]
        tp = [r["after_tp"] for r in reports]
        print(
            f"Geluidssterkte nieuwe opnames: {min(ls):.2f} tot {max(ls):.2f} LUFS (doel {tts_audio.TARGET_LUFS:g}) | "
            f"hoogste piek {max(tp):.2f} dBTP",
            flush=True,
        )
    still_missing = len(todo) - generated
    if still_missing:
        print(f"Let op: {still_missing} teksten hebben nog geen opname (budget of fout); draai het script opnieuw.", flush=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
