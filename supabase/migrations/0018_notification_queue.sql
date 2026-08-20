-- Fase 13: fila de notificações push, drenada pela Edge Function send-push.
-- Nenhum acesso de cliente: sem policies e sem grants — escrita só pelos
-- triggers security definer abaixo; leitura/atualização só pela service role.
create table public.notification_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text not null,
  data jsonb not null default '{}',
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

alter table public.notification_queue enable row level security;

create index notification_queue_pending_idx on public.notification_queue (created_at) where sent_at is null;

create function public.enqueue_push_for_match()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.notification_queue (user_id, title, body, data) values
    (new.wanter_id, 'Novo match!', 'Uma carta da sua wishlist está disponível para negociação.',
     jsonb_build_object('type', 'match', 'matchId', new.id)),
    (new.owner_id, 'Novo match!', 'Alguém quer uma carta que você anunciou.',
     jsonb_build_object('type', 'match', 'matchId', new.id));
  return new;
end;
$$;

create trigger matches_enqueue_push
after insert on public.matches
for each row execute function public.enqueue_push_for_match();

create function public.enqueue_push_for_message()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  recipient uuid;
begin
  select case when c.participant_a = new.sender_id then c.participant_b else c.participant_a end
    into recipient
  from public.conversations c
  where c.id = new.conversation_id;

  -- Corpo genérico de propósito: o conteúdo da mensagem não sai do banco via push.
  insert into public.notification_queue (user_id, title, body, data) values
    (recipient, 'Nova mensagem', 'Você recebeu uma nova mensagem.',
     jsonb_build_object('type', 'message', 'conversationId', new.conversation_id));
  return new;
end;
$$;

create trigger messages_enqueue_push
after insert on public.messages
for each row execute function public.enqueue_push_for_message();
