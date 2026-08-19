import { getSupabaseClient } from "../../lib/supabaseClient";

export interface Trade {
  id: string;
  conversationId: string;
  proposedBy: string;
  createdAt: string;
  confirmedAt: string | null;
}

export async function listTrades(conversationId: string): Promise<Trade[]> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("trades")
    .select("id, conversation_id, proposed_by, created_at, confirmed_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    conversationId: row.conversation_id,
    proposedBy: row.proposed_by,
    createdAt: row.created_at,
    confirmedAt: row.confirmed_at
  }));
}

export async function proposeTrade(conversationId: string): Promise<void> {
  const client = getSupabaseClient();
  const {
    data: { user }
  } = await client.auth.getUser();

  if (!user) {
    throw new Error("Usuário não autenticado");
  }

  const { error } = await client.from("trades").insert({
    conversation_id: conversationId,
    proposed_by: user.id
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function confirmTrade(tradeId: string): Promise<void> {
  const client = getSupabaseClient();
  const { error } = await client.rpc("confirm_trade", { trade_id: tradeId });

  if (error) {
    throw new Error(error.message);
  }
}

export async function completedTradesCount(userId: string): Promise<number> {
  const client = getSupabaseClient();
  const { data, error } = await client.rpc("completed_trades_count", { target_user: userId });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? 0;
}
