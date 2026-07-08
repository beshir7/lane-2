-- =========================================================================
-- Lane 2 — Athlete Management System
-- Canonical PostgreSQL schema (ORM-agnostic source of truth)
--
-- Target: PostgreSQL 15+ (Supabase or Neon).
-- The application currently runs on an in-memory store (services/db.ts). This
-- file is the schema that store models, and the DDL we will `migrate` to once
-- an ORM (Prisma or Drizzle) and a database are chosen. Keep it in sync with
-- lib/types.ts — it is the contract both sides agree on.
--
-- Conventions:
--   * UUID primary keys (gen_random_uuid); the demo's short ids (a01, c01…)
--     are seed-only and do not appear here.
--   * snake_case columns; camelCase happens only at the app boundary.
--   * timestamptz for real timestamps; a few *display* strings in the current
--     prototype (document.size, user.last_active) are flagged for tightening.
--   * Derived values are NOT stored: athlete age (from dob), competition
--     result count (count of results rows) — compute them in queries.
-- =========================================================================

create extension if not exists pgcrypto;   -- gen_random_uuid()

-- ---- Enumerated domains --------------------------------------------------
create type gender              as enum ('F', 'M');
create type athlete_status      as enum ('active', 'injury', 'pregnant', 'inactive');
create type contract_tag        as enum ('E', 'M');   -- (E) Eric, (M) Monica; null = none
create type event_category      as enum ('sprints', 'middle', 'long', 'hurdles', 'jumps', 'throws', 'relays');
create type competition_status  as enum ('upcoming', 'live', 'completed');
create type competition_tier    as enum ('tier-1', 'tier-2', 'tier-3');
create type race_category       as enum ('marathon', 'half-marathon', 'road', 'cross', 'meeting', 'indoor');
create type calendar_category   as enum ('training', 'competition', 'travel', 'meeting');
create type doc_type            as enum ('pdf', 'image', 'doc');
create type notification_type   as enum ('alert', 'info', 'warn');
create type post_status         as enum ('published', 'draft', 'scheduled');
create type visa_kind           as enum ('Schengen', 'UK', 'US', 'Other');
create type entry_status        as enum ('proposed', 'waiting', 'accepted', 'ok');
create type meeting_gender      as enum ('M', 'W');   -- disciplines are split men/women

-- ---- updated_at trigger helper ------------------------------------------
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- =========================================================================
-- RBAC: roles, the permission catalogue, and their mapping
-- =========================================================================
create table roles (
  id          text primary key,                     -- 'r-admin', 'r-coach', 'r-manager', 'r-readonly'
  name        text        not null,
  description text        not null default '',
  color       text        not null default 'var(--accent)',
  created_at  timestamptz not null default now()
);

create table permissions (
  id          text primary key,                     -- 'athletes.view', 'comp.results', …
  label       text not null,
  group_label text not null                          -- 'Athletes', 'Competitions', 'Administration', …
);

create table role_permissions (
  role_id       text references roles(id)       on delete cascade,
  permission_id text references permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

-- =========================================================================
-- Team members
-- =========================================================================
create table users (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null unique,
  role_id     text not null references roles(id),
  initials    text not null default '',
  color       text not null default '#5b6ef5',
  active      boolean not null default true,
  last_active text not null default 'Invited',       -- TODO: prefer timestamptz once auth tracks real activity
  created_at  timestamptz not null default now()
);
create index users_role_idx on users (role_id);

-- =========================================================================
-- Athletes
-- =========================================================================
create table athletes (
  id            uuid primary key default gen_random_uuid(),
  first_name    text not null,
  last_name     text not null,
  initials      text not null default '',
  color         text not null default '#5b6ef5',
  nationality   text not null default '',
  dob           date,                                 -- age is derived, never stored
  gender        gender not null default 'F',
  specialty     text not null default '',
  disciplines   text[] not null default '{}',            -- "Seleziona discipline" (photo_32)
  category      event_category not null default 'sprints',
  squad         text not null default 'Senior B',
  status        athlete_status not null default 'active',
  contract      contract_tag,                          -- (E) Eric / (M) Monica / null
  coach         text not null default '',
  progress      smallint not null default 50 check (progress between 0 and 100),
  bio           text not null default '',
  email         text not null default '',
  phone         text not null default '',
  -- Agency fields (distance-runner management)
  place_of_birth text not null default '',
  residence     text not null default '',
  marital_status text not null default '',
  employment    text not null default '',
  tax_code      text not null default '',
  fidal_number  text not null default '',
  club          text not null default '',
  height_cm     smallint,
  weight_kg     smallint,
  sponsor       text not null default '',
  shoe_size     text not null default '',
  clothing_size text not null default '',
  personal_bests jsonb not null default '{}'::jsonb,  -- { "100m": "10.92", "200m": "22.18" }
  medals_gold   smallint not null default 0,
  medals_silver smallint not null default 0,
  medals_bronze smallint not null default 0,
  next_event    text not null default '—',
  joined        date not null default current_date,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index athletes_status_idx   on athletes (status);
create index athletes_category_idx on athletes (category);
create trigger athletes_set_updated before update on athletes
  for each row execute function set_updated_at();

-- =========================================================================
-- Passports & visas — travel documents per athlete (expiry tracking)
-- =========================================================================
create table passports (
  id         uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references athletes(id) on delete cascade,
  number     text not null,
  nation     text not null default '',
  issued     date,
  expiry     date,
  photo      text,                              -- scanned image (data URL / storage key)
  note       text not null default '',
  created_at timestamptz not null default now()
);
create index passports_athlete_idx on passports (athlete_id);
create index passports_expiry_idx  on passports (expiry);

create table visas (
  id                  uuid primary key default gen_random_uuid(),
  athlete_id          uuid not null references athletes(id) on delete cascade,
  kind                visa_kind not null default 'Other',   -- Schengen | UK | US | Other
  number              text not null default '',              -- visa number (photo_29 "Numero")
  type                text not null default '',              -- "Schengen M90", "US B1/B2", …
  event               text not null default '',              -- "Road", "Meeting", …
  valid_from          date,
  valid_to            date,
  not_known           boolean not null default false,        -- "Dato non conosciuto"
  embassy             text not null default '',              -- issuing embassy nationality
  sent_to_federation  boolean not null default false,        -- "Spedito a federazione"
  sent_to_agent       boolean not null default false,        -- "Spedito a Sangita o Gemedu"
  appointment         date,                                  -- "Appuntamento" (embassy appt.)
  archived            boolean not null default false,        -- "Archivia"
  photo               text,                                  -- scanned image (data URL / storage key)
  note                text not null default '',
  created_at          timestamptz not null default now()
);
create index visas_athlete_idx on visas (athlete_id);
create index visas_kind_idx    on visas (kind);
create index visas_valid_to_idx on visas (valid_to);

-- =========================================================================
-- Race organizers
-- =========================================================================
create table organizers (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text not null default '',
  phone      text not null default '',
  nation     text not null default '',
  created_at timestamptz not null default now()
);

-- =========================================================================
-- Competitions & results
-- =========================================================================
create table competitions (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  short      text not null default '',
  location   text not null default '',
  country    text not null default '',
  start_date date not null,
  end_date   date not null,
  type       text not null default 'Diamond League',
  tier       competition_tier not null default 'tier-1',
  status     competition_status not null default 'upcoming',
  entries    integer not null default 0,             -- planned entrants; result count is derived
  events     text[] not null default '{}',
  summary    jsonb,                                   -- { gold, silver, bronze, points } | null
  -- Agency / meeting fields
  race_category race_category,                        -- marathon | half-marathon | road | cross | meeting | indoor
  level      text not null default '',                -- "DL", "Gold", "Silver", "Bronze", "Label", "int'l", "national"
  organizer_id uuid references organizers(id) on delete set null,
  web_site   text not null default '',
  notes      text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index competitions_status_idx on competitions (status);
create index competitions_start_idx  on competitions (start_date);
create trigger competitions_set_updated before update on competitions
  for each row execute function set_updated_at();

create table results (
  id             uuid primary key default gen_random_uuid(),
  competition_id uuid not null references competitions(id) on delete cascade,
  athlete_id     uuid references athletes(id) on delete set null,
  event          text not null,
  mark           text not null default '',
  place          smallint not null default 1,
  points         smallint not null default 0,
  wind           text not null default '',
  note           text not null default '',
  created_at     timestamptz not null default now()
);
create index results_competition_idx on results (competition_id);
create index results_athlete_idx     on results (athlete_id);

-- Disciplines offered at a meeting (split by gender, dated).
create table meeting_disciplines (
  id             uuid primary key default gen_random_uuid(),
  competition_id uuid not null references competitions(id) on delete cascade,
  discipline     text not null,                 -- "100m", "Marathon", "10Km", …
  gender         meeting_gender not null,        -- M | W
  event_date     date,
  unique (competition_id, discipline, gender)
);
create index meeting_disciplines_comp_idx on meeting_disciplines (competition_id);

-- One athlete entered into one discipline of one competition, with pipeline
-- status (proposed → waiting → accepted → ok) and, once run, a result.
create table race_entries (
  id             uuid primary key default gen_random_uuid(),
  competition_id uuid not null references competitions(id) on delete cascade,
  athlete_id     uuid not null references athletes(id) on delete cascade,
  discipline     text not null,
  gender         meeting_gender not null,
  status         entry_status not null default 'proposed',
  position       smallint,
  time           text not null default '',
  wind           text not null default '',
  note           text not null default '',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (competition_id, athlete_id, discipline)
);
create index race_entries_comp_idx    on race_entries (competition_id);
create index race_entries_athlete_idx on race_entries (athlete_id);
create index race_entries_status_idx  on race_entries (status);
create trigger race_entries_set_updated before update on race_entries
  for each row execute function set_updated_at();

-- =========================================================================
-- Calendar events (many-to-many with athletes)
-- =========================================================================
create table calendar_events (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,
  category       calendar_category not null default 'training',
  event_date     date not null,
  start_hour     numeric(4,2) not null default 9,     -- 7.5 => 07:30
  duration       numeric(4,2) not null default 1.5,   -- hours
  location       text not null default '',
  competition_id uuid references competitions(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index calendar_events_date_idx on calendar_events (event_date);
create trigger calendar_events_set_updated before update on calendar_events
  for each row execute function set_updated_at();

create table event_athletes (
  event_id   uuid references calendar_events(id) on delete cascade,
  athlete_id uuid references athletes(id)        on delete cascade,
  primary key (event_id, athlete_id)
);

-- =========================================================================
-- Documents
-- =========================================================================
create table documents (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  type       doc_type not null default 'pdf',
  icon       text not null default 'filePdf',
  category   text not null default 'media',
  size       text not null default '',               -- TODO: store bytes bigint; display-format at the edge
  athlete_id uuid references athletes(id) on delete set null,
  uploaded   date not null default current_date,
  expires    date,
  created_at timestamptz not null default now()
);
create index documents_category_idx on documents (category);
create index documents_athlete_idx  on documents (athlete_id);

-- =========================================================================
-- Notifications, activity feed, CMS posts
-- =========================================================================
create table notifications (
  id         uuid primary key default gen_random_uuid(),
  type       notification_type not null default 'info',
  icon       text not null default 'bell',
  title      text not null,
  body       text not null default '',
  category   text not null default '',
  unread     boolean not null default true,
  created_at timestamptz not null default now()       -- 'time ago' label derived from this
);
create index notifications_unread_idx on notifications (unread);

create table activity (
  id         uuid primary key default gen_random_uuid(),
  actor      text not null,                           -- 'Marcus Bekele' or system actors like 'Lane System'
  initials   text not null default '',
  color      text not null default '#5b6ef5',
  action     text not null,
  target     text not null default '',
  icon       text not null default '',
  created_at timestamptz not null default now()
);
create index activity_created_idx on activity (created_at desc);

create table posts (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  status       post_status not null default 'draft',
  author       text not null default '',
  color        text not null default '#5b6ef5',
  category     text not null default 'News',
  body         text not null default '',
  views        integer not null default 0,
  published_at date,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index posts_status_idx on posts (status);
create trigger posts_set_updated before update on posts
  for each row execute function set_updated_at();

-- =========================================================================
-- Security: audit log & device sessions
-- =========================================================================
create table audit_log (
  id          uuid primary key default gen_random_uuid(),
  actor       text not null,
  actor_color text not null default '#5b6ef5',
  action      text not null,                          -- create | update | delete | login | upload | system
  variant     text not null default '',               -- UI badge variant (success | danger | info | '')
  target      text not null default '',
  ip          text not null default '',
  created_at  timestamptz not null default now()
);
create index audit_log_created_idx on audit_log (created_at desc);

create table device_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references users(id) on delete cascade,
  device      text not null,
  icon        text not null default 'desktop',
  location    text not null default '',
  is_current  boolean not null default false,
  last_active text not null default '',
  created_at  timestamptz not null default now()
);
create index device_sessions_user_idx on device_sessions (user_id);
