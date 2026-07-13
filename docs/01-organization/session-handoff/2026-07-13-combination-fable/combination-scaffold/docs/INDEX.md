# Combination — INDEX (карта проекта)

- **Status:** draft · Owner: jenya.stasik@gmail.com · Date: 2026-07-13
- Читать первым. Проект в фазе DESIGN. Скелет по образцу Brain (`ff: docs/02-project/core/01-brain/`).

## Что это
Общая конституция и контракт, по которым Brain (память) и agents-manager (исполнение) становятся
**модулями одного класса**, а новые способности подключаются модульно (marketplace). Подробно —
`product/VISION.md`.

## Дерево
```
docs/
├── INDEX.md                     # этот файл
├── product/VISION.md            # цель + несущая идея + границы
├── values/                      # лестница ценностей CV1–CV6
│   ├── README.md                # компас: 6 ценностей + приоритеты + карта в инфру
│   ├── CV1-modularity/          # Модульность/подключаемость (must-now)
│   ├── CV2-evolvability/        # Эволюционируемость без поломок (must-now)
│   ├── CV3-compatibility-fork/  # Совместимость и форки (must-now)
│   ├── CV4-sovereignty/         # Суверенность/переносимость (soon)
│   ├── CV5-trust-security/      # Доверие/безопасность чужого кода (soon)
│   └── CV6-marketplace/         # Экономика обмена (later)
├── infrastructure/
│   ├── INDEX.md                 # матрица модулей M0–M8 + ADR-кандидаты
│   └── README.md                # правило подъёма идеи в инфру
├── decisions/
│   ├── DECISIONS-LOG.md         # CDL-01…
│   └── ADR/ADR-C0…C6            # драфты ключевых решений
├── open-questions/INDEX.md      # CQ1… (в т.ч. возражения critic)
└── plan/PLAN.md                 # первый ход: манифест «Плана» → прогон шлюза
```

## Источники разреза (в FF, session-handoff 2026-07-13-combination-fable)
- `FABLE-VERDICT.md` — разрез Fable (несущая абстракция «модуль»).
- `SURVIVING-CUT.md` — синтез Fable × critic (что пережило атаку) ← **истина дизайна**.
- `CONTEXT-DIGEST.md` — два слоя (Brain / agents-manager).
- `VALUES-diverge-BA.md` — расхождение ценностей (owner-value угол).

## Три закреплённых столпа (после критики)
1. **Kernel ≠ module** (+ seed-словарь + отдельный апгрейд ядра).
2. **Совместимость двухворотная** (словарь + поведение портов); линза объявляет тотальность.
3. **Combination = контракт + conformance + ТОНКИЙ sandbox сертификации** (не второй движок данных).

## Guardrail
Рабочий шлюз НЕ морозим и НЕ переписываем ради недостроенного Brain. Combination сейчас = контрактный трек
(docs+ADR+эталонный манифест), не стройка. Строить — только по явному «строй».
