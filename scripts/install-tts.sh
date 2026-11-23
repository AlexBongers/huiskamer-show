#!/usr/bin/env bash
# Haalt de Roos-opnamen op uit de GitHub Releases van deze repo (tags tts-v1, tts-v2, ...)
# en zet ze in <data-map>/tts, de map waar de server ze vandaan haalt.
#
#   ./scripts/install-tts.sh              # de nieuwste tts-vN
#   ./scripts/install-tts.sh tts-v3       # een bepaalde versie
#   DATA_DIR=/pad/naar/data ./scripts/install-tts.sh
#
# Opnamen met dezelfde bestandsnaam worden vervangen (zelfde naam = zelfde tekst, dus een nieuwere,
# beter bewerkte versie); andere bestanden in de map blijven staan.
# Nodig: curl, tar en python3.  Voor een privé-repo: zet GITHUB_TOKEN.
set -euo pipefail

REPO="${TTS_REPO:-AlexBongers/huiskamer-show}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DATA_DIR="${DATA_DIR:-$ROOT/data}"
TTS_DIR="$DATA_DIR/tts"
WANT_TAG="${1:-}"

for tool in curl tar python3; do
  command -v "$tool" >/dev/null 2>&1 || { echo "❌ '$tool' is nodig maar niet gevonden." >&2; exit 1; }
done

AUTH=()
[ -n "${GITHUB_TOKEN:-}" ] && AUTH=(-H "Authorization: Bearer $GITHUB_TOKEN")

if [ -n "$WANT_TAG" ]; then
  API="https://api.github.com/repos/$REPO/releases/tags/$WANT_TAG"
else
  API="https://api.github.com/repos/$REPO/releases?per_page=50"
fi

echo "🔎 Zoeken naar Roos-opnamen in github.com/$REPO ..."
INFO="$(curl -fsSL ${AUTH[@]+"${AUTH[@]}"} -H "Accept: application/vnd.github+json" "$API" | python3 -c '
import json, re, sys
want = sys.argv[1]
data = json.load(sys.stdin)
best = None
for r in (data if isinstance(data, list) else [data]):
    tag = r.get("tag_name", "")
    m = re.fullmatch(r"tts-v(\d+)", tag)
    if not want and (not m or r.get("draft") or r.get("prerelease")):
        continue
    asset = next((a for a in r.get("assets", []) if a["name"].endswith(".tar.gz")), None)
    if not asset:
        continue
    n = int(m.group(1)) if m else 0
    if best is None or n > best[0]:
        best = (n, tag, asset["browser_download_url"], asset.get("digest") or "", r.get("name") or tag)
if not best:
    sys.exit(1)
print("\t".join(str(x) for x in best[1:]))
' "$WANT_TAG" 2>/dev/null)" || { echo "❌ Geen passende release met een .tar.gz gevonden." >&2; exit 1; }

IFS=$'\t' read -r TAG URL DIGEST NAME <<<"$INFO"
echo "📦 $NAME  ($TAG)"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "⬇️  Downloaden ..."
curl -fL --retry 3 --progress-bar ${AUTH[@]+"${AUTH[@]}"} -o "$TMP/clips.tar.gz" "$URL"

if [[ "$DIGEST" == sha256:* ]]; then
  EXPECTED="${DIGEST#sha256:}"
  if command -v sha256sum >/dev/null 2>&1; then ACTUAL="$(sha256sum "$TMP/clips.tar.gz" | cut -d' ' -f1)"; else ACTUAL="$(shasum -a 256 "$TMP/clips.tar.gz" | cut -d' ' -f1)"; fi
  if [ "$EXPECTED" != "$ACTUAL" ]; then
    echo "❌ Controlesom klopt niet (verwacht $EXPECTED, kreeg $ACTUAL). Niets geïnstalleerd." >&2
    exit 1
  fi
  echo "✅ Controlesom klopt"
fi

# Alleen <16 hexcijfers>.mp3 en manifest.json toestaan, geen vreemde of uitbrekende paden
if tar -tzf "$TMP/clips.tar.gz" | grep -vE '^(\./)?tts/?$|^(\./)?tts/([0-9a-f]{16}\.mp3|manifest\.json)$' | grep -q .; then
  echo "❌ Het archief bevat onverwachte bestanden. Niets geïnstalleerd." >&2
  exit 1
fi

mkdir -p "$TMP/x" "$TTS_DIR"
tar -xzf "$TMP/clips.tar.gz" --no-same-owner -C "$TMP/x"
COUNT="$(find "$TMP/x/tts" -maxdepth 1 -name '*.mp3' | wc -l | tr -d ' ')"
[ "$COUNT" -gt 0 ] || { echo "❌ Geen opnamen in het archief." >&2; exit 1; }

cp -f "$TMP/x/tts/"*.mp3 "$TTS_DIR/"
[ -f "$TMP/x/tts/manifest.json" ] && cp -f "$TMP/x/tts/manifest.json" "$TTS_DIR/manifest.json"

TOTAL="$(find "$TTS_DIR" -maxdepth 1 -name '*.mp3' | wc -l | tr -d ' ')"
echo "🔊 $COUNT opnamen geïnstalleerd uit $TAG  →  $TTS_DIR  (in de map nu: $TOTAL)"
echo "   Start of herstart de server; hij leest de map zelf, geen verdere stappen nodig."
