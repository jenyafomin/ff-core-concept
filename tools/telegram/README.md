# Telegram tools

## `md2tg.mjs` — Markdown → Telegram message

Converts Markdown into a Telegram-ready message so rich formatting + emoji survive,
without hand-escaping MarkdownV2 reserved characters.

```bash
# MarkdownV2 (bold/italic/code/links render) — send with format: "markdownv2"
node tools/telegram/md2tg.mjs message.md
echo "**hi** 🎯" | node tools/telegram/md2tg.mjs

# Plain text (never errors, no escaping) — send with format: "text"
node tools/telegram/md2tg.mjs --plain message.md
```

- **Default = MarkdownV2.** Output must be sent with the reply tool's `format: "markdownv2"`.
- **`--plain`** strips MD to readable text (headings, **bold**, lists, links) — safe fallback.
- **Emoji**: put them straight in the MD; they pass through untouched. Pre-decorate headings/
  bullets with emoji for visualization.
- Handles: headings → bold, `**bold**`/`*italic*`, `` `code` ``, ``` fenced code ```, bullet &
  numbered lists → `•`, links, blockquotes, horizontal rules. Reserved chars escaped per MarkdownV2.

### How Claude uses it
Write the reply as Markdown (with emoji) → pipe through `md2tg.mjs` → send the output via the
Telegram reply tool with `format: "markdownv2"`. Falls back to `--plain` if a message ever rejects.

Verified end-to-end: a MarkdownV2 message produced by this script was accepted by Telegram.
