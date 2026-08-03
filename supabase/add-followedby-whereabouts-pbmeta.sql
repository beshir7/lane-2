-- ---------------------------------------------------------------------------
-- Migration — columns added after the first schema.sql release.
-- Safe to re-run. Skip it if you have just created the database from the
-- current schema.sql, which already contains these columns.
--
--   competitions.followed_by  who from the agency follows the competition
--   athletes.pb_meta          where each personal best was set (links to a competition)
--   athletes.whereabouts      anti-doping address + availability window
-- ---------------------------------------------------------------------------

alter table public.competitions
  add column if not exists followed_by text;

alter table public.athletes
  add column if not exists pb_meta     jsonb not null default '{}'::jsonb,
  add column if not exists whereabouts jsonb;

create index if not exists idx_competitions_followed_by on public.competitions(followed_by);
