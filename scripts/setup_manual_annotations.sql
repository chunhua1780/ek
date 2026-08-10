-- Manual annotations table for the Chapter 7 reader (manual-reader.html)
-- Run this once in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists manual_annotations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  section_id text not null,      -- e.g. '7.14.3'
  para_index int not null,       -- paragraph position within the section
  color text,                    -- highlight color name, null = no highlight
  note text,                     -- optional note text
  bookmarked boolean default false,
  updated_at timestamptz default now(),
  unique(user_id, section_id, para_index)
);

-- If the table already existed from a previous run, add the new column:
alter table manual_annotations add column if not exists bookmarked boolean default false;

alter table manual_annotations enable row level security;

drop policy if exists "own annotations" on manual_annotations;
create policy "own annotations" on manual_annotations
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_manual_annotations_user on manual_annotations(user_id);
