create table public.news_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text not null default '',
  url text not null unique,
  source text not null,
  published_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table public.set_releases (
  id uuid primary key default gen_random_uuid(),
  set_id text not null unique,
  set_name text not null,
  released_detected_at timestamptz not null default now()
);

create table public.user_dismissed_set_releases (
  user_id uuid not null references auth.users(id) on delete cascade,
  set_release_id uuid not null references public.set_releases(id) on delete cascade,
  dismissed_at timestamptz not null default now(),
  primary key (user_id, set_release_id)
);

alter table public.news_items enable row level security;
alter table public.set_releases enable row level security;
alter table public.user_dismissed_set_releases enable row level security;

-- Escrita em news_items e set_releases é só via service role (Edge Functions);
-- authenticated recebe apenas select.
create policy "authenticated users read news" on public.news_items for select
  to authenticated using (true);

create policy "authenticated users read set releases" on public.set_releases for select
  to authenticated using (true);

create policy "users read their own dismissals" on public.user_dismissed_set_releases for select
  to authenticated using (auth.uid() = user_id);

create policy "users dismiss for themselves" on public.user_dismissed_set_releases for insert
  to authenticated with check (auth.uid() = user_id);

grant select on public.news_items to authenticated;
grant select on public.set_releases to authenticated;
grant select, insert on public.user_dismissed_set_releases to authenticated;

create index news_items_published_at_idx on public.news_items (published_at desc);
create index set_releases_detected_at_idx on public.set_releases (released_detected_at desc);
