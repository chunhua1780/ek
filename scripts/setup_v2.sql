-- B777 v2: profiles + security questions + activity tracking + admin
-- Paste ALL of this into Supabase SQL Editor and Run. Safe to re-run.

-- admin check helper (reads app_metadata, which users CANNOT edit themselves)
create or replace function public.b777_is_admin() returns boolean
language sql stable as $$
  select coalesce((auth.jwt()->'app_metadata'->>'b777_admin')::boolean, false)
$$;

-- ── user profiles + hashed security answers ──
create table if not exists public.b777_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  staff_id text not null default '',
  email text not null default '',
  q1_hash text not null default '',
  q2_hash text not null default '',
  created_at timestamptz not null default now(),
  last_seen timestamptz not null default now()
);
alter table public.b777_profiles enable row level security;
drop policy if exists "profiles insert own" on public.b777_profiles;
create policy "profiles insert own" on public.b777_profiles
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "profiles update own" on public.b777_profiles;
create policy "profiles update own" on public.b777_profiles
  for update to authenticated using (auth.uid() = user_id);
drop policy if exists "profiles read" on public.b777_profiles;
create policy "profiles read" on public.b777_profiles
  for select to authenticated using (auth.uid() = user_id or public.b777_is_admin());

-- ── daily activity (time + post views), written only via functions ──
create table if not exists public.b777_activity (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null default (now() at time zone 'utc')::date,
  seconds int not null default 0,
  post_views int not null default 0,
  primary key (user_id, day)
);
alter table public.b777_activity enable row level security;
drop policy if exists "activity read" on public.b777_activity;
create policy "activity read" on public.b777_activity
  for select to authenticated using (auth.uid() = user_id or public.b777_is_admin());

create or replace function public.b777_heartbeat() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return; end if;
  insert into b777_activity(user_id, day, seconds)
  values (auth.uid(), (now() at time zone 'utc')::date, 60)
  on conflict (user_id, day) do update set seconds = b777_activity.seconds + 60;
end $$;
revoke execute on function public.b777_heartbeat() from public, anon;
grant execute on function public.b777_heartbeat() to authenticated;

create or replace function public.b777_post_view() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return; end if;
  insert into b777_activity(user_id, day, post_views)
  values (auth.uid(), (now() at time zone 'utc')::date, 1)
  on conflict (user_id, day) do update set post_views = b777_activity.post_views + 1;
end $$;
revoke execute on function public.b777_post_view() from public, anon;
grant execute on function public.b777_post_view() to authenticated;
