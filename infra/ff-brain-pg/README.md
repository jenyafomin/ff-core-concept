# ff-brain Postgres (docker compose)

- **Status:** active (инфраструктура поднята без схемы; схема и миграции — дорожка B, позже)
- **Owner:** jenya.stasik@gmail.com
- **Date:** 2026-10-21
- **Потребитель:** сервис мозга `@ff/brain` (дорожка B — адаптер хранилища), владелец (бэкап и восстановление)
- **Поглощает:** ничего (новый узел)
- **Related:** `docs/02-project/core/01-brain/01-overview/05-brain-direction/analyses/2026-10-14-settings-and-storage/` · `docs/02-project/core/01-brain/01-overview/05-brain-direction/analyses/2026-10-20-direction-and-roadmap/build/02-pg-compose.md`

## Что это
Отдельный Postgres 17 (`postgres:17.6-alpine`) для ff-brain.
- Контейнер `ff-brain-pg`, compose-проект `ff-brain`, volume `ff-brain-pg-data`.
- Порт **127.0.0.1:5433** (только localhost). БД и пользователь — `ff_brain`.

## Почему отдельно
- В docker уже работает `pg` (postgres:15, 0.0.0.0:5432) проекта Cardex. **Его не трогаем.** Отдельный compose-проект, контейнер, volume и порт исключают пересечение по данным, версиям и рестартам.
- Почему не через pm2 или brew: изоляция, зафиксированная версия образа, один volume, откат в одну команду.

## Секреты (`.env`)
Файл `infra/ff-brain-pg/.env` лежит в `.gitignore`, права 600. Создаёт владелец (у агента запись `.env*` запрещена правилом безопасности):

```bash
cd /Users/mac16/Documents/IT/Apps/FF-Personal-Managment
( umask 077; printf 'POSTGRES_DB=ff_brain\nPOSTGRES_USER=ff_brain\nPOSTGRES_PASSWORD=%s\n' "$(openssl rand -hex 24)" > infra/ff-brain-pg/.env )
chmod 600 infra/ff-brain-pg/.env
```

Шаблон без значений: `POSTGRES_DB=ff_brain`, `POSTGRES_USER=ff_brain`, `POSTGRES_PASSWORD=`.

## Поднять / проверить / остановить
```bash
C="docker compose -f infra/ff-brain-pg/docker-compose.yml --env-file infra/ff-brain-pg/.env"
$C up -d
docker inspect -f '{{.State.Health.Status}}' ff-brain-pg   # ждать healthy
docker exec ff-brain-pg psql -U ff_brain -d ff_brain -c 'select version()'
$C stop       # остановить (контейнер и данные остаются)
$C start
```

## Бэкап и восстановление
```bash
# бэкап (custom-формат, сжатый)
docker exec ff-brain-pg pg_dump -U ff_brain -d ff_brain -Fc > ff_brain-$(date +%F).dump
# восстановление в существующую БД
docker exec -i ff-brain-pg pg_restore -U ff_brain -d ff_brain --clean --if-exists < ff_brain-YYYY-MM-DD.dump
```
Дампы — вне git: они содержат личные данные.

## Откат
- `$C down` удаляет контейнер и сеть. **Данные остаются** в volume `ff-brain-pg-data`, следующий `up -d` их подхватит.
- `$C down -v` или `docker volume rm ff-brain-pg-data` **безвозвратно удаляет данные**. Делает только владелец, и только после бэкапа.
