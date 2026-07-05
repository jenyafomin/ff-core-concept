---
Status: draft
Owner: jenya.stasik@gmail.com
Date: 2026-07-04
Theme: Предлагаемый allowlist для .claude/settings.local.json (владелец редактирует → вставляет)
---

# Allowlist (L1) — на ревью владельцу

> Docker уже включён (`docker`, `docker-compose`) — агенты иногда тестируют/дёргают БД через докер;
> сейчас SQLite, но на всякий случай. Отредактируй под себя и вставь в `.claude/settings.local.json`.
> Права нельзя расширять из шлюза (by design) — вставляешь ты.

```json
{
  "permissions": {
    "allow": [
      "Read(//Users/mac16/Documents/IT/Apps/**)",
      "Grep", "Glob", "Write", "Edit",
      "Bash(git:*)", "Bash(ls:*)", "Bash(cat:*)", "Bash(head:*)", "Bash(tail:*)",
      "Bash(find:*)", "Bash(rg:*)", "Bash(grep:*)", "Bash(wc:*)", "Bash(mkdir:*)",
      "Bash(cp:*)", "Bash(mv:*)", "Bash(echo:*)",
      "Bash(node:*)", "Bash(npx:*)", "Bash(npm:*)", "Bash(pnpm:*)",
      "Bash(docker:*)", "Bash(docker-compose:*)",
      "Bash(sqlite3:*)",
      "Bash(ffmpeg:*)", "Bash(whisper-cli:*)"
    ],
    "deny": [
      "Read(//**/.env)", "Read(//**/.env.*)", "Read(//**/.ssh/**)",
      "Read(//**/*secret*)", "Read(//**/*credential*)",
      "Bash(sudo:*)", "Bash(git push --force:*)", "Bash(git push -f:*)"
    ]
  }
}
```

Добавил `sqlite3` (прямой доступ к БД). Убери/добавь строки по вкусу.
