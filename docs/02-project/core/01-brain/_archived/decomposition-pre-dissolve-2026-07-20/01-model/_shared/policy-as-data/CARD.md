---
Status: draft
Owner: jenya.stasik@gmail.com
Date: 2026-07-14
Scope: project
node_type: theme-card
title: policy-as-data — правила как данные (+ hard-erase-per-type)
Related:
  - ../../../../architecture/modules/M-G3-type-registry-policy/README.md
  - ../../../../decisions/SPEC-DRAFT-forgetting-hard-erase.md
---

# ⚖️ policy-as-data  ← P8

## Что это / что хранит
Правила системы живут как **ДАННЫЕ в реестре** (узлы-policy), а не хардкод. Возможно — «чисто системный
слой». Хранит: per-type настройки, каскад Конституция > policy > integrity, и, по владельцу, **возможно
концептуальные моменты** (описания, уровни). Инфраструктурные правила «сильно всё дополняют».

## Ключевое: hard-erase = свойство ТИПА
Владелец (100%): забвение — **не универсальный долг движка**, а **декларация erase-capability на типе**.
Тип объявляет, поддерживает ли удаление. Часть типов неудаляемы by design (журнал, определения); личный
payload — удаляем. Живёт в policy-as-data. Уточняет DL-13/M7.

## Зачем (для кого)
Система «бесконечно улучшается»: модули формируются, **люди сами создают свои модули и единицы памяти**
(по разным признакам) — правила-как-данные позволяют это без миграций.

## Где ляжет в канон
`M-G3-type-registry-policy` + `SPEC-DRAFT-forgetting-hard-erase.md` + policy-узлы доменов; новые DL.

## Открыто
- FQ7: каскадирует ли hard-erase на потомков-агрегаты (цена забвения).
- erase vs WAL/бэкапы (crypto-shredding или вне scope).
- Что ещё, кроме erase, декларируется per-type (retention, consent, видимость, «умность» категорий).
- D5 integrity: уровень каскада или долг движка.

## Связи
→ узел/тип (per-type) · категории (их «умность» описана здесь) · слои (системный слой) · erase (M7).

## Готово к потоку
analyst (модель policy-as-data + erase-per-type) + critic (сломать: append-only журнал vs стирание).
