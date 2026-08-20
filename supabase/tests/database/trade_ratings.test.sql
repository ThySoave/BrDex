begin;
select plan(7);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'alice@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'bob@example.com'),
  ('33333333-3333-3333-3333-333333333333', 'carol@example.com');

-- Conversa Alice <-> Bob (seed como service role)
insert into public.conversations (id, participant_a, participant_b)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '11111111-1111-1111-1111-111111111111',
        '22222222-2222-2222-2222-222222222222');

-- Duas trades confirmadas + uma pendente (seed como service role)
insert into public.trades (id, conversation_id, proposed_by, confirmed_at) values
  ('99999999-9999-9999-9999-999999999991',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   '11111111-1111-1111-1111-111111111111', now()),
  ('99999999-9999-9999-9999-999999999992',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   '22222222-2222-2222-2222-222222222222', now()),
  ('99999999-9999-9999-9999-999999999993',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   '11111111-1111-1111-1111-111111111111', null);

set local role authenticated;
set local "request.jwt.claims" to '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

-- Trade pendente não pode ser avaliada
select throws_ok(
  $$ select public.rate_trade('99999999-9999-9999-9999-999999999993', 5) $$,
  'só trocas confirmadas podem ser avaliadas'
);

-- Alice avalia a trade confirmada; o avaliado é o outro participante (Bob)
select public.rate_trade('99999999-9999-9999-9999-999999999991', 5, 'negociação tranquila');

select is(
  (select rated_user from public.trade_ratings
    where trade_id = '99999999-9999-9999-9999-999999999991'
      and rater = '11111111-1111-1111-1111-111111111111'),
  '22222222-2222-2222-2222-222222222222',
  'avaliado é o outro participante da conversa'
);

-- Nota fora de 1–5 falha
select throws_ok(
  $$ select public.rate_trade('99999999-9999-9999-9999-999999999992', 6) $$,
  'nota deve ser entre 1 e 5'
);

-- Avaliar a mesma trade duas vezes falha
select throws_ok(
  $$ select public.rate_trade('99999999-9999-9999-9999-999999999991', 4) $$,
  'troca já avaliada por você'
);

-- Carol (fora da conversa) não avalia
set local "request.jwt.claims" to '{"sub": "33333333-3333-3333-3333-333333333333", "role": "authenticated"}';

select throws_ok(
  $$ select public.rate_trade('99999999-9999-9999-9999-999999999992', 3) $$,
  'apenas participantes da conversa podem avaliar'
);

-- Alice avalia a segunda trade confirmada com nota 4 → média de Bob = 4.5 (2 avaliações)
set local "request.jwt.claims" to '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

select public.rate_trade('99999999-9999-9999-9999-999999999992', 4);

select results_eq(
  $$ select avg_stars, ratings_count
       from public.user_rating_summary('22222222-2222-2222-2222-222222222222') $$,
  $$ values (4.5::numeric, 2) $$,
  'user_rating_summary retorna média e contagem corretas'
);

-- RLS: Carol não lê avaliações das quais não participa
set local "request.jwt.claims" to '{"sub": "33333333-3333-3333-3333-333333333333", "role": "authenticated"}';

select is(
  (select count(*)::int from public.trade_ratings),
  0,
  'terceiro autenticado não lê avaliações alheias'
);

select * from finish();
rollback;
