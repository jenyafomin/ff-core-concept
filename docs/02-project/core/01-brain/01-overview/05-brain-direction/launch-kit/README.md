# Кит запуска памяти (ff-brain) — вид

- **Status:** active · **Owner:** jenya.stasik@gmail.com · **Date:** 2026-10-11
- **Потребитель:** владелец (день запуска) + лид (смоук, гейт) · **Поглощает:** `docs/_log/2026-10-05-personal-memory-launch/launch/` (там указатели; `reviewer-kit.analysis.md` остаётся там как trace)
- **Related:** компас `docs/02-project/core/01-brain/01-overview/05-brain-direction/OVERVIEW.md` · ночные волны `.../analyses/2026-10-11-night-waves/`

| Файл | Что это | Кто читает |
|---|---|---|
| `RUNBOOK.md` | шаги 0–7 запуска руками + восстановление из бэкапа | владелец |
| `PROMPT-memory-protocol.md` | слой промпта агенту топика 56 (между маркерами LAYER) | агент шлюза (шаг 5) |
| `GATE-7days.md` | гейт пользы: сигналы S1–S3, стоп-кран, правило дня 3, счёт | владелец + лид |
| `STAGE1-OWNER-STEPS.md` | Этап 1 (2026-10-21): шаги A–I владельца — первая запись и кросс-проектное чтение | владелец |
| `stage1-scopes.sh` | области `ff`/`agents-manager` + cli-доступ двух папок (dry-run по умолчанию, `--apply`) | владелец |
| `stage1-first-record.json` | тело первой записи (ADR-0016) — вход для M8 и `record` | владелец + агент FF |
| `mcp-config.template.json` | шаблон `--mcp-config` (живой файл: `~/.config/ff-brain/mcp.json`, вне репо) | владелец |
| `m8-scan.mjs` | M8: сканер секретов/PII по label+fields до записи | владелец + агенты |
| `m5-snapshot.mjs` | M5: снимок health+stats → `docs/_log/ff-brain-metrics/YYYY-MM-DD.jsonl` (+ строка crontab) | владелец / cron |
| `restore-rehearsal.sh` | репетиция восстановления на копии в /tmp | владелец |
| `_history/2026-10-10-rev1/` | первая версия всех трёх (до ночных правок) | по нужде |

Порядок: RUNBOOK шаг 0 → 1 → 1б → 2 → 3 → 4 → 5 → смоук 6 → гейт. До старта владельцу: D4 «Всегда», Q-3rd имена, Q6 захват, Q8 пороги + часовой пояс, G-20.

Итог: решение — канон кита живёт здесь (git), `_log` только указывает.
