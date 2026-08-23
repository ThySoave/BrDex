import { getSupabaseClient } from "../../lib/supabaseClient";
import type { CatalogCard } from "./types";

export const CATALOG_PAGE_SIZE = 50;
const SEARCH_LIMIT = 25;

interface CatalogRow {
  id: string;
  name: string;
  number: string;
  set_name: string;
  rarity: string | null;
  image_url: string;
}

function toCatalogCard(row: CatalogRow): CatalogCard {
  return {
    id: row.id,
    name: row.name,
    number: row.number,
    setName: row.set_name,
    rarity: row.rarity,
    imageUrl: row.image_url
  };
}

export async function fetchCatalogPage(page: number): Promise<CatalogCard[]> {
  const from = page * CATALOG_PAGE_SIZE;
  const to = from + CATALOG_PAGE_SIZE - 1;

  const { data, error } = await getSupabaseClient()
    .from("cards_catalog")
    .select("id, name, number, set_name, rarity, image_url")
    .order("name", { ascending: true })
    .range(from, to);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(toCatalogCard);
}

export async function searchCatalogByName(name: string): Promise<CatalogCard[]> {
  const { data, error } = await getSupabaseClient()
    .from("cards_catalog")
    .select("id, name, number, set_name, rarity, image_url")
    .ilike("name", `%${name}%`)
    .limit(SEARCH_LIMIT);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(toCatalogCard);
}
