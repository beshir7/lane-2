-- ---------------------------------------------------------------------------
-- Switch from per-user workspaces to ONE shared workspace.
--
-- Before: every table's RLS policy was `user_id = auth.uid()`, so each account
--         saw only the rows it had created — two colleagues signing up got two
--         separate, empty databases.
-- After:  any signed-in account can read and write every row. One agency, one
--         dataset, every member an admin.
--
-- `user_id` is KEPT on every table, but it now records WHO CREATED the row
-- rather than who may see it. That history is worth having, and it costs
-- nothing.
--
-- NOTE ON ACCESS: with this applied, anyone who can sign up can read and write
-- everything — athletes, passports, visas, medical documents, contracts. If you
-- want to close that, turn off Authentication → Providers → Email → "Allow new
-- users to sign up" in the Supabase dashboard and create accounts yourself.
--
-- Safe to re-run.
-- ---------------------------------------------------------------------------

-- 1. Deleting a member must not delete the agency's data --------------------
-- `user_id` was `not null references auth.users(id) on delete cascade`. In a
-- shared workspace that is a trap: removing the colleague who happened to
-- create the athletes would cascade-delete all of them. Rows now survive their
-- creator, with user_id going null.
do $$
declare
  t text;
  fk text;
begin
  foreach t in array array[
    'athletes','organizers','competitions','race_entries',
    'visas','passports','calendar_events','documents'
  ]
  loop
    -- Drop whatever the user_id foreign key is currently called.
    select conname into fk
      from pg_constraint
     where conrelid = format('public.%I', t)::regclass
       and contype = 'f'
       and conkey = array[(
         select attnum from pg_attribute
          where attrelid = format('public.%I', t)::regclass and attname = 'user_id'
       )::smallint];

    if fk is not null then
      execute format('alter table public.%I drop constraint %I;', t, fk);
    end if;

    execute format('alter table public.%I alter column user_id drop not null;', t);
    execute format(
      'alter table public.%I add constraint %I foreign key (user_id) references auth.users(id) on delete set null;',
      t, t || '_user_id_fkey'
    );
  end loop;
end $$;

-- 2. One shared workspace ---------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'athletes','organizers','competitions','race_entries',
    'visas','passports','calendar_events','documents'
  ]
  loop
    execute format('alter table public.%I enable row level security;', t);
    -- Remove the old per-user isolation.
    execute format('drop policy if exists own_rows on public.%I;', t);
    execute format('drop policy if exists shared_workspace on public.%I;', t);
    -- Any signed-in member, full access. Anonymous callers still get nothing:
    -- the policy is granted `to authenticated` only.
    execute format(
      'create policy shared_workspace on public.%I for all to authenticated using (true) with check (true);',
      t
    );
  end loop;
end $$;

-- 3. The settings tables too --------------------------------------------------
-- workspace_settings / members / roles were also per-user, which would leave
-- the org name, the member list and the role definitions private to whoever
-- created them. They are optional (added by the settings schema), so this only
-- touches the ones that exist.
do $$
declare t text;
begin
  foreach t in array array['workspace_settings','members','roles']
  loop
    if to_regclass(format('public.%I', t)) is not null then
      execute format('alter table public.%I enable row level security;', t);
      execute format('drop policy if exists own_rows on public.%I;', t);
      execute format('drop policy if exists shared_workspace on public.%I;', t);
      execute format(
        'create policy shared_workspace on public.%I for all to authenticated using (true) with check (true);',
        t
      );
    end if;
  end loop;
end $$;

-- 4. Confirm ----------------------------------------------------------------
select tablename, policyname, roles, cmd, qual
from pg_policies
where schemaname = 'public'
order by tablename;
