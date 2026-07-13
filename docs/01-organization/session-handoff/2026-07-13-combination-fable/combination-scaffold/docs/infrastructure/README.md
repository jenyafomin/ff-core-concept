# Инфраструктура Combination — README

- **Status:** draft · Owner: jenya.stasik@gmail.com · Date: 2026-07-13
- Related: `INDEX.md`, `../values/README.md`, `../decisions/ADR/`

## Что здесь
Сквозные модули Combination — механизмы, на которых держится контракт модульности. По образцу Brain
(`ff: .../01-brain/infrastructure/`): модуль = что сводит · паттерн · ADR-кандидат.

## Правило подъёма идеи в инфру (теги)
Идея с **≥2 тегами ценностей** — по определению сквозная → живёт здесь, а не внутри одной ценности.
Пример: «кэш апгрейда» касается CV2 (производительность) и CV5/CV4 (erase/суверенность) → модуль M5.

## Слои (как в Brain: kernel-adjacent → critical → later)
- 🔴 **Фундамент** (замок до первой записи, ретрофит невозможен): M0 Kernel, M1 Registry, M2 Lenses, M4
  Provenance-штамп.
- 🟡 **Critical** (нужен ADR, не стройка с нуля): M3 Port Bus, M5 Scratch/Erase, M6 Cutover.
- 🟢 **Later** (после сторонних модулей): M7 Sandbox, M8 Lifecycle/Uninstall.

## Матрица модулей — см. `INDEX.md`.
