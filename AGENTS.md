<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Weekly System

## Project context

Weekly System is a Russian-language, responsive dashboard for one owner's daily
and weekly planning. Keep the product focused on a sustainable workload and the
three daily anchors: focus, body, and shutdown.

- Runtime: Node.js 24 (`.nvmrc`), pnpm pinned by `package.json#packageManager`.
- Stack: Next.js App Router, React, strict TypeScript, Tailwind CSS, PostgreSQL,
  Prisma. Read installed versions from `package.json`.
- Deployment: standalone Node.js in Docker Compose behind Nginx Proxy Manager.
  Preserve compatibility with self-hosting; avoid mandatory Vercel services.

Read the sources relevant to the task, rather than loading every document:

- [README.md](README.md): local setup and verification commands.
- [Product requirements](docs/product-requirements.md): behavior and acceptance criteria.
- [TASKS.md](TASKS.md): backlog and task identifiers; unchecked items can be partially implemented.
- [ADR-0001](docs/adr/0001-stack-and-deployment.md): accepted architecture.
- [Deployment](docs/deployment.md): production, secrets, backup and restore procedures.

Use the current user request to determine scope. If a request changes an existing
product decision, update the relevant documentation with the implementation.
Confirm the current code before treating a backlog item as missing or complete.

## Code map and conventions

- `src/app/(app)`: protected pages and their Server Actions.
- `src/app/login`, `src/lib/auth.ts`, `src/proxy.ts`: authentication and route gating.
- `src/lib`: database access, local dates, mode rules, and colocated Vitest tests.
- `src/components`: shared UI; `src/app/globals.css`: shared styles.
- `prisma/schema.prisma` and `prisma/migrations`: persisted model and migration history.
- `src/generated/prisma`: generated client; regenerate it instead of editing it.

Follow existing patterns and use the `@/` import alias. Keep database access and
secrets on the server; introduce client components only where interaction needs
them. Validate untrusted action input with the existing Zod conventions. Use
accessible controls and preserve Russian UI copy, mobile layouts, and clear
pending/error feedback.

## Data and authentication invariants

- Verify the server session in every protected data entry point. A cookie's
  presence in `src/proxy.ts` alone does not authenticate a user.
- Derive the owner from the verified session, never a client-provided `userId`.
  Scope reads, mutations, and related-record checks to that owner, directly or
  through a verified parent relation.
- Keep only session-token hashes in the database. Preserve Argon2id password
  verification and the existing production cookie protections.
- Resolve the day in the user's saved timezone through `src/lib/local-date.ts`.
  A week runs Monday through Sunday; date-only storage is not a server-local timestamp.
- Preserve one daily log per owner/date and one week per owner/start date.
  Preserve idempotency when recording activity sessions.
- Respect manual mode selection and the three-anchor contract. Treat changes to
  these product rules as explicit behavior changes, not incidental refactoring.

For Prisma model, migration, or persisted day/week changes, use the repository
skill [weekly-data-change](.agents/skills/weekly-data-change/SKILL.md).

## Working agreements

- Inspect `git status` before editing. Preserve unrelated work, including
  untracked files. Format and stage only files within the task's scope.
- Complete authorized work through verification. Make reasonable implementation
  choices; ask only when missing information materially changes the result.
  Explain assumptions briefly and keep user-facing updates and handoffs in Russian.
- Current user instructions take precedence over project and skill guidelines.
  If an instruction blocks progress, identify its file and exact requirement.
- Delegate independent investigation, implementation, or review when it improves
  speed or quality. Give each writer distinct files; integrate and review results.
  Use `weekly_reviewer` for an independent review of substantial or sensitive changes
  when custom agents are available. A small edit does not require delegation.
- Keep credentials out of tracked files and command output. Setup and tests must
  not modify a production database. Deployments, destructive data operations,
  and external messages require authorization covering that action; carry forward
  authorization already given in the conversation.

## Setup and verification

- `pnpm setup:codex`: prepare dependencies and the Prisma client for a checkout/worktree.
- `pnpm dev`: start development after configuring the local database and owner.
- `pnpm check`: formatting, ESLint, TypeScript, and Vitest.
- `pnpm build`: generate the Prisma client and build the standalone application.
- `pnpm test src/lib/local-date.test.ts`: example of a focused regression check.

Run `pnpm check` and `pnpm build` before handing off code or runnable configuration
changes. Add meaningful regression tests for changed behavior; do not create tests
that merely duplicate implementation or prose. For documentation-only changes,
check the changed files' formatting and links. Do not invent an E2E command:
`test:e2e` is planned but is not currently a package script.

For UI changes, inspect the affected flow at mobile and desktop sizes when a
working local app/browser is available. Distinguish checks actually run from
checks blocked by missing services. If a check fails in unrelated existing work,
report the file and failure without silently rewriting that work. Once relevant
checks pass, do not repeat or broaden them without new evidence.

## Code Review Rules

Prioritize reproducible regressions in session checks, owner scoping, related
record ownership, timezone boundaries, idempotency, and migration compatibility.
Include a concrete trigger, impact, and file/line for each finding. Check client
and server behavior together when reviewing UI mutations. Leave formatting to
the formatter; distinguish verified defects from missing validation evidence.
