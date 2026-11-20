---
title: Выкатка /access + overview (порядок обязателен: сначала память, потом шлюз)
status: active
owner: jenya.stasik@gmail.com
date: 2026-10-23
related: ./SPEC-access-and-overview.md
---
Потребитель: владелец (запускает руками). Поглощает: ничего.

Ветки: память `feat/brain-write-scopes-overview` (61162bd, d3bece3; reviewer PASS) · шлюз `feat/access-command` (ee19bb8; reviewer PASS).
Обе ветки — fast-forward от текущих HEAD (8707fb7 / 08c02d4) и не трогают несохранённые файлы (доки FF, `.env` шлюза).

```bash
# 1) ПАМЯТЬ — первой (иначе «👁 чтение» на старой памяти = запись)
cd ~/Documents/IT/Apps/FF-Personal-Managment
git merge --ff-only feat/brain-write-scopes-overview
npm run build -w @ff/brain -w @ff/brain-mcp
pm2 restart ff-brain

# 2) ШЛЮЗ — когда в топиках никто не работает
cd ~/Documents/IT/Apps/TOOLS/agents-manager
git merge --ff-only feat/access-command
pm2 restart agent
```

Откат: `git reset --hard 8707fb7` (FF, только если дерево чистое по packages/) / `git reset --hard 08c02d4` (шлюз) + те же рестарты. `readers.json` при каждом сохранении /access оставляет `.bak-<ts>`.

Смоук: в топике `/access` → ff = ✍️ → 💾 → новым сообщением попросить агента «покажи карту памяти» (find preset:overview).
