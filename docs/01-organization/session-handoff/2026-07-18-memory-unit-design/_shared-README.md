---
Status: scaffold
node_type: cross-cutting-register
title: _shared — СКВОЗНОЙ регистр (режет все примитивы, без номера)
---
# 🔗 _shared — сквозное (на все 4 примитива)
Критический разбор показал: часть «аспектов» — не примитивы, а сквозные регистры:
- `passport/` — ОБЩИЙ passport-контракт (база + расширения) — иначе 4 дрейфующие копии.
- `mechanisms/` — engine-duties: propagation · hard-erase · dedup/canonicalId · snapshot.
- `policy-as-data/` — спина (паспорт носит поведение) — бывший 04-policy-as-data.md.
- `constitution/` — инварианты сверху (согласие·порог·право на забвение).
Расформированы как отдельные аспекты: `layers`→поле actor+линза; `categories`→тип ребра+поля узла.
