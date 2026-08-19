export interface PokemonTcgApiCard {
  id: string;
  name: string;
  number: string;
  rarity?: string;
  set: { id: string; name: string };
  images: { small: string };
}

export interface CardsCatalogRow {
  external_id: string;
  name: string;
  number: string;
  set_name: string;
  set_id: string;
  rarity: string | null;
  image_url: string;
}

export interface SetInfo {
  setId: string;
  setName: string;
}

export function extractUniqueSets(cards: PokemonTcgApiCard[]): SetInfo[] {
  const seen = new Map<string, SetInfo>();
  for (const card of cards) {
    if (!seen.has(card.set.id)) {
      seen.set(card.set.id, { setId: card.set.id, setName: card.set.name });
    }
  }
  return [...seen.values()];
}

export function mapPokemonTcgCardToRow(card: PokemonTcgApiCard): CardsCatalogRow {
  return {
    external_id: card.id,
    name: card.name,
    number: card.number,
    set_name: card.set.name,
    set_id: card.set.id,
    rarity: card.rarity ?? null,
    image_url: card.images.small
  };
}
