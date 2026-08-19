create table public.premium_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  activated_at timestamptz not null default now(),
  expires_at timestamptz
);

alter table public.premium_subscriptions enable row level security;
create policy "users read their own subscription" on public.premium_subscriptions for select
  to authenticated using (auth.uid() = user_id);
grant select on public.premium_subscriptions to authenticated;
-- Escrita só pelo service role (backoffice/loja) — sem policy de insert/update para authenticated.

create function public.is_premium(uid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.premium_subscriptions
    where user_id = uid
      and (expires_at is null or expires_at > now())
  );
$$;

create function public.enforce_free_card_limit()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_premium(new.user_id)
     and (select count(*) from public.user_cards where user_id = new.user_id) >= 100 then
    raise exception 'Limite de 100 cartas no plano grátis';
  end if;
  return new;
end;
$$;

create trigger user_cards_enforce_free_limit
before insert on public.user_cards
for each row execute function public.enforce_free_card_limit();
