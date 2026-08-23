-- Fase 32: alertas de preço proativos. O spec promete "avise quando essa carta
-- passar de X" — até aqui os alertas eram só pull (triggered_price_alerts, 0012),
-- consultados quando o usuário abre a aba Valor. Esta migration liga os alertas
-- à fila de push já existente (notification_queue 0018 + send-push 0019).
--
-- Dedupe por notified_at: o alerta notifica ao cruzar o limiar e só notifica de
-- novo depois de re-armar (mediana voltou abaixo do limiar).
alter table public.price_alerts add column notified_at timestamptz;

create function public.process_price_alert_notifications()
returns void
language sql
security definer set search_path = public
as $$
  -- Re-arma alertas cuja mediana voltou abaixo do limiar
  update public.price_alerts pa
  set notified_at = null
  where pa.notified_at is not null
    and not exists (
      select 1 from public.price_community pc
      where pc.catalog_card_id = pa.catalog_card_id
        and pc.language = pa.language
        and pc.median_price >= pa.threshold_brl
    );

  -- Enfileira os alertas disparados ainda não notificados, marcando notified_at
  -- na mesma instrução (update ... returning) para não notificar duas vezes.
  with triggered as (
    update public.price_alerts pa
    set notified_at = now()
    from public.price_community pc
    where pc.catalog_card_id = pa.catalog_card_id
      and pc.language = pa.language
      and pc.median_price >= pa.threshold_brl
      and pa.notified_at is null
    returning pa.id, pa.user_id, pa.catalog_card_id, pc.median_price
  )
  insert into public.notification_queue (user_id, title, body, data)
  select
    t.user_id,
    'Alerta de preço',
    cc.name || ' atingiu R$ ' || replace(to_char(t.median_price, 'FM999999990.00'), '.', ',') || ' no preço da comunidade.',
    jsonb_build_object('type', 'price_alert', 'alertId', t.id)
  from triggered t
  join public.cards_catalog cc on cc.id = t.catalog_card_id;
$$;

-- Só o agendador (postgres) executa; nenhum acesso de cliente.
revoke all on function public.process_price_alert_notifications() from public;

-- Diário às 03:45 UTC, depois do sync-prices (03:30) — a mediana do dia já está
-- atualizada. SQL puro no próprio banco, sem pg_net.
create extension if not exists pg_cron;

select cron.schedule(
  'price-alert-push-daily',
  '45 3 * * *',
  $$ select public.process_price_alert_notifications() $$
);
