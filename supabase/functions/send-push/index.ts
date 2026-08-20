import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildPushMessages, chunk, type PushTokenRow, type QueueRow } from "./transform.ts";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: pending, error: queueError } = await supabase
    .from("notification_queue")
    .select("id, user_id, title, body, data")
    .is("sent_at", null)
    .order("created_at")
    .limit(500);

  if (queueError) {
    return new Response(`Erro lendo a fila: ${queueError.message}`, { status: 500 });
  }

  const rows = (pending ?? []) as QueueRow[];
  if (rows.length === 0) {
    return new Response("0 notificações pendentes", { status: 200 });
  }

  const userIds = [...new Set(rows.map((row) => row.user_id))];
  const { data: tokens, error: tokensError } = await supabase
    .from("push_tokens")
    .select("user_id, token")
    .in("user_id", userIds);

  if (tokensError) {
    return new Response(`Erro lendo tokens: ${tokensError.message}`, { status: 500 });
  }

  const { messages, deliveredIds, skippedIds } = buildPushMessages(
    rows,
    (tokens ?? []) as PushTokenRow[]
  );

  for (const batch of chunk(messages, 100)) {
    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(batch),
    });

    if (!response.ok) {
      return new Response(`Expo Push API error: ${response.status}`, { status: 502 });
    }
  }

  const sentIds = [...deliveredIds, ...skippedIds];
  const { error: updateError } = await supabase
    .from("notification_queue")
    .update({ sent_at: new Date().toISOString() })
    .in("id", sentIds);

  if (updateError) {
    return new Response(`Erro marcando fila: ${updateError.message}`, { status: 500 });
  }

  return new Response(
    `${messages.length} push(es) enviados, ${deliveredIds.length} notificações entregues, ${skippedIds.length} sem dispositivo`,
    { status: 200 }
  );
});
