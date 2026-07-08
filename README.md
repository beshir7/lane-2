# Lane 2 — Athlete Management System (Next.js)

A full rebuild of the Lane 2 AMS prototype in **Next.js 14 (App Router) + TypeScript**, with real routing, typed domain models, a global state provider, and a working REST API.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
# or
npm run build && npm run start
```

## What's inside

### Routes (App Router)
| Path | Screen |
| --- | --- |
| `/dashboard` | KPIs, performance/medal charts, upcoming comps, activity, alerts |
| `/athletes` · `/athletes/[id]` | Roster (table/cards, filter, sort, select) · profile with 6 tabs |
| `/competitions` · `/competitions/[id]` | List/cards + create · detail with entries/results/schedule/travel |
| `/calendar` | Month / Week / Day views, drag-to-reschedule, conflict detection |
| `/documents` | Category library, grid/list, drag-drop upload, preview |
| `/cms` | Posts table + rich-editor drawer |
| `/notifications` | Notification center |
| `/settings` · `/rbac` | General, Members, RBAC matrix, Security, Sessions, Audit, Billing |
| `/design-system` | Living token + component showcase |

Auth (login / signup / forgot / 2FA) shows when signed out — toggle via the ✦ tweaks panel → "Show auth flow".

### API endpoints (`app/api/*`)
- `GET/POST /api/athletes`, `GET/PATCH/DELETE /api/athletes/:id`
- `GET/POST /api/competitions`, `GET/PATCH/DELETE /api/competitions/:id`
- `GET/POST /api/competitions/:id/results`
- `GET/POST /api/events`, `PATCH/DELETE /api/events/:id`
- `GET/POST /api/documents`
- `GET/PATCH /api/notifications` (`{"action":"mark-all-read"}`)
- `GET /api/roles`, `GET/POST /api/users`, `GET /api/activity`

Data is seeded from `lib/data.ts` into an in-memory store (`lib/store.ts`) — swap that layer for a database in production.

### Architecture
- **`lib/types.ts`** — all domain types (`Athlete`, `Competition`, `CalendarEvent`, `Result`, `LaneDocument`, `Role`, …).
- **`components/lane-provider.tsx`** — global state (athletes/competitions/events/results/notifications), CRUD that persists to the API, tweaks (theme/accent/sidebar) with `localStorage`, and a `navigate()` helper mapped to Next routes.
- **`components/*`** — `icon`, `primitives` (Avatar, Badge, Modal, Drawer, Toasts, KPI, Sparkline, Tabs…), `sidebar`, `topbar`, `command-palette` (⌘K), `tweaks-panel`, `shared` helpers.
- **`app/globals.css`** — the full Lane 2 design system (dark-first, light theme, electric-indigo accent), fonts wired to `next/font` (Archivo / Inter / JetBrains Mono).
