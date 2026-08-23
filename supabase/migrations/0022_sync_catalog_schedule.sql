-- Agenda o sync-catalog 1x/dia (02:00 UTC, antes do snapshot de 03:00 e do
-- sync-prices de 03:30 — catálogo novo entra no cálculo do próprio dia).
-- Mesmo padrão do fetch-news (0010) e sync-prices (0015): pg_cron + pg_net,
-- URL do projeto e service role key lidas do Vault em runtime — o reset local
-- aplica esta migration mesmo sem os secrets configurados.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'sync-catalog-daily',
  '0 2 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/sync-catalog',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    )
  )
  $$
);
