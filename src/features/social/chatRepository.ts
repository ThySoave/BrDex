import { getSupabaseClient } from "../../lib/supabaseClient";

export interface ChatMessage {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
}

export async function getOrCreateConversation(otherUserId: string): Promise<string> {
  const client = getSupabaseClient();
  const {
    data: { user }
  } = await client.auth.getUser();

  if (!user) {
    throw new Error("Usuário não autenticado");
  }

  const [participantA, participantB] = [user.id, otherUserId].sort();

  const { data: existing, error: selectError } = await client
    .from("conversations")
    .select("id")
    .eq("participant_a", participantA)
    .eq("participant_b", participantB)
    .maybeSingle();

  if (selectError) {
    throw new Error(selectError.message);
  }

  if (existing) {
    return existing.id;
  }

  const { data: created, error: insertError } = await client
    .from("conversations")
    .insert({ participant_a: participantA, participant_b: participantB })
    .select("id")
    .single();

  if (insertError) {
    throw new Error(insertError.message);
  }

  return created.id;
}

export async function listMessages(conversationId: string): Promise<ChatMessage[]> {
  const client = getSupabaseClient();

  const { data, error } = await client
    .from("messages")
    .select("id, sender_id, body, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    senderId: row.sender_id,
    body: row.body,
    createdAt: row.created_at
  }));
}

export async function sendMessage(conversationId: string, body: string): Promise<void> {
  const client = getSupabaseClient();
  const {
    data: { user }
  } = await client.auth.getUser();

  if (!user) {
    throw new Error("Usuário não autenticado");
  }

  const { error } = await client.from("messages").insert({
    conversation_id: conversationId,
    sender_id: user.id,
    body
  });

  if (error) {
    throw new Error(error.message);
  }
}

export function subscribeToMessages(
  conversationId: string,
  onMessage: (message: ChatMessage) => void
): () => void {
  const client = getSupabaseClient();

  const channel = client
    .channel(`messages-${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`
      },
      (payload: any) => {
        onMessage({
          id: payload.new.id,
          senderId: payload.new.sender_id,
          body: payload.new.body,
          createdAt: payload.new.created_at
        });
      }
    )
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}
