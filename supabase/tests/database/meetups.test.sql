begin;
select plan(4);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'alice@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'bob@example.com');

-- Alice publica um encontro
set local role authenticated;
set local "request.jwt.claims" to '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

insert into public.meetups (created_by, title, city, starts_at, description)
values ('11111111-1111-1111-1111-111111111111', 'Feira de trocas TCG', 'Curitiba', now() + interval '7 days', 'Praça central');

select is(
  (select count(*)::int from public.meetups where created_by = '11111111-1111-1111-1111-111111111111'),
  1,
  'criadora insere o próprio encontro'
);

-- Bob, autenticado, vê o encontro da Alice
set local "request.jwt.claims" to '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';

select is(
  (select count(*)::int from public.meetups),
  1,
  'outro usuário autenticado lê o encontro'
);

-- Bob não insere encontro em nome da Alice
select throws_ok(
  $$ insert into public.meetups (created_by, title, city, starts_at)
     values ('11111111-1111-1111-1111-111111111111', 'Encontro falso', 'São Paulo', now() + interval '1 day') $$,
  'new row violates row-level security policy for table "meetups"'
);

-- Delete do Bob não remove o encontro da Alice
delete from public.meetups where created_by = '11111111-1111-1111-1111-111111111111';

select is(
  (select count(*)::int from public.meetups),
  1,
  'delete por quem não criou não remove a linha'
);

select * from finish();
rollback;
