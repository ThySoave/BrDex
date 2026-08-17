create extension if not exists pgcrypto;

create table public.cards_catalog (
  id uuid primary key default gen_random_uuid(),
  external_id text unique not null,
  name text not null,
  number text not null,
  set_name text not null,
  set_id text not null,
  rarity text,
  image_url text not null,
  created_at timestamptz not null default now()
);

alter table public.cards_catalog enable row level security;

create policy "catalog is readable by any authenticated user"
  on public.cards_catalog for select
  to authenticated
  using (true);

create type public.card_language as enum ('en', 'pt', 'jp', 'other');
create type public.card_condition as enum ('mint', 'near_mint', 'excellent', 'good', 'played', 'damaged');
create type public.card_status as enum ('guardada', 'a_venda', 'disponivel_troca');

create table public.user_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  catalog_card_id uuid not null references public.cards_catalog(id),
  language public.card_language not null,
  condition public.card_condition not null,
  price_paid numeric(10,2),
  price_sold numeric(10,2),
  photo_url text,
  status public.card_status not null default 'guardada',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_cards enable row level security;

create policy "users can select their own cards"
  on public.user_cards for select
  to authenticated
  using (auth.uid() = user_id);

create policy "users can insert their own cards"
  on public.user_cards for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "users can update their own cards"
  on public.user_cards for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users can delete their own cards"
  on public.user_cards for delete
  to authenticated
  using (auth.uid() = user_id);

grant select on public.cards_catalog to authenticated;
grant select, insert, update, delete on public.user_cards to authenticated;

create index user_cards_user_id_idx on public.user_cards (user_id);
create index user_cards_catalog_card_id_idx on public.user_cards (catalog_card_id);
create index cards_catalog_name_idx on public.cards_catalog using gin (to_tsvector('simple', name));
