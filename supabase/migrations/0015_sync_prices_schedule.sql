-- Agenda o sync-prices 1x/dia (03:30 UTC, após o snapshot diário de 03:00).
-- Mesmo padrão do fetch-news (0010): pg_cron + pg_net, URL do projeto e
-- service role key lidas do Vault em runtime — o reset local aplica esta
-- migration mesmo sem os secrets configurados.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'sync-prices-daily',
  '30 3 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/sync-prices',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    )
  )
  $$
);
