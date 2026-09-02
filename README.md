# Weekly System

Адаптивный веб-дашборд для планирования недели и выбора реалистичной нагрузки на день с учётом энергии и сна.

MVP рассчитан на одного пользователя, разворачивается на собственном сервере и доступен по `https://habbit.merdev.site`. Nginx Proxy Manager завершает TLS и проксирует трафик, а приложение защищает данные простым входом по логину и паролю.

## Документация

- [Требования к веб-приложению](docs/product-requirements.md)
- [Backlog задач](TASKS.md)
- [Архитектурное решение](docs/adr/0001-stack-and-deployment.md)
- [Развёртывание через Nginx Proxy Manager](docs/deployment.md)

## Статус

Готов первый рабочий вертикальный срез: защищённый вход, PostgreSQL/Prisma и экран `Сегодня` с check-in, автоматическим режимом и тремя сохраняемыми опорами.

## Локальный запуск

Требуются Node.js 24, pnpm 11 и PostgreSQL. Создайте `.env.local` по `.env.example`, затем выполните:

```bash
pnpm install
pnpm db:deploy
pnpm db:generate
pnpm dev
```

Пароль владельца превращается в Argon2id-хэш интерактивно:

```bash
pnpm auth:hash-password
```

Перед отправкой изменений:

```bash
pnpm check
pnpm build
```
