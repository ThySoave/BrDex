begin;
select plan(4);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'alice@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'bob@example.com'),
  ('99999999-9999-9999-9999-999999999999', 'carol@example.com');

-- Alice cria a conversa com Bob e envia uma mensagem
set local role authenticated;
set local "request.jwt.claims" to '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

insert into public.conversations (id, participant_a, participant_b)
values ('77777777-7777-7777-7777-777777777777', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');

insert into public.messages (conversation_id, sender_id, body)
values ('77777777-7777-7777-7777-777777777777', '11111111-1111-1111-1111-111111111111', 'Oi, vi que você tem o Pikachu!');

select is(
  (select count(*)::int from public.messages where conversation_id = '77777777-7777-7777-7777-777777777777'),
  1,
  'participante envia mensagem na conversa'
);

-- Bob (outro participante) lê a mensagem
set local "request.jwt.claims" to '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';

select is(
  (select count(*)::int from public.messages where conversation_id = '77777777-7777-7777-7777-777777777777'),
  1,
  'outro participante lê as mensagens'
);

-- Carol (não-participante) não vê a conversa
set local "request.jwt.claims" to '{"sub": "99999999-9999-9999-9999-999999999999", "role": "authenticated"}';

select is(
  (select count(*)::int from public.conversations),
  0,
  'não-participante não vê a conversa'
);

-- Alice bloqueia Bob; Bob não consegue mais enviar mensagem
set local "request.jwt.claims" to '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

insert into public.blocks (blocker_id, blocked_id)
values ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');

set local "request.jwt.claims" to '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';

select throws_ok(
  $$ insert into public.messages (conversation_id, sender_id, body)
     values ('77777777-7777-7777-7777-777777777777', '22222222-2222-2222-2222-222222222222', 'oi?') $$,
  '42501',
  'new row violates row-level security policy for table "messages"',
  'após bloqueio o envio falha com 42501'
);

select * from finish();
rollback;
