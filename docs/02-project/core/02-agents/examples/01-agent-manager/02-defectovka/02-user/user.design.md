---
node_type: design-note
title: user — единица «пользователь» как конструктор данных
status: draft
owner: jenya.stasik@gmail.com
date: 2026-07-23
related:
  - ../../01-overview/README.md
  - ../01-agent/agent.design.md
  - ../04-space-team-role/space-team-role.design.md
  - ../07-knowledge-base/knowledge-base.design.md
---

# U2 · user — единица «пользователь» как конструктор данных

## 1. Суть
Тот, кого агент обслуживает. Не «имя + список запросов», а **накопительная сборка**: тождество
(кто это) + знание о нём, которое **растёт со временем** (факт за фактом, актами, а не перезаписью
поля) + поведение, которое разное в разных пространствах (топик/чат = своя грань). Ключевое свойство:
агент должен уметь **достать любую инфу по пользователю в нужный момент** — значит знание должно быть
адресуемо и структурировано, а не рассыпано по чатам.

## 2. Переменные (поля)

| Поле | Тип | Зачем | Пример |
|------|-----|-------|--------|
| `id` | node-id | тождество пользователя (сквозное, не per-чат) | `user:owner` |
| `identity` | конструктор | кто это физически/по каналам | `{display_name, handles[]}` |
| `profile_facts` | fact-node[] (конструктор) | накопленное знание — **факты, не строки** | `[{id, statement, source, confidence, valid_from}]` |
| `behavior_by_space` | map (конструктор) | поведение агента с этим юзером в конкретном пространстве | `{space:topic-56: {tone, notes}}` |
| `interaction_log` | act[] | история запросов/обращений (append-only) | `[{at, space, kind, summary}]` |
| `access_policy` | конструктор | что агенту можно доставать/раскрывать по этому юзеру и кому | `{visible_to: [...], valve_required_for: [...]}` |
| `knowledge_ref` | ref | партиция в базе знаний, где физически лежат факты (→ U7) | `kb:ff#user-knowledge:owner` |

## 3. Под-сущности (сами становятся узлами)
- `profile-fact` — единица знания о пользователе: утверждение + источник + уверенность + срок
  действия. Не мержится молча с предыдущим — новый факт **дополняет**, старый может быть помечен
  `superseded`, но не стирается (LOSE-NOTHING, как в doc-tree).
- `interaction-act` — запись одного обращения: где (`space`), что спросили/сделали, когда. Не «история
  чата» целиком — сжатый акт, на который можно сослаться.
- `space-behavior-profile` — как агент ведёт себя с этим юзером именно в этом пространстве (тон,
  доп. договорённости) — то же тождество пользователя, разная грань поведения.

## 4. Связи (рёбра)
```
user(U2) --interacts-with--> agent(U1)
agent(U1) --serves--> user(U2)
user(U2) --member-of--> space(U4)                      (см. U4: та же единица связи, что и в space)
knowledge-base(U7) --stores--> user-knowledge           (= user.profile_facts, партиция U2 внутри U7)
user(U2) --produces--> event(U10)                       (запрос пользователя = событие, триггерит луп)
```

## 5. Форма данных (конструктор)

**Быстрый пример:**
```json
{
  "id": "user:owner",
  "type": "user",
  "identity": {
    "display_name": "Женя",
    "handles": [{ "channel": "telegram", "handle": "1112667160" }]
  },
  "profile_facts": [
    {
      "id": "fact:owner-001",
      "statement": "Предпочитает совет специалистов до строительства (не спешить в код)",
      "source": "interaction-act:2026-06-15",
      "confidence": "high",
      "valid_from": "2026-06-15",
      "status": "active"
    },
    {
      "id": "fact:owner-002",
      "statement": "Голос → всегда транскрибировать через whisper, не игнорировать",
      "source": "interaction-act:2026-07-08",
      "confidence": "high",
      "valid_from": "2026-07-08",
      "status": "active"
    }
  ],
  "behavior_by_space": {
    "space:tg-ff-personal:topic-56": { "tone": "рабочий/кратко", "notes": "brain-топик, держать высоту" }
  },
  "interaction_log": [
    { "at": "2026-07-23T10:00:00Z", "space": "space:tg-ff-personal:topic-56", "kind": "voice-request", "summary": "дефектовка агентской системы" }
  ],
  "access_policy": { "visible_to": ["agent:ff-personal"], "valve_required_for": ["share-with-third-party"] },
  "knowledge_ref": "kb:ff#user-knowledge:owner"
}
```

**Вариант A (холодный старт, новый юзер):** `profile_facts: []`, `behavior_by_space: {}` —
пользователь известен только по `identity`; знание строится с первого `interaction-act`.
**Вариант B (гость в чужом пространстве):** тот же `id`, но `behavior_by_space` содержит запись
только для одного `space`, а `access_policy.visible_to` уже другого агента — тождество едино,
видимость и поведение — per-space/per-agent.

## 6. Дизайн-паттерн / метод
- **Knowledge-as-acts, не knowledge-as-overwrite.** Знание о пользователе копится фактами с
  provenance/confidence, каждый новый факт — новый узел, а не перезапись поля «профиль» — отвечает
  прямо на «знание накапливается со временем».
- **Identity ≠ behavior.** Тождество пользователя одно и сквозное (`id`), а поведение/видимость —
  грань per-space (`behavior_by_space`) — тот же паттерн, что и `member ≠ user` в U4, применённый
  с другой стороны связи.
- **Addressable knowledge.** `knowledge_ref` даёт агенту прямой адрес, откуда «достать любую инфу по
  пользователю в нужный момент», не пересобирая её из истории чатов.

## 7. Открытые вопросы
- Q-1: `profile_facts` физически хранятся ВНУТРИ узла `user`, или это чисто ссылка/линза на партицию
  `user-knowledge` в U7 (та же граница, что и project↔knowledge-base в U3)? Дублировать нельзя — нужно
  одно решение на обе единицы.
- Q-2: у факта есть `confidence`/`valid_from` — кто и как его **ревалидирует** со временем (протухание,
  переоценка), автоматически агентом или по явному акту?
- Q-3: `access_policy` — приватность фактов по умолчанию. Если агент делегирует под-агенту (U1
  `delegates-to`), что из `profile_facts` наследуется, а что требует отдельного valve?
