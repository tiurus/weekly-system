# ADR-0001: стек и модель развёртывания

- Статус: принято
- Дата: 2 сентября 2026

## Контекст

Первая версия Weekly System предназначена для одного владельца и работает на собственном сервере по публичному HTTPS-домену. Доступ защищается встроенным входом по логину и паролю, а модель данных не должна мешать появлению нескольких пользователей позднее.

Проект не должен зависеть от Vercel-specific runtime или управляемых сервисов.

## Решение

### Приложение

- Full-stack framework: Next.js.
- Язык: TypeScript в strict-режиме.
- Runtime: Node.js 24 LTS.
- Package manager: pnpm 11 с зафиксированной версией в `packageManager` после создания `package.json`.
- UI: Tailwind CSS.
- База данных: PostgreSQL.
- ORM и миграции: Prisma.

### Развёртывание

- Production image собирается собственным Dockerfile.
- Приложение и PostgreSQL запускаются через Docker Compose.
- PostgreSQL находится только во внутренней Docker-сети.
- Приложение подключается к общей внешней сети Nginx Proxy Manager, но не публикует порт на интерфейс хоста.
- Nginx Proxy Manager завершает TLS и проксирует запросы к контейнеру приложения.
- Production URL: `https://habbit.merdev.site`.
- Proxy Host настраивается через `https://nginx.merdev.site`.
- VPN и Nginx Basic Auth не требуются для основного сценария.

### Single-user authentication

- В базе существует один профиль владельца с уникальным логином и Argon2id-хэшем пароля.
- Начальные реквизиты передаются только через server-side secrets.
- Login создаёт непрозрачную серверную сессию; в cookie хранится токен, а в базе — только его хэш.
- Cookie использует `HttpOnly`, `Secure` и `SameSite=Strict`.
- Клиент не передаёт `userId`.
- Сервер получает owner id из проверенной сессии.
- Таблицы и репозитории данных с первого дня имеют owner scope.
- Публичной регистрации, восстановления пароля, ролей и управления пользователями в MVP нет.

## Почему pnpm 11

pnpm выбран за строгую и воспроизводимую установку зависимостей и экономное хранилище. Линия 11 выбрана вместо недавно выпущенной 12, чтобы не вводить в MVP дополнительный риск нового runtime. Переход на 12 можно рассмотреть после стабилизации проекта.

## Почему Node.js 24

Node.js 24 является актуальной LTS-линией на момент принятия решения и совместим с pnpm 11.

## Команды проекта

После scaffold в `package.json` должны быть единые команды:

```bash
pnpm dev
pnpm build
pnpm start
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm check
```

`pnpm check` объединяет обязательные локальные проверки, кроме продолжительных end-to-end тестов.

## Последствия

- Локальная и production-среды используют один major Node.js.
- Сборка обязана работать в обычном Node.js Docker-контейнере.
- Нельзя использовать Vercel KV, Vercel Postgres, Edge-only API и другие обязательные platform-specific зависимости.
- В MVP появляется экран входа и серверные сессии, но нет регистрации и восстановления пароля.
- Nginx Proxy Manager отвечает за TLS и маршрутизацию, приложение — за аутентификацию и авторизацию данных.
- Перед добавлением второго пользователя потребуется отдельный security review и пользовательские сценарии управления аккаунтами.

## Официальные источники

- [Node.js releases](https://nodejs.org/en/about/previous-releases)
- [pnpm installation and compatibility](https://pnpm.io/installation)
- [Docker Compose networking](https://docs.docker.com/compose/how-tos/networking/)
