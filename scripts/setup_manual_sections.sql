-- Manual sections table — lets the admin add extra chapters beyond the
-- built-in Chapter 7 content, without needing a code push.
-- Run this once in Supabase SQL Editor.

create table if not exists manual_sections (
  id uuid primary key default gen_random_uuid(),
  section_key text unique not null,   -- e.g. '7.23' or 'OM-A-4'
  title_en text not null,
  title_zh text,
  order_index int not null default 1000,
  paragraphs jsonb not null default '[]'::jsonb, -- [{ "key":"p1", "en":"...", "zh":"..." }, ...]
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table manual_sections enable row level security;

-- Any signed-in user can read (so this is ready for a future paid-tier rollout)
drop policy if exists "read sections" on manual_sections;
create policy "read sections" on manual_sections
  for select to authenticated using (true);

-- Only the admin (app_metadata.b777_admin = true) can add/edit/remove chapters
drop policy if exists "admin insert sections" on manual_sections;
create policy "admin insert sections" on manual_sections
  for insert to authenticated with check (public.b777_is_admin());

drop policy if exists "admin update sections" on manual_sections;
create policy "admin update sections" on manual_sections
  for update to authenticated using (public.b777_is_admin());

drop policy if exists "admin delete sections" on manual_sections;
create policy "admin delete sections" on manual_sections
  for delete to authenticated using (public.b777_is_admin());

create index if not exists idx_manual_sections_order on manual_sections(order_index);
