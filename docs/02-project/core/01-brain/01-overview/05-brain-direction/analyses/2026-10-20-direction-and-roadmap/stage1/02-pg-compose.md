---
status: review
owner: jenya.stasik@gmail.com
date: 2026-10-21
---
# Build 02: Postgres для ff-brain через docker compose

- **Потребитель:** лид сессии, владелец (шаг подъёма), дорожка B (адаптер хранилища)
- **Поглощает:** ничего
- **Вопрос-цель:** «у мозга есть отдельный, изолированный от Cardex Postgres, который можно поднять и откатить одной командой?» Ответ: **частично.** Файлы готовы и проверены, сам подъём ждёт шаг владельца (`.env`).

## Сделано
- `infra/ff-brain-pg/docker-compose.yml`:
  - образ `postgres:17.6-alpine`, уже скачан;
  - compose-проект `ff-brain`, контейнер `ff-brain-pg`;
  - порт `127.0.0.1:5433:5432`, volume `ff-brain-pg-data`;
  - healthcheck через `pg_isready`, `restart: unless-stopped`, метки `com.ff.project=ff-brain`;
  - переменные обязательны (`:?`), поэтому без `.env` compose не стартует.
  - `docker compose config` проходит.
- `infra/ff-brain-pg/README.md`: поднять, остановить, бэкап (`pg_dump -Fc`), восстановление, порт, почему отдельно, откат.
- `.gitignore`: добавлена строка `infra/ff-brain-pg/.env`, `git check-ignore` её подтверждает.
- Порт 5433 свободен. Cardex `pg` (0.0.0.0:5432) не тронут и работает (`docker ps`).

## Блокер: агент не может создать `.env`
- Хук PreToolUse «изменение/удаление секретов или .env запрещено без явного разрешения» и deny-правило `.env*` блокируют создание `.env` и `.env.example`. Обходить их другим инструментом я не стал.
- Шаблон `.env.example` перенесён в README.
- Ни один файл с секретом не создан.

## Шаг владельца (3 команды из корня репозитория)
```bash
( umask 077; printf 'POSTGRES_DB=ff_brain\nPOSTGRES_USER=ff_brain\nPOSTGRES_PASSWORD=%s\n' "$(openssl rand -hex 24)" > infra/ff-brain-pg/.env )
docker compose -f infra/ff-brain-pg/docker-compose.yml --env-file infra/ff-brain-pg/.env up -d
docker exec ff-brain-pg psql -U ff_brain -d ff_brain -c 'select version()'
```
Второй вариант: дать агенту явное разрешение на `infra/ff-brain-pg/.env`, тогда подъём и проверку сделает агент.

## Не делалось
Схема, миграции и код `packages/*` не тронуты: это дорожка B. Коммита нет.

Итог: задача в плане. Владелец создаёт `.env` и запускает `up -d`, либо разрешает это агенту.
