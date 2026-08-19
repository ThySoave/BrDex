-- Agenda o fetch-news a cada 6h (notícias não mudam a cada minuto).
-- Edge Functions são invocadas por HTTP, então o job usa pg_net; a URL do
-- projeto e a service role key vêm do Vault (configurar em produção com:
--   select vault.create_secret('<url>', 'project_url');
--   select vault.create_secret('<key>', 'service_role_key');
-- ). O corpo do job só é avaliado em runtime, então o reset local aplica
-- esta migration mesmo sem os secrets.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'fetch-news-every-6h',
  '0 */6 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/fetch-news',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    )
  )
  $$
);
