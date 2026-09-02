# Развёртывание Weekly System через Nginx Proxy Manager

Документ описывает production-схему, реализованную файлами `Dockerfile`, `compose.yaml` и `.env.production.example`.

## 1. Целевая схема

```text
браузер
   │ HTTPS
   ▼
Nginx Proxy Manager
   │ weekly-proxy network, HTTP :3000
   ▼
weekly-system-app — login + server session
   │ weekly-backend network, PostgreSQL :5432
   ▼
weekly-system-db
```

Правила изоляции:

- наружу публикуются только порты Nginx Proxy Manager;
- контейнер приложения использует `expose: 3000`, но не `ports`;
- PostgreSQL использует `expose: 5432`, но не `ports`;
- только приложение состоит одновременно в proxy- и backend-сетях;
- Nginx Proxy Manager не подключается к backend-сети базы данных.

## 2. Предварительные условия

- Linux-сервер с Docker Engine и Docker Compose plugin.
- Уже работающий Nginx Proxy Manager.
- DNS-запись `habbit.merdev.site`, направленная на сервер с Nginx Proxy Manager.
- Доступ к панели `https://nginx.merdev.site/`.
- Каталог приложения, например `/opt/weekly-system`.
- Подготовленные логин и Argon2id-хэш пароля единственного владельца.

## 3. Общая Docker-сеть с Nginx Proxy Manager

Если у Nginx Proxy Manager уже есть внешняя сеть, нужно использовать её имя вместо `weekly-proxy`.

Посмотреть сети:

```bash
docker network ls
```

Создать отдельную внешнюю сеть, если подходящей нет:

```bash
docker network create weekly-proxy
```

Контейнер Nginx Proxy Manager и `weekly-system-app` должны быть подключены к одной внешней сети. Docker Compose позволяет разным Compose-проектам использовать заранее созданную сеть с `external: true`.

Если Nginx Proxy Manager ещё не подключён к этой сети, сеть следует добавить в его Compose-файл и пересоздать контейнер штатной командой его проекта. Перед изменением нужно сохранить копию текущего Compose-файла.

## 4. Целевой Compose-файл приложения

Этот же контракт сохранён в корневом файле `compose.yaml`.

```yaml
services:
  app:
    container_name: weekly-system-app
    build:
      context: .
      dockerfile: Dockerfile
    restart: unless-stopped
    env_file:
      - .env.production
    environment:
      NODE_ENV: production
    expose:
      - "3000"
    depends_on:
      db:
        condition: service_healthy
    networks:
      - proxy
      - backend

  db:
    container_name: weekly-system-db
    image: postgres:17-alpine
    restart: unless-stopped
    env_file:
      - .env.production
    volumes:
      - postgres-data:/var/lib/postgresql/data
    expose:
      - "5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $${POSTGRES_USER} -d $${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - backend

volumes:
  postgres-data:

networks:
  proxy:
    external: true
    name: weekly-proxy
  backend:
    internal: true
```

Важно: `env_file` передаёт переменные контейнерам. Двойной знак `$` в healthcheck нужен, чтобы значения раскрывались внутри контейнера, а не при разборе Compose-файла. Перед запуском нужно проверить итоговую конфигурацию без публикации вывода, содержащего секреты.

## 5. Production-переменные

Целевой `.env.production`:

```dotenv
POSTGRES_DB=weekly_system
POSTGRES_USER=weekly_system
POSTGRES_PASSWORD=<случайный-длинный-пароль>
DATABASE_URL=postgresql://weekly_system:<url-encoded-пароль>@db:5432/weekly_system
APP_OWNER_ID=<стабильный-uuid-владельца>
APP_USERNAME=<логин-владельца>
APP_PASSWORD_HASH='<argon2id-хэш-пароля>'
APP_TIMEZONE=Europe/Moscow
APP_BASE_URL=https://habbit.merdev.site
SESSION_TTL_DAYS=30
```

Требования:

- файл не коммитится;
- права на сервере ограничены владельцем процесса;
- пароль базы генерируется случайно и не повторяет пароль Nginx Proxy Manager;
- пароль в `DATABASE_URL` должен быть URL-encoded либо состоять из URL-safe символов;
- `APP_OWNER_ID` создаётся один раз и сохраняется между обновлениями;
- `APP_USERNAME` не является секретом, но не должен попадать в клиентскую конфигурацию без необходимости;
- `APP_PASSWORD_HASH` хранит Argon2id-хэш, а не открытый пароль; одинарные кавычки защищают символы `$` от интерполяции env-файла;
- открытый пароль не передаётся аргументом shell-команды и не сохраняется в истории терминала;
- приложение предоставляет интерактивную команду `ENV_FILE=.env.production pnpm auth:hash-password`, которая запрашивает пароль без отображения ввода;
- секреты не выводятся командами диагностики и CI.

## 6. Первый запуск

После появления production Dockerfile и скрипта миграции последовательность должна быть такой:

```bash
cd /opt/weekly-system
docker compose build --pull
docker compose up -d db
docker compose run --rm app pnpm db:deploy
docker compose up -d app
docker compose ps
```

Проверка из общей proxy-сети:

```bash
docker run --rm --network weekly-proxy curlimages/curl:latest \
  --fail --silent --show-error http://weekly-system-app:3000/api/health
```

Маршрут `/api/health` должен проверять готовность приложения и соединение с базой, но не возвращать конфигурацию или персональные данные.

## 7. Настройка Proxy Host в Nginx Proxy Manager

В панели Nginx Proxy Manager:

1. Открыть `Hosts → Proxy Hosts → Add Proxy Host`.
2. Указать доменное имя `habbit.merdev.site`.
3. Выбрать схему `http`.
4. Указать `Forward Hostname / IP`: `weekly-system-app`.
5. Указать `Forward Port`: `3000`.
6. Включить `Block Common Exploits`.
7. Включить `Websockets Support`, чтобы конфигурация не мешала будущим realtime-функциям и dev-independent протоколам приложения.
8. Оставить `Access List` в режиме публичного доступа: аутентификацию выполняет само приложение.
9. Сохранить Proxy Host и проверить открытие login-страницы.

Не следует указывать IP контейнера: он может измениться после пересоздания. В общей Docker-сети используется DNS-имя `weekly-system-app`.

## 8. Аутентификация приложения

VPN, IP allowlist и Nginx Basic Auth для доступа к Weekly System не требуются. Домен доступен через интернет по HTTPS, а персональные маршруты защищает приложение.

Обязательное поведение:

- `/login` доступен без сессии;
- `/api/health` доступен без сессии и не содержит персональных данных;
- остальные страницы перенаправляют неавторизованного пользователя на `/login`;
- остальные API отвечают `401` без персональных данных;
- пароль проверяется только на сервере по Argon2id-хэшу;
- правильные реквизиты создают случайную непрозрачную сессию;
- браузер получает cookie с `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/`;
- в базе хранится только хэш session token;
- logout удаляет запись сессии и cookie;
- срок сессии по умолчанию — 30 дней;
- ошибочные попытки входа ограничиваются по IP и логину;
- ответ при неправильном логине и пароле одинаков: `Неверный логин или пароль`.

Для смены пароля нужно сгенерировать новый Argon2id-хэш командой `ENV_FILE=.env.production pnpm auth:hash-password`, пересоздать контейнер приложения и отозвать существующие сессии.

## 9. TLS

После успешной проверки proxy:

1. Открыть вкладку `SSL` Proxy Host.
2. Выбрать существующий сертификат или `Request a new SSL Certificate`.
3. Включить `Force SSL`.
4. Включить HTTP/2.
5. Включить HSTS только после проверки стабильной работы HTTPS и понимания последствий длительного кеширования политики браузером.
6. Проверить дату окончания сертификата и автоматическое продление.

DNS-запись `habbit.merdev.site` должна быть доступна для выбранного способа проверки Let's Encrypt. Если HTTP challenge недоступен, следует использовать DNS challenge через поддерживаемого DNS-провайдера.

## 10. Обновление приложения

Перед обновлением:

1. Создать резервную копию базы.
2. Проверить свободное место.
3. Получить новую версию кода или image.
4. Собрать image.
5. Запустить Prisma migrations отдельной командой.
6. Пересоздать приложение.
7. Проверить health endpoint и основной сценарий `/today`.

Целевая последовательность:

```bash
cd /opt/weekly-system
docker compose exec -T db sh -c \
  'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' \
  > "backup-before-deploy.dump"
docker compose build --pull app
docker compose run --rm app pnpm db:deploy
docker compose up -d app
docker compose ps
```

Для автоматизации лучше выполнять `pg_dump` через shell внутри контейнера, где переменные уже доступны, как показано ниже.

## 11. Резервное копирование PostgreSQL

Минимальная политика для MVP:

- ежедневный custom-format dump через `pg_dump -Fc`;
- хранение минимум 14 ежедневных копий;
- одна дополнительная копия перед каждым deployment;
- минимум одна зашифрованная копия вне сервера;
- ежемесячная проверка восстановления в отдельную тестовую базу.

Пример ручного backup:

```bash
mkdir -p backups
docker compose exec -T db sh -c \
  'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' \
  > "backups/weekly-system-$(date +%Y%m%d-%H%M%S).dump"
```

Результат нужно проверить:

```bash
test -s backups/weekly-system-YYYYMMDD-HHMMSS.dump
```

Наличие файла не доказывает возможность восстановления; обязательна периодическая restore-проверка.

## 12. Проверка восстановления

Сначала восстановление тестируется в отдельную базу. Не следует начинать с production-базы.

```bash
docker compose exec -T db sh -c \
  'createdb -U "$POSTGRES_USER" weekly_system_restore_test'

docker compose exec -T db sh -c \
  'pg_restore -U "$POSTGRES_USER" \
    -d weekly_system_restore_test \
    --clean --if-exists --no-owner' \
  < backups/weekly-system-YYYYMMDD-HHMMSS.dump
```

После восстановления нужно:

- подключиться к тестовой базе;
- проверить количество недель, дневных логов и сессий;
- выполнить минимальный набор read-only запросов;
- записать дату и результат restore drill;
- удалить тестовую базу только после проверки и отдельного подтверждения оператора.

Production restore выполняется только в окно обслуживания после дополнительной резервной копии текущего состояния.

## 13. Проверка после развёртывания

- `http://habbit.merdev.site` перенаправляется на `https://habbit.merdev.site`.
- Неавторизованное открытие `/today` перенаправляет на `/login`.
- Неверный логин или пароль возвращает общую ошибку без уточнения поля.
- Правильный логин создаёт защищённую cookie и открывает `/today`.
- Logout отзывает сессию; повторное использование старой cookie не работает.
- Обход Nginx Proxy Manager по `server-ip:3000` невозможен.
- Порт PostgreSQL не доступен с хоста или внешней сети, если это не требуется для администрирования через защищённый канал.
- HTTP перенаправляется на HTTPS.
- `/api/health` возвращает успешный статус без чувствительных данных.
- `/today` загружается и сохраняет тестовый check-in.
- После перезапуска контейнеров данные сохраняются.
- В логах нет паролей, `DATABASE_URL`, заметок, HRV, энергии и сна.
- Создан и проверен первый backup.

## 14. Откат

До релиза нужно сохранять тег предыдущего рабочего image. Если новая версия не проходит health check:

1. остановить новый контейнер приложения;
2. запустить предыдущий image;
3. проверить совместимость предыдущей версии с применённой схемой базы;
4. восстанавливать базу только если миграция необратима и это предусмотрено release plan;
5. записать причину и результат отката.

Prisma migration нельзя автоматически считать обратимой. Каждое изменение схемы должно иметь отдельный rollback-план до production deployment.

## Официальные источники

- [Nginx Proxy Manager guide](https://nginxproxymanager.com/guide/)
- [Docker Compose networking](https://docs.docker.com/compose/how-tos/networking/)
- [PostgreSQL backup and restore](https://www.postgresql.org/docs/17/backup.html)
- [pg_restore](https://www.postgresql.org/docs/17/app-pgrestore.html)
