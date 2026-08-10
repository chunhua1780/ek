-- Manual annotations table for the Chapter 7 reader (manual-reader.html)
-- Run this once in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists manual_annotations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  section_id text not null,      -- e.g. '7.14.3'
  para_index int,                -- legacy: paragraph position (kept for old rows, no longer written)
  para_key text,                 -- stable per-paragraph key (e.g. 'p3') -- survives content reordering/edits
  color text,                    -- highlight color name, null = no highlight
  note text,                     -- optional note text
  bookmarked boolean default false,
  updated_at timestamptz default now()
);

-- If the table already existed from a previous run, add the new columns:
alter table manual_annotations add column if not exists bookmarked boolean default false;
alter table manual_annotations add column if not exists para_key text;
alter table manual_annotations alter column para_index drop not null;

-- Backfill para_key for any old rows that only have para_index (best-effort 1-based mapping)
update manual_annotations set para_key = 'p' || (para_index + 1) where para_key is null and para_index is not null;

-- Replace the old (user_id, section_id, para_index) uniqueness with (user_id, section_id, para_key)
alter table manual_annotations drop constraint if exists manual_annotations_user_id_section_id_para_index_key;
create unique index if not exists manual_annotations_user_section_parakey_key
  on manual_annotations(user_id, section_id, para_key);

alter table manual_annotations enable row level security;

drop policy if exists "own annotations" on manual_annotations;
create policy "own annotations" on manual_annotations
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_manual_annotations_user on manual_annotations(user_id);
