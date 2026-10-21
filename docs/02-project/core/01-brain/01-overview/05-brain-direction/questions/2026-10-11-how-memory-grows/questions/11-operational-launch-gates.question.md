---
id: Q-F11
type: question
kind: fork
status: open
load_bearing: false
decider: owner
decided_by: null
author: business-analyst
derived_from: [../../START-NEXT-SESSION.md]
edges: [{pred: part-of, to: Q-1}]
light: yellow
---
# Q-F11: Три операционных настройки запуска (до шага 7 RUNBOOK)

Короткие, без высоты. Источник: START-NEXT-SESSION шапка и §4.
- М7б, часовой пояс. Без него гейт 7 дней не стартует (`launch-kit/GATE-7days.md`, стр. 15). Дефолта нет; машина сейчас в PDT (-0700), но не угадываем.
- М7а, пороги недели и правило дня 3. Дефолт «да» (`owner-morning/16-summary.md`).
- Д1 (G-20), путь дубля голосового. Дефолт «да»: фикс дубля не летит, живём с риском, память защищена idem (RUNBOOK 0.1).
М5 и М6 не блокируют. М8 уже решён: «Всегда».
Решает: владелец, одной фразой в сообщении.
Условие пересмотра: гейт покажет перекос порогов.
Предсказание: ответ занимает 10 секунд.
