-- B777 v4: forum category on posts
alter table public.b777_sim_posts
  add column if not exists category text not null default 'sim';
create index if not exists b777_sim_posts_cat_idx on public.b777_sim_posts (category, created_at desc);
