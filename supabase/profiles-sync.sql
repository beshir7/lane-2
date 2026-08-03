-- ---------------------------------------------------------------------------
-- Make real accounts visible in the app (Settings → Members).
--
-- Accounts live in `auth.users`, which the browser cannot read — that table is
-- only reachable with the service_role key, which must never ship to a client.
-- So we mirror the parts we need into `public.profiles`:
--
--   * a trigger copies every NEW signup into profiles automatically
--   * a backfill brings across everyone who signed up before this ran
--   * profile changes made in Settings → Profile flow back in
--
-- `members` keeps its existing job: people invited by email who have not
-- registered yet. Once they sign up, a profile appears and the app shows them
-- as active instead of invited.
--
-- Safe to re-run.
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  first_name  text,
  last_name   text,
  title       text,
  color       text default '#5b6ef5',
  created_at  timestamptz not null default now(),
  last_seen   timestamptz
);

-- ---- Copy each new signup in -----------------------------------------------
-- SECURITY DEFINER so the trigger can write to public.profiles while running in
-- the auth schema's context.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, first_name, last_name, title, color)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    new.raw_user_meta_data ->> 'title',
    coalesce(new.raw_user_meta_data ->> 'color', '#5b6ef5')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep the mirror current when someone edits their profile (Settings → Profile
-- writes to user_metadata, which lands in auth.users).
create or replace function public.handle_user_updated()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
     set email      = new.email,
         first_name = coalesce(new.raw_user_meta_data ->> 'first_name', first_name),
         last_name  = coalesce(new.raw_user_meta_data ->> 'last_name', last_name),
         title      = coalesce(new.raw_user_meta_data ->> 'title', title),
         color      = coalesce(new.raw_user_meta_data ->> 'color', color)
   where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update on auth.users
  for each row execute function public.handle_user_updated();

-- ---- Backfill everyone who already signed up -------------------------------
insert into public.profiles (id, email, first_name, last_name, title, color, created_at)
select
  u.id,
  u.email,
  u.raw_user_meta_data ->> 'first_name',
  u.raw_user_meta_data ->> 'last_name',
  u.raw_user_meta_data ->> 'title',
  coalesce(u.raw_user_meta_data ->> 'color', '#5b6ef5'),
  u.created_at
from auth.users u
on conflict (id) do nothing;

-- ---- Access ----------------------------------------------------------------
-- Shared workspace: every member can see every member. A member may only edit
-- their own row (the "last seen" stamp), and nobody can insert or delete —
-- those come from the auth triggers, so the list cannot drift from reality.
alter table public.profiles enable row level security;

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles
  for select to authenticated using (true);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create index if not exists idx_profiles_email on public.profiles(email);

-- ---- Confirm ---------------------------------------------------------------
select id, email, first_name, last_name, created_at, last_seen
from public.profiles
order by created_at;
