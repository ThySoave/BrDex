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
