-- =========================================================================
-- LAMS schema — one table per core entity used across the pages.
-- Every row is owned by a user (user_id -> auth.users). Row-Level Security
-- makes each user able to see/modify ONLY their own rows: even with a known id,
-- another user's rows are invisible. Run this first in the Supabase SQL editor.
--
-- Date-like fields are stored as text because the app uses ISO strings ("2024-07-04")
-- everywhere; nested/array fields use jsonb to round-trip the app's objects exactly.
-- =========================================================================

-- ---- ATHLETES -----------------------------------------------------------
create table if not exists public.athletes (
  id             text primary key,
  user_id        uuid not null references auth.users(id) on delete cascade,
  first          text not null default '',
  last           text not null default '',
  initials       text default '',
  color          text default '#5b6ef5',
  nationality    text default '',
  dob            text default '',
  age            integer default 0,
  gender         text default '',
  specialty      text default '',
  category       text default '',
  squad          text default '',
  status         text default 'active',
  disciplines    jsonb default '[]'::jsonb,
  joined         text default '',
  pb             jsonb default '{}'::jsonb,
  medals         jsonb default '{"gold":0,"silver":0,"bronze":0}'::jsonb,
  next_event     text default '',
  coach          text default '',
  progress       integer default 50,
  bio            text default '',
  contact        jsonb default '{"email":"","phone":""}'::jsonb,
  email          text default '',
  contract       text,
  place_of_birth text,
  residence      text,
  marital_status text,
  employment     text,
  tax_code       text,
  fidal_number   text,
  club           text,
  height         numeric,
  height_unit    text,
  weight         numeric,
  weight_unit    text,
  sponsor        text,
  shoe_size      text,
  clothing_size  text,
  created_at     timestamptz not null default now()
);

-- ---- ORGANIZERS ---------------------------------------------------------
create table if not exists public.organizers (
  id         text primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null default '',
  first_name text,
  last_name  text,
  email      text default '',
  phone      text default '',
  nation     text default '',
  created_at timestamptz not null default now()
);

-- ---- COMPETITIONS -------------------------------------------------------
create table if not exists public.competitions (
  id              text primary key,
  user_id         uuid not null references auth.users(id) on delete cascade,
  name            text not null default '',
  short           text default '',
  location        text default '',
  country         text default '',
  date            text default '',
  end_date        text default '',
  type            text default '',
  tier            text default 'tier-2',
  status          text default 'upcoming',
  entries         integer default 0,
  results         integer default 0,
  events          jsonb default '[]'::jsonb,
  summary         jsonb,
  category        text,
  level           text,
  organizer_id    text references public.organizers(id) on delete set null,
  contact_surname text,
  contact_name    text,
  contact_phone   text,
  contact_email   text,
  disciplines     jsonb default '[]'::jsonb,
  web_site        text,
  notes           text,
  created_at      timestamptz not null default now()
);

-- ---- RACE ENTRIES -------------------------------------------------------
create table if not exists public.race_entries (
  id             text primary key,
  user_id        uuid not null references auth.users(id) on delete cascade,
  competition_id text not null references public.competitions(id) on delete cascade,
  athlete_id     text not null references public.athletes(id) on delete cascade,
  discipline     text default '',
  gender         text default 'M',
  status         text default 'proposed',
  position       integer,
  time           text,
  wind           text,
  note           text,
  created_at     timestamptz not null default now()
);

-- ---- VISAS --------------------------------------------------------------
create table if not exists public.visas (
  id                  text primary key,
  user_id             uuid not null references auth.users(id) on delete cascade,
  athlete_id          text not null references public.athletes(id) on delete cascade,
  kind                text default 'Other',
  number              text,
  type                text default '',
  event               text,
  valid_from          text default '',
  valid_to            text default '',
  not_known           boolean default false,
  embassy             text default '',
  sent_to_federation  boolean default false,
  sent_to_agent       boolean default false,
  appointment         text,
  archived            boolean default false,
  photo               text,
  note                text,
  created_at          timestamptz not null default now()
);

-- ---- PASSPORTS ----------------------------------------------------------
create table if not exists public.passports (
  id         text primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  athlete_id text not null references public.athletes(id) on delete cascade,
  number     text default '',
  nation     text default '',
  issued     text default '',
  expiry     text default '',
  photo      text,
  note       text,
  created_at timestamptz not null default now()
);

-- ---- CALENDAR EVENTS ----------------------------------------------------
create table if not exists public.calendar_events (
  id             text primary key,
  user_id        uuid not null references auth.users(id) on delete cascade,
  title          text default '',
  category       text default 'training',
  date           text default '',
  start_hour     numeric default 9,
  duration       numeric default 1.5,
  athletes       jsonb default '[]'::jsonb,
  location       text default '',
  competition_id text,
  created_at     timestamptz not null default now()
);

-- ---- DOCUMENTS ----------------------------------------------------------
create table if not exists public.documents (
  id         text primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text default '',
  type       text default 'pdf',
  category   text default 'media',
  size       text default '',
  athlete_id text,
  uploaded   text default '',
  expires    text,
  icon       text default 'fileText',
  created_at timestamptz not null default now()
);

-- ---- Helpful indexes (RLS filters + foreign keys) -----------------------
create index if not exists idx_athletes_user        on public.athletes(user_id);
create index if not exists idx_organizers_user       on public.organizers(user_id);
create index if not exists idx_competitions_user     on public.competitions(user_id);
create index if not exists idx_entries_user          on public.race_entries(user_id);
create index if not exists idx_entries_competition   on public.race_entries(competition_id);
create index if not exists idx_entries_athlete       on public.race_entries(athlete_id);
create index if not exists idx_visas_user            on public.visas(user_id);
create index if not exists idx_visas_athlete         on public.visas(athlete_id);
create index if not exists idx_passports_user        on public.passports(user_id);
create index if not exists idx_passports_athlete     on public.passports(athlete_id);
create index if not exists idx_events_user           on public.calendar_events(user_id);
create index if not exists idx_documents_user        on public.documents(user_id);

-- =========================================================================
-- Row-Level Security: a user can touch ONLY rows where user_id = auth.uid().
-- One "for all" policy per table covers select/insert/update/delete.
-- =========================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'athletes','organizers','competitions','race_entries',
    'visas','passports','calendar_events','documents'
  ]
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists own_rows on public.%I;', t);
    execute format(
      'create policy own_rows on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());',
      t
    );
  end loop;
end $$;
