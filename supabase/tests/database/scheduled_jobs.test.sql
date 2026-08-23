begin;
select plan(4);

-- Fase 32: o spec exige sincronização de catálogo agendada — este teste fixa o
-- conjunto de jobs que chamam Edge Functions, pegando regressão de agendamento.
select is(
  (select count(*)::int from cron.job where jobname = 'fetch-news-every-6h'),
  1,
  'fetch-news agendado (0010)'
);

select is(
  (select count(*)::int from cron.job where jobname = 'sync-prices-daily'),
  1,
  'sync-prices agendado (0015)'
);

select is(
  (select count(*)::int from cron.job where jobname = 'send-push-every-minute'),
  1,
  'send-push agendado (0019)'
);

select is(
  (select count(*)::int from cron.job where jobname = 'sync-catalog-daily'),
  1,
  'sync-catalog agendado (0022)'
);

select * from finish();
rollback;
