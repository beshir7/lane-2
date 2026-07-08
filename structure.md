# Lane 2 — Architecture & Structure

A feature-driven (domain-oriented) Next.js 14 application. This document explains
**every folder**, the **layering rules** that keep it scalable, and the **data
flow** from a button click to the datastore and back.

---

## 1. Stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js 14 (**App Router**) |
| Language | TypeScript (strict) |
| UI | React 18, hand-rolled design system in `app/globals.css` |
| Fonts | `next/font/google` (Archivo / Inter / JetBrains Mono) bound to CSS variables |
| State | React Context (`useLane`) — single client source of truth |
| Data (now) | In-memory store in `services/db.ts` (survives HMR via `globalThis`) |
| Data (planned) | PostgreSQL on Supabase/Neon — schema in [`db/schema.sql`](./db/schema.sql) |
| Server guards | `server-only` (reads) and `"use server"` (writes) |

---

## 2. Architectural principles

1. **One-way dependency flow.** `app` → `features` → `services` → `lib`.
   A screen can import a feature action; a feature can read the datastore; the
   datastore never imports upward. Nothing skips a layer.
2. **The `services/` seam is the only place that owns data.** Swapping the
   in-memory store for Postgres is a change in *one directory*; no feature,
   route, or component is touched.
3. **The server/client boundary is enforced by the compiler, not by discipline.**
   Server reads `import "server-only"` (importing them into a client bundle is a
   *build error*). Client screens are marked `"use client"`. No seed/sample data
   can leak into a page bundle.
4. **Single source of truth on the client.** All collections live in
   `useLane()`. No screen holds its own copy of domain data or imports seed data.
5. **Features are self-contained slices.** Each domain owns its UI, its reads,
   its writes, and its types. Teams can work in parallel without collisions.

---

## 3. Directory map

```
lams-next/
├── app/                      # Routing layer only — thin, no business logic
│   ├── layout.tsx            # Root: fonts + globals.css + providers
│   ├── globals.css           # The entire design system (ported from Lane/)
│   ├── (pages)/              # Route group: the authenticated app (no URL segment)
│   │   ├── layout.tsx        # Wraps every page in <AppShell> (sidebar/topbar)
│   │   ├── page.tsx          # "/" → redirects to /dashboard
│   │   ├── dashboard/page.tsx
│   │   ├── athletes/page.tsx
│   │   ├── athletes/[id]/page.tsx
│   │   ├── competitions/page.tsx
│   │   ├── competitions/[id]/page.tsx
│   │   ├── calendar/page.tsx
│   │   ├── documents/page.tsx
│   │   ├── cms/page.tsx
│   │   ├── notifications/page.tsx
│   │   ├── settings/page.tsx
│   │   ├── role/page.tsx     # RBAC (renders Settings' roles tab)
│   │   └── design-system/page.tsx
│   ├── (auth)/               # Route group: unauthenticated screens (no shell)
│   │   ├── signin/page.tsx
│   │   └── signup/page.tsx
│   └── api/                  # REST surface — thin handlers over feature logic
│       ├── athletes/route.ts, athletes/[id]/route.ts
│       ├── competitions/route.ts, [id]/route.ts, [id]/results/route.ts
│       ├── events/…, documents/…, notifications/…, users/…, posts/…
│       └── roles/, activity/, audit/, sessions/
│
├── features/                 # Domain modules (the heart of the app)
│   └── <domain>/
│       ├── components/        # The screens & modals for this domain ("use client")
│       ├── queries.ts         # Server-side READS ("server-only")
│       └── actions.ts         # Server-side WRITES ("use server")
│   # Domain types are NOT per-feature — they live in the single global
│   # catalogue lib/types.ts (see §4). domains: athletes, competitions,
│   # calendar, documents, cms, notifications, settings, dashboard,
│   # auth, design-system
│
├── services/                 # Core backend / data-access layer
│   ├── db.ts                 # THE datastore + generic collection helpers + rid()
│   ├── seed.ts               # Initial dataset ("server-only")
│   └── externalApi.ts        # Typed client → the REST API (the browser's only fetch)
│
├── lib/                      # Framework plumbing & shared, cross-cutting config
│   ├── http.ts               # route() handler factory + HttpError/notFound/badRequest
│   ├── types.ts              # Shared domain types (the canonical catalogue)
│   ├── reference.ts          # Static, client-safe config (disciplines, roles, perms…)
│   └── supabase.ts           # Placeholder for the future Postgres client
│
├── utils/                    # Pure, framework-agnostic helpers
│   └── index.ts              # formatHour, downloadCsv, pickFiles, initialsOf, …
│
├── components/               # Cross-feature UI only (owned by no single domain)
│   ├── app-shell.tsx         # Auth gate + loading gate + sidebar/topbar frame
│   ├── sidebar.tsx, topbar.tsx
│   ├── command-palette.tsx, tweaks-panel.tsx
│   ├── primitives.tsx        # Button/Badge/Modal/Avatar/Toast… design-system atoms
│   ├── icon.tsx, shared.tsx
│   └── lane-provider.tsx     # useLane() — the client single source of truth
│
├── db/                       # Canonical Postgres schema (ORM-agnostic)
│   ├── schema.sql
│   └── README.md
│
├── structure.md              # ← this file
└── (config) next.config.mjs, tsconfig.json, package.json
```

---

## 4. Layer responsibilities

### `app/` — routing only
Every `page.tsx` is a few lines: import a screen from a feature and render it,
passing route params. Route handlers in `app/api/*` are equally thin — they call
a feature query/action through the `route()` helper. **No business logic lives
in `app/.**

Route groups `(pages)` and `(auth)` are folders whose names are wrapped in
parentheses, so they organize files **without** adding a URL segment
(`/settings`, not `/pages/settings`). `(pages)` carries the `AppShell` layout;
`(auth)` renders bare login screens.

> App Router rule: a route exists only where a file is literally named
> `page.tsx`. That's why every route is a folder — it's the framework's
> requirement, not a preference.

### `features/<domain>/` — the domain slices
The anatomy of every feature:

| File | Runs on | Purpose |
| --- | --- | --- |
| `components/` | client | The screens/modals. Consume `useLane()`; never import seed data. |
| `queries.ts` | server (`server-only`) | Reads: `listAthletes()`, `getAthlete(id)`. Called by API routes / RSC. |
| `actions.ts` | server (`"use server"`) | Writes: `createAthlete()`, `updateAthlete()`. Callable as Server Actions or via the REST layer. (Read-only domains like `dashboard` have no `actions.ts`.) |

The old monolithic repository was split into these per-domain `queries`/`actions`.

**Types are global, not per-feature.** Every domain type lives in the single
catalogue `lib/types.ts`. It sits in `lib/` (below every layer) so `services/`,
`features/`, and `components/` can all depend on it without inverting the
one-way dependency flow — a `features/types.ts` would force `services/db.ts` to
import *upward*, which the architecture forbids.

### `services/` — data access
- `db.ts` is the **single owner of state**. It exposes the collections plus
  generic helpers (`findById`, `requireById`, `patchById`, `removeById`) so
  features stay tiny. This is the file that becomes a Postgres adapter.
- `seed.ts` is the initial data (`server-only`).
- `externalApi.ts` is the **client's only doorway to the backend** — a typed
  `api.athletes.list()` wrapper over `fetch`. Components never call `fetch`
  directly.

### `lib/` — plumbing & config
`http.ts` (the `route()` factory + typed HTTP errors), `types.ts` (canonical
types), `reference.ts` (static domain vocabulary safe for the client), and
`supabase.ts` (reserved). No feature-specific logic.

### `utils/` — pure helpers
Deterministic functions with no framework or domain knowledge.

### `components/` — cross-feature UI
Only chrome that belongs to no single domain lives here (shell, nav, design-system
primitives, the provider). A domain-specific component belongs in that feature's
`components/`.

---

## 5. Data flow

### Read (hydrate)
```
LaneProvider mounts
  → services/externalApi (api.athletes.list())
    → GET /app/api/athletes/route.ts   (thin, via route())
      → features/athletes/queries.listAthletes()
        → services/db.ts               (in-memory today, Postgres later)
  ← collections land in useLane() → screens render
```

### Write (optimistic)
```
Screen calls useLane().createAthlete(data)
  → provider updates local state immediately (optimistic)
  → api.athletes.create(data)
    → POST /app/api/athletes/route.ts
      → features/athletes/actions.createAthlete()  (normalizes + persists)
        → services/db.ts
  ← saved record reconciles the optimistic entry
```

Because every read and write funnels through `services/db.ts`, replacing the
store with Postgres changes nothing above it.

---

## 6. Conventions

- **Imports** use the `@/` alias (`@/features/...`, `@/services/db`,
  `@/components/...`). Relative `../` imports across layers are avoided.
- **Server vs client:** put `import "server-only"` at the top of any read module;
  `"use server"` at the top of any write module; `"use client"` on interactive
  components.
- **Naming:** components `PascalCase`, files `kebab-case`, DB columns
  `snake_case`, TS fields `camelCase` (mapping happens at the data boundary).
- **No data in components.** If a screen needs domain data, it comes from
  `useLane()`; static config comes from `lib/reference.ts`.

---

## 7. Adding a new feature (checklist)

1. `lib/types.ts` — add the domain's types to the global catalogue.
2. `features/<name>/queries.ts` — `server-only` reads from `services/db`.
3. `features/<name>/actions.ts` — `"use server"` writes.
4. `app/api/<name>/route.ts` — wire the `route()` handler to the above.
5. `services/externalApi.ts` — add the typed client methods.
6. `components/lane-provider.tsx` — add state + optimistic CRUD if it's shared.
7. `features/<name>/components/<name>-screen.tsx` — the UI (`"use client"`).
8. `app/(pages)/<name>/page.tsx` — render the screen.
9. `db/schema.sql` — add the table(s) if it needs persistence.

---

## 8. Roadmap (deferred, tracked)

The **architecture** is production-shaped; these production **concerns** are
intentionally staged next:

- **Persistence:** implement the Postgres adapter in `services/db.ts` against
  `db/schema.sql`; select it by `DATABASE_URL` (in-memory stays the default
  until then).
- **Auth:** real sessions + a `middleware.ts` gate + per-request user context in
  the route layer (every `/api/*` route is currently open).
- **Validation:** a Zod schema at each route boundary (`readJson` is `any` today).
- **Error handling:** roll back optimistic updates and surface failures instead
  of the current swallowed `.catch()`.
- **Scale:** cursor pagination/filtering baked into the query signatures.
- **Quality:** Vitest on `features/*/actions`, a Playwright smoke test, and CI
  running `build` + `lint` + tests.
