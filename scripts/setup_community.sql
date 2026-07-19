-- B777 Question Bank — community tables (Pilot Lounge + Sim Notes)
-- Paste this whole file into Supabase Dashboard → SQL Editor → Run.

-- ── Pilot Lounge chat ──
create table if not exists public.b777_chat (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nickname text not null default '',
  text text not null check (char_length(text) between 1 and 500)
);
alter table public.b777_chat enable row level security;
create policy "chat read" on public.b777_chat
  for select to authenticated using (true);
create policy "chat write" on public.b777_chat
  for insert to authenticated with check (auth.uid() = user_id);

-- ── Sim Notes posts ──
create table if not exists public.b777_sim_posts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nickname text not null default '',
  title text not null check (char_length(title) between 1 and 120),
  body text not null check (char_length(body) between 1 and 8000),
  images jsonb not null default '[]'::jsonb
);
alter table public.b777_sim_posts enable row level security;
create policy "posts read" on public.b777_sim_posts
  for select to authenticated using (true);
create policy "posts write" on public.b777_sim_posts
  for insert to authenticated with check (auth.uid() = user_id);
create policy "posts delete own" on public.b777_sim_posts
  for delete to authenticated using (auth.uid() = user_id);

-- ── Sim Notes comments ──
create table if not exists public.b777_sim_comments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  post_id uuid not null references public.b777_sim_posts(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nickname text not null default '',
  text text not null check (char_length(text) between 1 and 1000)
);
alter table public.b777_sim_comments enable row level security;
create policy "comments read" on public.b777_sim_comments
  for select to authenticated using (true);
create policy "comments write" on public.b777_sim_comments
  for insert to authenticated with check (auth.uid() = user_id);

-- ── Realtime for live chat ──
alter publication supabase_realtime add table public.b777_chat;

-- ── Storage bucket for sim note photos ──
insert into storage.buckets (id, name, public) values ('simnotes','simnotes', true)
on conflict (id) do nothing;
create policy "simnotes upload" on storage.objects
  for insert to authenticated with check (bucket_id = 'simnotes');
create policy "simnotes read" on storage.objects
  for select to public using (bucket_id = 'simnotes');
