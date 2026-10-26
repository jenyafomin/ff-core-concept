// @ff/brain-mcp/charter — the memory charter served as MCP server `instructions` (one home).
//
// MCP clients (Claude Code) put a server's `instructions` from `initialize` into the system prompt, so ANY
// agent of ANY project that connects ff-brain gets the charter without per-project edits.
// Source of meaning: docs/02-project/core/01-brain/01-overview/05-brain-direction/analyses/2026-10-24-ff-ustav/
// USTAV-ff.draft.md (approved by the owner 2026-10-26, Р1 = (а): the agent writes project scopes itself).
// This is a compressed view of it — change the meaning there first, then here. Budget: ≤ CHARTER_MAX_CHARS.

/** Hard budget for the served instructions (every connected agent pays it on every turn). */
export const CHARTER_MAX_CHARS = 1500;

export const BRAIN_CHARTER = [
  'Устав общей памяти ff-brain. Память держит решения, задачи, связи и адреса; тело документа — в git.',
  '1. Первым ходом — find preset:overview (карта областей), потом open/morning своей области. Не нашёл — так и скажи.',
  '2. В проектные области (ff, agents-manager и др.) пиши САМ: решения с причиной (decision: «выбрано X» + rationale),' +
    ' задачи (task: глагол+предмет, due, why). Итог сессии — один note за сессию: 1–2 строки сути и source.ref+hash на файл.',
  '3. Не больше 3 record за ход. В rationale/тексте помечай: «со слов владельца» или «вывод агента».',
  '4. personal — только по слову владельца. Закрыть задачу (done) — тоже по его слову.',
  '5. Перед record — find (text, type, scope): нашлось похожее — правь тем же id, без дублей.',
  '6. Область по смыслу: проект — в его область; касается ≥2 проектов или системы — в ff.',
  '7. Label ≤60 знаков, словами для поиска. Связь — link, не текстом. Устарело — supersedes или retract с причиной.',
  '8. Не пиши мусор: сырой чат, черновики, логи, пересказ файлов, догадки.',
  '9. Имена и факты о третьих лицах — никогда, даже в пересказе. Без секретов и ПДн: пароли, ключи, токены, адреса,' +
    ' id чатов и юзеров. Стирания нет — сомневаешься, спроси.',
  '10. «Записал» — только при ok:true + receipt; queued:true — «запись в очереди».',
].join('\n');
