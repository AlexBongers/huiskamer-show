#!/usr/bin/env bash
# Start van de container: haal de Roos-opnames op als de map nog leeg is, en start daarna de show.
#
#   TTS_AUTO_INSTALL=0        niet automatisch ophalen
#   TTS_RELEASE=tts-v4        een bepaalde versie in plaats van de nieuwste
#   TTS_INSTALL_TIMEOUT=300   maximaal zoveel seconden wachten op het ophalen
set -u

DATA_DIR="${DATA_DIR:-/app/data}"
TTS_DIR="$DATA_DIR/tts"
INSTALLER="${TTS_INSTALLER:-/app/scripts/install-tts.sh}"

if [ "${TTS_AUTO_INSTALL:-1}" != "0" ]; then
  count="$(find "$TTS_DIR" -maxdepth 1 -name '*.mp3' 2>/dev/null | wc -l | tr -d ' ')"
  if [ "${count:-0}" -eq 0 ]; then
    echo "🔊 Nog geen Roos-opnames in $TTS_DIR: ophalen uit de GitHub Releases ..."
    if command -v timeout >/dev/null 2>&1; then
      timeout "${TTS_INSTALL_TIMEOUT:-300}" bash "$INSTALLER" ${TTS_RELEASE:-}
    else
      bash "$INSTALLER" ${TTS_RELEASE:-}
    fi
    status=$?
    if [ "$status" -ne 0 ]; then
      echo "⚠️  Ophalen is niet gelukt (code $status). De show start toch, met de computerstem."
      echo "    Later opnieuw proberen: docker compose exec huiskamer-show bash scripts/install-tts.sh"
    fi
  fi
fi

exec "$@"
