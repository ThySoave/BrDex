import { getSupabaseClient } from "../../lib/supabaseClient";
import type { AddUserCardInput, UserCard } from "./types";

export async function addUserCard(input: AddUserCardInput): Promise<void> {
  const client = getSupabaseClient();
  const {
    data: { user }
  } = await client.auth.getUser();

  if (!user) {
    throw new Error("Usuário não autenticado");
  }

  const { error } = await client.from("user_cards").insert({
    user_id: user.id,
    catalog_card_id: input.catalogCardId,
    language: input.language,
    condition: input.condition,
    price_paid: input.pricePaid,
    status: input.status
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function countUserCards(): Promise<number> {
  const client = getSupabaseClient();
  const {
    data: { user }
  } = await client.auth.getUser();

  if (!user) {
    throw new Error("Usuário não autenticado");
  }

  const { count, error } = await client
    .from("user_cards")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

export async function listUserCards(): Promise<UserCard[]> {
  const client = getSupabaseClient();
  const {
    data: { user }
  } = await client.auth.getUser();

  if (!user) {
    throw new Error("Usuário não autenticado");
  }

  const { data, error } = await client
    .from("user_cards")
    .select(
      "id, catalog_card_id, language, condition, price_paid, status, cards_catalog(name, image_url)"
    )
    .eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    catalogCardId: row.catalog_card_id,
    cardName: row.cards_catalog.name,
    cardImageUrl: row.cards_catalog.image_url,
    language: row.language,
    condition: row.condition,
    pricePaid: row.price_paid,
    status: row.status
  }));
}
