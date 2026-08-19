begin;
select plan(7);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'alice@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'bob@example.com');

-- Seed como service role (dono da migration) — Edge Functions escrevem assim
insert into public.news_items (title, summary, url, source, published_at)
values ('Novo set anunciado', 'Resumo curto da notícia.', 'https://example.com/noticia-1', 'PokéNews', now());

insert into public.set_releases (set_id, set_name)
values ('sv10', 'Scarlet & Violet 10');

-- Alice autenticada lê news_items
set local role authenticated;
set local "request.jwt.claims" to '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

select is(
  (select count(*)::int from public.news_items),
  1,
  'usuário autenticado lê news_items'
);

-- Insert direto por authenticated é bloqueado (só service role escreve)
select throws_ok(
  $$ insert into public.news_items (title, summary, url, source, published_at)
     values ('Hack', '', 'https://example.com/hack', 'Alice', now()) $$,
  'permission denied for table news_items'
);

-- Alice autenticada lê set_releases
select is(
  (select count(*)::int from public.set_releases),
  1,
  'usuário autenticado lê set_releases'
);

-- Alice dispensa o set novo
insert into public.user_dismissed_set_releases (user_id, set_release_id)
select '11111111-1111-1111-1111-111111111111', id from public.set_releases where set_id = 'sv10';

-- Bob não vê a dispensa da Alice
set local "request.jwt.claims" to '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';

select is(
  (select count(*)::int from public.user_dismissed_set_releases),
  0,
  'usuário não vê dispensas de outros usuários'
);

-- Bob não insere dispensa em nome da Alice
select throws_ok(
  $$ insert into public.user_dismissed_set_releases (user_id, set_release_id)
     select '11111111-1111-1111-1111-111111111111', id from public.set_releases where set_id = 'sv10' $$,
  'new row violates row-level security policy for table "user_dismissed_set_releases"'
);

-- Uniques impedem duplicatas (como service role)
reset role;

select throws_ok(
  $$ insert into public.news_items (title, summary, url, source, published_at)
     values ('Duplicada', '', 'https://example.com/noticia-1', 'Outro', now()) $$,
  '23505'
);

select throws_ok(
  $$ insert into public.set_releases (set_id, set_name)
     values ('sv10', 'Duplicado') $$,
  '23505'
);

select * from finish();
rollback;
