import { getSupabaseClient } from "../../lib/supabaseClient";
import type { CardLanguage } from "../collection/types";

export async function addToWishlist(
  catalogCardId: string,
  language: CardLanguage | null
): Promise<void> {
  const client = getSupabaseClient();
  const {
    data: { user }
  } = await client.auth.getUser();

  if (!user) {
    throw new Error("Usuário não autenticado");
  }

  const { error } = await client.from("wishlist").insert({
    user_id: user.id,
    catalog_card_id: catalogCardId,
    language
  });

  if (error) {
    throw new Error(error.message);
  }
}
