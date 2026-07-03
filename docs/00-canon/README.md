# 00-canon — Canonical / Approved Documents

**Group purpose:** Единственный источник правды. Документы, принятые как решения или базовые факты.
Never deleted. Superseded docs stay here with `Status: superseded` and a link to the replacement.

## What lives here
- `01-STATE.md` — точка сохранения; читать ПЕРВЫМ (move from `docs/STATE.md`)
- `02-DECISIONS-LOG.md` — плоский лог ключевых решений (move from `docs/DECISIONS-LOG.md`)
- `03-VISION.md` — продуктовый north star (move from `docs/product/VISION.md`)
- `04-SYSTEM-IN-PLAIN-WORDS.md` — простое объяснение системы
- `ADR/ADR-NNNN-title.md` — Architecture Decision Records (approved)
- `SPEC/SPEC-title.md` — Feature specs (approved or implemented)

## Ordering rule
Top-level files: `NN-` prefix by importance/read-sequence.
ADRs: `ADR-NNNN-` by sequence number (0001, 0002…).
SPECs: `SPEC-` by topic name (no date prefix — linked to ADRs by content).

## Process
- A file enters 00-canon only after explicit owner approval.
- Status field must be `approved` or `active`.
- To supersede: set `Status: superseded`, add `Supersedes:` link in new doc, do NOT delete.
