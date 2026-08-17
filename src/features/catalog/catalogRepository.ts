import { getSupabaseClient } from "../../lib/supabaseClient";
import type { CatalogCard } from "./types";

const PAGE_SIZE = 50;

export async function fetchCatalogPage(page: number): Promise<CatalogCard[]> {
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data, error } = await getSupabaseClient()
    .from("cards_catalog")
    .select("id, name, number, set_name, rarity, image_url")
    .order("name", { ascending: true })
    .range(from, to);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    number: row.number,
    setName: row.set_name,
    rarity: row.rarity,
    imageUrl: row.image_url
  }));
}
