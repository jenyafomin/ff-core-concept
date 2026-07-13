# ADR-C5 — Scratch, Erase Duty и Lifecycle/Uninstall (черновик-контекст)

- **Status:** draft (context only) · Owner: jenya.stasik@gmail.com · Date: 2026-07-13
- Related: M5, M8, `../DECISIONS-LOG.md` (CDL-06,07,10), CV2/CV4/CV5

## Context
Пуризм «всё — узлы» убил бы горячий путь (очередь джобов через API графа = write-amplification, смерть M2).
Нужен легальный scratch. Critic: erase scratch без синхронизации с истиной = тихая потеря аудита (ср. баг
dup-kill); и при INSERT-not-migrate узлы модуля почти-вечны → что при uninstall?

## Decision (направление)
1. **Scratch легален**, если (а) перестраивается из истины без потери, (б) достижим для hard-erase через
   обязательный erase-hook порта. Граница truth/scratch — по СЕМАНТИКЕ: `jobs/queue/seen_updates`=scratch;
   `sessions/agents/bindings`=истина.
2. **Erase синхронизируется с истиной:** hook пишет append-событие на truth-сторону («job aborted/erased»),
   session не остаётся в подвешенном состоянии; аудит инцидента сохраняется даже при стёртом payload.
3. **Кэш линз = scratch** (см. ADR-C2) → закрывает слепое пятно А (hard-erase против копий).
4. **Uninstall (M8):** осиротевшие узлы модуля → tombstone/quarantine + GC-политика, не молчаливое хранение.

## Открыто
CQ5 (детали uninstall/GC); граница «что реально перестраиваемо» — проверить на таблицах шлюза (первый тест
контракта).
