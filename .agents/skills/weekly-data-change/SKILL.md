---
name: weekly-data-change
description: Change Weekly System's Prisma schema, migrations, or persisted day/week behavior, including date boundaries, owner-scoped mutations, and activity-session idempotency. Use for data-layer changes, not presentation-only edits.
---

# Weekly System data changes

Read the affected models in [schema.prisma](../../../prisma/schema.prisma), relevant [migrations](../../../prisma/migrations), and the callers being changed. Use [product requirements](../../../docs/product-requirements.md) for domain rules and [ADR-0001](../../../docs/adr/0001-stack-and-deployment.md) for architecture. The product document is a draft: its illustrative field names are not the implemented Prisma schema.

## Preserve domain invariants

- Resolve the owner through `requireUser()` / `getCurrentUser()` in [auth.ts](../../../src/lib/auth.ts). Never accept `userId` from the client. Scope reads and writes to that owner, including related week, target, and daily-log IDs. `Constraint` inherits ownership through `Week`; not every table has its own `userId` column.
- Reuse [local-date.ts](../../../src/lib/local-date.ts). Determine today in the user's saved timezone; represent its calendar date as UTC midnight for Prisma `@db.Date`. This is a date encoding, not the instant of local midnight. Weeks run Monday through Sunday. Keep timestamp fields such as `occurredAt` distinct from calendar dates.
- Retain uniqueness for `(userId, localDate)`, `(userId, startsOn)`, and anchor templates `(userId, mode, slot)`. Missing daily logs remain missing data, not failed days. Repeating check-in must retain a manually selected mode for that local day.
- Retrying an activity addition with the same idempotency key must return the same session without duplication; verify that the existing session belongs to the same owner and target. Related entities must have the same owner. Use [today.ts](../../../src/lib/today.ts) and [today actions](../../../src/app/%28app%29/today/actions.ts) as the current entry points.
- Preserve three daily anchors and at most three weekly targets. The target limit is application behavior, not a schema constraint; evaluate concurrency when changing target creation. Derive day completion from the three anchor flags rather than adding a separately editable completion value.

## Change and verify

For a schema change, add a new migration rather than editing an applied one. On a designated development database, `pnpm db:migrate --name descriptive_name --create-only` prepares SQL; review defaults, nullability, backfills, uniqueness, and `CASCADE` / `SET NULL` effects before applying it. Verify the migration against the previous schema with representative data. Migration generation can connect to the development and shadow databases; it is not an offline check.

[prisma.config.ts](../../../prisma.config.ts) loads `.env.local` and uses `DATABASE_URL` plus optional `SHADOW_DATABASE_URL`. Establish the intended target without printing credentials. Applying migrations to a deployed database or resetting data requires authorization for that target and operation; existing authorization remains valid. If a suitable development database is unavailable, finish the schema/code/SQL work possible locally and report the missing migration verification.

Run `pnpm exec prisma validate` and `pnpm db:generate` after schema changes. Generated client files under `src/generated/prisma` are outputs, not hand-edited source. Run focused behavioral tests for the changed invariants: timezone/day/week boundaries, ownership rejection, retries, or manual-mode preservation as applicable. Complete `pnpm check` and `pnpm build`; report database-backed checks separately from static checks so generated types do not imply a tested migration.
