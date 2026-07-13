# Инфраструктурные модули Combination — матрица

- **Status:** draft — cycle 1 · Owner: jenya.stasik@gmail.com · Date: 2026-07-13
- Источник: `../../SURVIVING-CUT.md` (Fable 5 модулей + правки critic). Related: `../decisions/ADR/`.

## Матрица

| M | Модуль | Что сводит | Паттерн | ADR | Слой | Ценности |
|---|--------|------------|---------|-----|------|----------|
| **M0** | **Kernel & Seed-vocabulary** | движок субстрата + Конституция + реестр типов + шина портов + integrity + seed-словарь (Module/Manifest/Version/Type/Port/LineageEdge); bootstrap; апгрейд ядра | OS-kernel / self-hosting compiler | **ADR-C0** | 🔴 | CV1 |
| **M1** | **Module Registry & Manifest** | реестр типов Brain (DL-14) + реестр bot/agent шлюза (M5) → каталог граждан-модулей; манифест 8 частей; discovery | Postgres extensions / package-manager+lockfile; registry-as-nodes | **ADR-C1** | 🔴 | CV1 |
| **M2** | **Vocabulary & Lenses** | INSERT-not-migrate + bitemporal + апгрейд живой БД; форк-lineage; тотальность линзы; компакция | event-sourcing upcasting; schema-on-read (Cambria) | **ADR-C2** | 🔴 | CV2,CV3 |
| **M3** | **Port Bus / Capability Broker** | 13 портов шлюза + Engine Contract #15 + key-custody; поведенческий контракт порта | hexagonal ports + object-capabilities | **ADR-C3** | 🟡 | CV1,CV4,CV5 |
| **M4** | **Provenance & Certification** | штамп module@version на каждой записи + conformance-suite как сертификат + доверие marketplace | signed assertions + contract tests | **ADR-C4** | 🔴 | CV3,CV5 |
| **M5** | **Scratch & Erase Duty** | операционные сторы (очереди джобов) + Конституция: scratch легален, перестраиваем, erase-reachable; синхронизация erase с истиной (аудит) | cache-with-obligations | **ADR-C5** | 🟡 | CV2,CV4,CV5 |
| **M6** | **Cutover / Bridge** (NEW, critic) | сегодняшняя федерация (SQLite шлюза) → цель один субстрат; мост-адаптер; рабочий шлюз не морозим | strangler-fig / anti-corruption layer | **ADR-C6** | 🟡 | CV4,CV1 |
| **M7** | **Sandbox / Certification runtime** (NEW, critic) | исполнение чужого кода (линзы/адаптеры) изолированно; тонкий рантайм сертификации Combination | object-capability sandbox | ADR-C4 (раздел) | 🟢 | CV5 |
| **M8** | **Lifecycle / Uninstall** (NEW, critic) | деинсталляция модуля при INSERT-not-migrate: осиротевшие узлы → tombstone/quarantine, не молчаливое хранение | soft-delete + tombstone + GC-политика | ADR-C5 (раздел) | 🟢 | CV1,CV3 |

## Три несущих столпа (после критики) → лежат на M0/M2/M4
1. **Kernel ≠ module** (+ seed-словарь + отдельный апгрейд ядра) — M0.
2. **Совместимость двухворотная** (словарь M2 + поведение порта M3/M4); линза объявляет тотальность — M2.
3. **Combination = контракт + conformance + тонкий sandbox** (не второй движок) — M4/M7.

## Слепые пятна → куда легли
- A hard-erase против кэшей линз → M5 (кэш = scratch).
- Б ontology commons (два «Task») → M1 (core-словарь ядра + неймспейсы + рёбра-маппинги).
- В provenance утверждений → M4 (штамп module@version).
- NEW-1 безопасность чужого кода → M7. NEW-2 PII vs immutability → M5+Brain hard-erase.
  NEW-3 мультитенантность → CQ4 (later). NEW-4 канал обновления форка → M2/CV3. NEW-5 uninstall → M8.

## ADR-роадмап
ADR-C0 (kernel) → ADR-C1 (манифест/граница) → ADR-C2 (версии+линзы) — минимальный фундамент для «первого
хода» (манифест «Плана» → прогон шлюза). Далее C3–C6 по мере того, где манифест «трещит».
