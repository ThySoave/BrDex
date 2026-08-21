import { getSupabaseClient } from "../../lib/supabaseClient";
import type { CardLanguage } from "../collection/types";

export interface WishlistItem {
  id: string;
  catalogCardId: string;
  cardName: string;
  cardImageUrl: string;
  language: CardLanguage | null;
}

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

export async function listWishlist(): Promise<WishlistItem[]> {
  const client = getSupabaseClient();
  const {
    data: { user }
  } = await client.auth.getUser();

  if (!user) {
    throw new Error("Usuário não autenticado");
  }

  const { data, error } = await client
    .from("wishlist")
    .select("id, catalog_card_id, language, cards_catalog(name, image_url)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    catalogCardId: row.catalog_card_id,
    cardName: row.cards_catalog.name,
    cardImageUrl: row.cards_catalog.image_url,
    language: row.language
  }));
}

export async function removeFromWishlist(wishlistId: string): Promise<void> {
  const client = getSupabaseClient();
  const {
    data: { user }
  } = await client.auth.getUser();

  if (!user) {
    throw new Error("Usuário não autenticado");
  }

  const { error } = await client
    .from("wishlist")
    .delete()
    .eq("id", wishlistId)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }
}
