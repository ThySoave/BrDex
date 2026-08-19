begin;
select plan(4);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'alice@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'bob@example.com');

insert into public.cards_catalog (id, external_id, name, number, set_name, set_id, rarity, image_url)
values ('33333333-3333-3333-3333-333333333333', 'base1-25', 'Pikachu', '25', 'Base Set', 'base1', 'Common', 'https://example.com/pikachu.png');

-- Sem assinatura → não premium
select is(
  public.is_premium('11111111-1111-1111-1111-111111111111'),
  false,
  'usuário sem assinatura não é premium'
);

-- Assinatura ativa (sem expiração) → premium
insert into public.premium_subscriptions (user_id, expires_at)
values ('11111111-1111-1111-1111-111111111111', null);

select is(
  public.is_premium('11111111-1111-1111-1111-111111111111'),
  true,
  'assinatura ativa torna o usuário premium'
);

-- Assinatura expirada → não premium
update public.premium_subscriptions
set expires_at = now() - interval '1 day'
where user_id = '11111111-1111-1111-1111-111111111111';

select is(
  public.is_premium('11111111-1111-1111-1111-111111111111'),
  false,
  'assinatura expirada não é premium'
);

-- Usuário grátis: a carta 101 é recusada
do $$
begin
  for i in 1..100 loop
    insert into public.user_cards (user_id, catalog_card_id, language, condition, status)
    values ('22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 'en', 'good', 'guardada');
  end loop;
end;
$$;

select throws_ok(
  $$ insert into public.user_cards (user_id, catalog_card_id, language, condition, status)
     values ('22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 'en', 'good', 'guardada') $$,
  'P0001',
  'Limite de 100 cartas no plano grátis',
  'usuário grátis não passa de 100 cartas'
);

select * from finish();
rollback;
