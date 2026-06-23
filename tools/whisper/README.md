# Whisper audio transcription

Local speech-to-text for voice messages (Telegram and any audio), powered by
[whisper.cpp](https://github.com/ggml-org/whisper.cpp) — native, Metal-accelerated,
no cloud, no API keys.

## What's installed

- **whisper-cpp** 1.8.6 (Homebrew) → provides the `whisper-cli` binary.
- **ffmpeg** (already present) → converts any audio to the 16 kHz mono WAV whisper needs.
- **Model:** `models/ggml-large-v3-turbo-q5_0.bin` (~547 MB) — multilingual,
  strong on Russian, fast on Apple Silicon.

## Usage

```bash
./tools/whisper/transcribe.sh <audio-file> [language|auto] [model-name]
```

Examples:

```bash
./tools/whisper/transcribe.sh voice.ogg          # auto-detect language
./tools/whisper/transcribe.sh voice.ogg ru        # force Russian (faster, no detect step)
./tools/whisper/transcribe.sh note.m4a en
```

- Accepts any format ffmpeg can read: `.ogg`/opus (Telegram voice), `.mp3`, `.m4a`, `.wav`, …
- Prints the transcript to **stdout**.
- Saves a copy to `transcripts/<name>.txt`.

## How Claude uses this

When you send a voice message via Telegram, the harness saves the attachment to a
file. Claude runs `transcribe.sh <that-file>` and reads the resulting text — so audio
notes become actionable just like typed messages.

## Directory layout

```
tools/whisper/
├── transcribe.sh        # the pipeline: ffmpeg → whisper-cli → .txt
├── models/              # ggml model files (.bin)
├── incoming/            # drop audio here if you want (optional)
└── transcripts/         # saved .txt outputs
```

## Swapping models

Download other ggml models into `models/` from
<https://huggingface.co/ggerganov/whisper.cpp/tree/main> and pass the name
(without the `ggml-` prefix and `.bin` suffix) as the 3rd argument, e.g.
`large-v3` for `ggml-large-v3.bin`. Smaller = faster/less accurate
(`base`, `small`, `medium`); turbo models are the best speed/accuracy balance.
