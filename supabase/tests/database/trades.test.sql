begin;
select plan(6);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'alice@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'bob@example.com'),
  ('33333333-3333-3333-3333-333333333333', 'carol@example.com');

-- Conversa Alice <-> Bob (seed como service role)
insert into public.conversations (id, participant_a, participant_b)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '11111111-1111-1111-1111-111111111111',
        '22222222-2222-2222-2222-222222222222');

-- Alice propõe uma troca concluída na própria conversa
set local role authenticated;
set local "request.jwt.claims" to '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

insert into public.trades (id, conversation_id, proposed_by)
values ('99999999-9999-9999-9999-999999999999',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '11111111-1111-1111-1111-111111111111');

select is(
  (select count(*)::int from public.trades where proposed_by = '11111111-1111-1111-1111-111111111111'),
  1,
  'participante propõe trade na própria conversa'
);

-- Carol (fora da conversa) não insere trade nela
set local "request.jwt.claims" to '{"sub": "33333333-3333-3333-3333-333333333333", "role": "authenticated"}';

select throws_ok(
  $$ insert into public.trades (conversation_id, proposed_by)
     values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333') $$,
  'new row violates row-level security policy for table "trades"'
);

-- Alice não confirma a própria proposta
set local "request.jwt.claims" to '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

select throws_ok(
  $$ select public.confirm_trade('99999999-9999-9999-9999-999999999999') $$,
  'quem propôs não pode confirmar a troca'
);

-- Bob confirma a proposta da Alice
set local "request.jwt.claims" to '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';

select confirm_trade('99999999-9999-9999-9999-999999999999');

select isnt(
  (select confirmed_at from public.trades where id = '99999999-9999-9999-9999-999999999999'),
  null,
  'outro participante confirma a troca'
);

-- Confirmar de novo é erro
select throws_ok(
  $$ select public.confirm_trade('99999999-9999-9999-9999-999999999999') $$,
  'troca já confirmada'
);

-- Reputação: 1 para ambos os participantes
select is(
  (select array[public.completed_trades_count('11111111-1111-1111-1111-111111111111'),
                public.completed_trades_count('22222222-2222-2222-2222-222222222222')]),
  array[1, 1],
  'completed_trades_count retorna 1 para ambos os participantes'
);

select * from finish();
rollback;
