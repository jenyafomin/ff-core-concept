---
status: draft
owner: jenya.stasik@gmail.com
date: 2026-07-26
node_type: analysis
title: Линза 3 — Архитектура хранения (git vs off-git content-addressable shred-store)
---

# Линза 3 · Архитектура хранения

Позиция: «какое минимальное изменение субстрата делает эрейж доказуемым, не ломая file-first-ценность.»

## 1. Три варианта субстрата
- **(A) Статус-кво: file-first payload в git.** Эрейж = history-rewrite. Практически необратимо-невозможно,
  не достаёт клонов/бэкапов. **Эрейж НЕ доказуем.**
- **(B) Off-git content-addressable payload-store, shred-by-key; git держит только `ref`+`hash`
  (и, при желании, зашифрованный блоб или ничего).** Эрейж доказуем. Но ломает hand-edit/plaintext-diff
  для ЭТОГО payload.
- **(Hybrid, рекомендуемый): раскол по чувствительности.** Человеческий контент, который НЕ PII и НЕ о
  третьем лице (слова владельца о себе/мире) → file-first plaintext в git (эрейж ему не нужен никогда).
  Контент с PII / referent≠owner → НЕ file-first; в DB-first удаляемый payload-store (G3) или off-git
  зашифрованный CAS с shred-by-key.

## 2. Ключевое: фикс — на ДОПУСКЕ, не на механизме стирания
- Не надо вырывать весь payload из git. Надо добавить **admission-правило, симметричное уже
  ратифицированному** в ADR-0006(g): access/policy/registry-типы = «DB-first ТОЛЬКО, не eligible для
  file-first», потому что file-first обходит `resolve()` в момент записи.
- **Тем же механизмом:** «erasure-eligible / PII-несущий / referent≠owner payload = DB-first ТОЛЬКО
  (или off-git shreddable), не eligible для file-first», потому что git не может исполнить эрейж.
- Тогда file-first остаётся plaintext-в-git для действительно не-стираемого человеческого контента, а
  эрейж доказуем **по построению**: всё erasure-eligible физически никогда не в git.

## 3. Смычка с уже-approved G3 — и разрыв в ней
- G3 (approved, day-1): «PII только по `ref` в удаляемом payload-store; envelope не инлайнит PII;
  admission-валидатор REFUSED до append». Это УЖЕ семя фикса.
- **Но G3 сформулирован вокруг DB-first ingest (rentacar).** ADR-0006(f) file-first строит журнал
  **ДИФФОМ ФС ПОСЛЕ** записи файла — на этом пути **нет `resolve()`/валидатора в момент записи**.
- Значит для file-first admission-гейт G3 **структурно не может сработать до append**: к моменту, когда
  движок «заметил» файл, PII уже в файле и, возможно, уже в git-коммите. Это ровно тот **write-time-гейт,
  который ADR-0006(g) сам пометил как недостающий fast-follow** («пост-фактум-дифф НЕДОСТАТОЧЕН»), теперь
  применённый к PII, а не только к access-полям.

## 4. Что именно off-git и когда
- **День-1 (минимум, ничего нового сверх approved):** DB-first payload-store + G3 tombstone+delete.
  Достаточно для rentacar-PII (M1). Добавить: (i) admission-правило «PII/referent не file-first»,
  (ii) file-first write-time-гейт (тот же fast-follow долг).
- **Fast-follow (когда бэкапы/маркетплейс реальны):** off-git зашифрованный CAS + shred-by-key —
  устойчивость к бэкапам/репликам по построению (не догонять копии). Гранулярность ключа ≥ per-referent
  (OQ-1); дедуп не пересекает границу референта (см. линза 1).

## Вардикт линзы
Минимальное изменение субстрата = **не «payload вон из git», а admission-правило + write-time-гейт**,
симметричные существующему DB-first-ONLY списку ADR-0006(g). Это делает эрейж доказуемым для всего
erasure-eligible (оно по построению off-git), сохраняя file-first для не-стираемого контента. Off-git
CAS с shred-by-key — усиление на fast-follow, не блокер дня-1.
</content>
