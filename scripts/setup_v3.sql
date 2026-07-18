-- B777 v3: per-user cloud progress + device limit
-- Paste into Supabase SQL Editor and Run. Safe to re-run.

-- ── per-user study progress (FSRS cards + streak) ──
create table if not exists public.b777_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  cards jsonb not null default '{}'::jsonb,
  streak jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.b777_progress enable row level security;
drop policy if exists "progress insert own" on public.b777_progress;
create policy "progress insert own" on public.b777_progress
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "progress update own" on public.b777_progress;
create policy "progress update own" on public.b777_progress
  for update to authenticated using (auth.uid() = user_id);
drop policy if exists "progress read" on public.b777_progress;
create policy "progress read" on public.b777_progress
  for select to authenticated using (auth.uid() = user_id or public.b777_is_admin());

-- ── registered devices (max 2 enforced by the app) ──
create table if not exists public.b777_devices (
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id text not null,
  device_name text not null default '',
  created_at timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  primary key (user_id, device_id)
);
alter table public.b777_devices enable row level security;
drop policy if exists "devices own all" on public.b777_devices;
create policy "devices own all" on public.b777_devices
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "devices admin read" on public.b777_devices;
create policy "devices admin read" on public.b777_devices
  for select to authenticated using (auth.uid() = user_id or public.b777_is_admin());
