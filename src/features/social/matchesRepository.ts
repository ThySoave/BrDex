import { getSupabaseClient } from "../../lib/supabaseClient";

export interface MatchItem {
  id: string;
  role: "quero" | "tenho";
  otherUserId: string;
  cardName: string;
  cardImageUrl: string;
}

export async function listMatches(): Promise<MatchItem[]> {
  const client = getSupabaseClient();
  const {
    data: { user }
  } = await client.auth.getUser();

  if (!user) {
    throw new Error("Usuário não autenticado");
  }

  const { data, error } = await client
    .from("matches")
    .select("id, wanter_id, owner_id, user_cards(cards_catalog(name, image_url))");

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    role: row.wanter_id === user.id ? "quero" : "tenho",
    otherUserId: row.wanter_id === user.id ? row.owner_id : row.wanter_id,
    cardName: row.user_cards.cards_catalog.name,
    cardImageUrl: row.user_cards.cards_catalog.image_url
  }));
}
