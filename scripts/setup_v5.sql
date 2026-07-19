-- B777 v5: feedback box
create table if not exists public.b777_feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  staff_id text not null default '',
  text text not null check (char_length(text) between 1 and 2000)
);
alter table public.b777_feedback enable row level security;
drop policy if exists "feedback write" on public.b777_feedback;
create policy "feedback write" on public.b777_feedback
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "feedback admin read" on public.b777_feedback;
create policy "feedback admin read" on public.b777_feedback
  for select to authenticated using (public.b777_is_admin());
