# `db/` — database schema

Canonical, **ORM-agnostic** data model for Lane 2. The app runs on an in-memory
store today (`services/db.ts`); this folder is the schema that store mirrors and
the DDL we migrate to when we provision Postgres.

## Files

| File | Purpose |
| --- | --- |
| `schema.sql` | The source-of-truth PostgreSQL DDL: enums, tables, FKs, indexes, `updated_at` triggers. Keep it in lockstep with [`lib/types.ts`](../lib/types.ts). |

## Status & plan

- **Now:** schema only. No ORM, no connection. The domain shapes here match
  `lib/types.ts`; the in-memory `services/db.ts` is the live implementation.
- **Next (deferred by choice):** pick an ORM (Prisma or Drizzle) and point it at
  Supabase/Neon. That ORM's schema is generated **from** this file, and
  `services/db.ts` gains a Postgres adapter selected by `DATABASE_URL`. The
  interface every feature calls (`queries.ts` / `actions.ts`) does **not**
  change — that's the whole point of the `services/` seam.

## Conventions

- **UUID** primary keys (`gen_random_uuid()`); the demo's `a01`/`c01` ids are
  seed-only and never appear in Postgres.
- **snake_case** columns; the app maps to camelCase only at the boundary.
- **Derived, never stored:** athlete age (from `dob`), a competition's result
  count (count of `results` rows), "time ago" labels (from `created_at`).
- A few prototype **display strings** (`documents.size`, `users.last_active`)
  are marked `TODO` for tightening to `bigint` / `timestamptz`.

## Applying it (later)

```bash
psql "$DATABASE_URL" -f db/schema.sql
```
