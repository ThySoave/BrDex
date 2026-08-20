import { getSupabaseClient } from "../../lib/supabaseClient";

export interface RatingSummary {
  avgStars: number | null;
  ratingsCount: number;
}

export async function rateTrade(tradeId: string, stars: number, comment?: string): Promise<void> {
  const client = getSupabaseClient();
  const { error } = await client.rpc("rate_trade", {
    trade_id: tradeId,
    stars,
    comment: comment ?? null
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function myRatedTradeIds(tradeIds: string[]): Promise<string[]> {
  if (tradeIds.length === 0) {
    return [];
  }

  const client = getSupabaseClient();
  const {
    data: { user }
  } = await client.auth.getUser();

  if (!user) {
    throw new Error("Usuário não autenticado");
  }

  const { data, error } = await client
    .from("trade_ratings")
    .select("trade_id")
    .eq("rater", user.id)
    .in("trade_id", tradeIds);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row: any) => row.trade_id);
}

export async function userRatingSummary(userId: string): Promise<RatingSummary> {
  const client = getSupabaseClient();
  const { data, error } = await client.rpc("user_rating_summary", { target_user: userId });

  if (error) {
    throw new Error(error.message);
  }

  const row = Array.isArray(data) ? data[0] : data;

  return {
    avgStars: row?.avg_stars ?? null,
    ratingsCount: row?.ratings_count ?? 0
  };
}
