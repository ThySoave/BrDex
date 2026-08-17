import type { CatalogCard } from "./types";

export function filterCatalogCards(cards: CatalogCard[], query: string): CatalogCard[] {
  const normalized = query.trim().toLowerCase();
  if (normalized === "") {
    return cards;
  }
  return cards.filter((card) => card.name.toLowerCase().includes(normalized));
}
