begin;
select plan(4);

select has_table('public', 'push_tokens', 'tabela push_tokens existe');

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'alice@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'bob@example.com');

-- Alice registra o token do próprio dispositivo
set local role authenticated;
set local "request.jwt.claims" to '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

insert into public.push_tokens (user_id, token, platform) values
  ('11111111-1111-1111-1111-111111111111', 'ExponentPushToken[alice-device-1]', 'android');

select is(
  (select count(*)::int from public.push_tokens where user_id = '11111111-1111-1111-1111-111111111111'),
  1,
  'dona registra e lê o próprio token'
);

-- Upsert do mesmo (user_id, token) não duplica
insert into public.push_tokens (user_id, token, platform) values
  ('11111111-1111-1111-1111-111111111111', 'ExponentPushToken[alice-device-1]', 'android')
on conflict (user_id, token) do update set updated_at = now();

select is(
  (select count(*)::int from public.push_tokens where user_id = '11111111-1111-1111-1111-111111111111'),
  1,
  'upsert do mesmo (user_id, token) não duplica'
);

-- Bob não vê tokens da Alice
set local "request.jwt.claims" to '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';

select is(
  (select count(*)::int from public.push_tokens),
  0,
  'outro usuário não vê tokens alheios'
);

select * from finish();
rollback;
