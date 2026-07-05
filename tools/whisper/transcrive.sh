#!/usr/bin/env bash
set -euo pipefail
FILE="${1:?no audio path}"
LANG_CODE="${2:-ru}"
MODEL="${WHISPER_MODEL:-$HOME/.cache/whisper-cpp/ggml-small.bin}"
FFMPEG="$(command -v ffmpeg || echo /opt/homebrew/bin/ffmpeg)"
WHISPER="$(command -v whisper-cli || echo /opt/homebrew/bin/whisper-cli)"
WAV="$(mktemp -t gw-voice).wav"
trap 'rm -f "$WAV"' EXIT
"$FFMPEG" -y -loglevel error -i "$FILE" -ar 16000 -ac 1 "$WAV" 1>&2
"$WHISPER" -m "$MODEL" -l "$LANG_CODE" -nt -f "$WAV"
EOF
chmod +x ~/Documents/IT/Apps/TOOLS/agents-manager/tools/whisper/transcribe.sh
pm2 restart agent