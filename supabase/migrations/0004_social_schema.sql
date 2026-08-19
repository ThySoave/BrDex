create table public.wishlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  catalog_card_id uuid not null references public.cards_catalog(id) on delete cascade,
  language public.card_language,
  created_at timestamptz not null default now(),
  unique nulls not distinct (user_id, catalog_card_id, language)
);

alter table public.wishlist enable row level security;
create policy "users read their own wishlist" on public.wishlist for select to authenticated using (auth.uid() = user_id);
create policy "users add to their own wishlist" on public.wishlist for insert to authenticated with check (auth.uid() = user_id);
create policy "users remove from their own wishlist" on public.wishlist for delete to authenticated using (auth.uid() = user_id);
grant select, insert, delete on public.wishlist to authenticated;

create table public.blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

alter table public.blocks enable row level security;
create policy "users read their own blocks" on public.blocks for select to authenticated using (auth.uid() = blocker_id);
create policy "users create their own blocks" on public.blocks for insert to authenticated with check (auth.uid() = blocker_id);
create policy "users delete their own blocks" on public.blocks for delete to authenticated using (auth.uid() = blocker_id);
grant select, insert, delete on public.blocks to authenticated;

create function public.users_blocked(a uuid, b uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  );
$$;

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reported_id uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  context text,
  created_at timestamptz not null default now(),
  check (reporter_id <> reported_id)
);

alter table public.reports enable row level security;
create policy "users file their own reports" on public.reports for insert to authenticated with check (auth.uid() = reporter_id);
create policy "users read their own reports" on public.reports for select to authenticated using (auth.uid() = reporter_id);
grant select, insert on public.reports to authenticated;

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  wishlist_id uuid not null references public.wishlist(id) on delete cascade,
  user_card_id uuid not null references public.user_cards(id) on delete cascade,
  wanter_id uuid not null references auth.users(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (wishlist_id, user_card_id)
);

alter table public.matches enable row level security;
create policy "participants read their matches" on public.matches for select
  to authenticated using (auth.uid() in (wanter_id, owner_id));
grant select on public.matches to authenticated;
-- Escrita em matches só pelos triggers abaixo (security definer).

create function public.create_matches_for_user_card()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.status in ('a_venda', 'disponivel_troca') then
    insert into public.matches (wishlist_id, user_card_id, wanter_id, owner_id)
    select w.id, new.id, w.user_id, new.user_id
    from public.wishlist w
    where w.catalog_card_id = new.catalog_card_id
      and (w.language is null or w.language = new.language)
      and w.user_id <> new.user_id
      and not public.users_blocked(w.user_id, new.user_id)
    on conflict (wishlist_id, user_card_id) do nothing;
  else
    delete from public.matches where user_card_id = new.id;
  end if;
  return new;
end;
$$;

create trigger user_cards_generate_matches
after insert or update of status on public.user_cards
for each row execute function public.create_matches_for_user_card();

create function public.create_matches_for_wishlist()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.matches (wishlist_id, user_card_id, wanter_id, owner_id)
  select new.id, uc.id, new.user_id, uc.user_id
  from public.user_cards uc
  where uc.catalog_card_id = new.catalog_card_id
    and uc.status in ('a_venda', 'disponivel_troca')
    and (new.language is null or uc.language = new.language)
    and uc.user_id <> new.user_id
    and not public.users_blocked(new.user_id, uc.user_id)
  on conflict (wishlist_id, user_card_id) do nothing;
  return new;
end;
$$;

create trigger wishlist_generate_matches
after insert on public.wishlist
for each row execute function public.create_matches_for_wishlist();

create function public.remove_matches_on_block()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  delete from public.matches m
  where (m.wanter_id = new.blocker_id and m.owner_id = new.blocked_id)
     or (m.wanter_id = new.blocked_id and m.owner_id = new.blocker_id);
  return new;
end;
$$;

create trigger blocks_remove_matches
after insert on public.blocks
for each row execute function public.remove_matches_on_block();
