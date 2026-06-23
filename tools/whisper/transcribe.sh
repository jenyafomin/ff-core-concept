#!/usr/bin/env bash
#
# transcribe.sh — transcribe an audio file with whisper.cpp
#
# Usage:
#   ./transcribe.sh <audio-file> [language] [model]
#   ./transcribe.sh voice.ogg              # auto-detect language
#   ./transcribe.sh voice.ogg ru           # force Russian
#   ./transcribe.sh voice.ogg auto large-v3-turbo-q5_0
#
# Pipeline: ffmpeg (-> 16kHz mono wav) -> whisper-cli -> .txt transcript.
# Designed for Telegram voice messages (.ogg/opus), but accepts mp3/m4a/wav/etc.
#
# Output:
#   - prints the transcript to stdout
#   - saves <name>.txt next to the script in transcripts/
#
set -euo pipefail

# --- locations ---------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODELS_DIR="$SCRIPT_DIR/models"
TRANSCRIPTS_DIR="$SCRIPT_DIR/transcripts"
mkdir -p "$TRANSCRIPTS_DIR"

# --- args --------------------------------------------------------------------
if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <audio-file> [language|auto] [model-name]" >&2
  echo "Example: $0 voice.ogg ru" >&2
  exit 1
fi

AUDIO="$1"
LANG="${2:-auto}"
MODEL_NAME="${3:-large-v3-turbo-q5_0}"
MODEL="$MODELS_DIR/ggml-${MODEL_NAME}.bin"

# --- checks ------------------------------------------------------------------
command -v ffmpeg      >/dev/null || { echo "ffmpeg not found (brew install ffmpeg)" >&2; exit 1; }
command -v whisper-cli >/dev/null || { echo "whisper-cli not found (brew install whisper-cpp)" >&2; exit 1; }
[[ -f "$AUDIO" ]] || { echo "Audio file not found: $AUDIO" >&2; exit 1; }
[[ -f "$MODEL" ]] || { echo "Model not found: $MODEL" >&2; exit 1; }

# --- prepare audio: 16kHz mono wav (whisper.cpp requirement) -----------------
BASE="$(basename "${AUDIO%.*}")"
WAV="$(mktemp -t "whisper-${BASE}").wav"
trap 'rm -f "$WAV"' EXIT

ffmpeg -nostdin -hide_banner -loglevel error -y \
  -i "$AUDIO" -ar 16000 -ac 1 -c:a pcm_s16le "$WAV"

# --- transcribe --------------------------------------------------------------
OUT_BASE="$TRANSCRIPTS_DIR/$BASE"
whisper-cli \
  -m "$MODEL" \
  -f "$WAV" \
  -l "$LANG" \
  -otxt \
  -of "$OUT_BASE" \
  --no-prints \
  >/dev/null 2>"$OUT_BASE.log" || {
    echo "whisper-cli failed; see $OUT_BASE.log" >&2
    cat "$OUT_BASE.log" >&2
    exit 1
  }

# --- emit result -------------------------------------------------------------
TXT="$OUT_BASE.txt"
if [[ -f "$TXT" ]]; then
  # collapse leading/trailing blank lines for clean output
  sed -e 's/^[[:space:]]*//' "$TXT" | sed '/^$/d'
  echo "" >&2
  echo "[saved: $TXT]" >&2
else
  echo "No transcript produced." >&2
  exit 1
fi
