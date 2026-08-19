import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { extractUniqueSets, mapPokemonTcgCardToRow, type PokemonTcgApiCard } from "./transform.ts";

Deno.test("mapPokemonTcgCardToRow maps the Pokémon TCG API shape to our catalog row", () => {
  const apiCard = {
    id: "base1-25",
    name: "Pikachu",
    number: "25",
    rarity: "Common",
    set: { id: "base1", name: "Base Set" },
    images: { small: "https://images.pokemontcg.io/base1/25.png" }
  };

  const row = mapPokemonTcgCardToRow(apiCard);

  assertEquals(row, {
    external_id: "base1-25",
    name: "Pikachu",
    number: "25",
    set_name: "Base Set",
    set_id: "base1",
    rarity: "Common",
    image_url: "https://images.pokemontcg.io/base1/25.png"
  });
});

Deno.test("mapPokemonTcgCardToRow defaults rarity to null when absent", () => {
  const apiCard = {
    id: "base1-1",
    name: "Alakazam",
    number: "1",
    set: { id: "base1", name: "Base Set" },
    images: { small: "https://images.pokemontcg.io/base1/1.png" }
  };

  const row = mapPokemonTcgCardToRow(apiCard);

  assertEquals(row.rarity, null);
});

Deno.test("extractUniqueSets deduplicates sets from a list of cards", () => {
  const cards: PokemonTcgApiCard[] = [
    {
      id: "base1-25",
      name: "Pikachu",
      number: "25",
      set: { id: "base1", name: "Base Set" },
      images: { small: "https://images.pokemontcg.io/base1/25.png" }
    },
    {
      id: "base1-1",
      name: "Alakazam",
      number: "1",
      set: { id: "base1", name: "Base Set" },
      images: { small: "https://images.pokemontcg.io/base1/1.png" }
    },
    {
      id: "sv10-1",
      name: "Sprigatito",
      number: "1",
      set: { id: "sv10", name: "Scarlet & Violet 10" },
      images: { small: "https://images.pokemontcg.io/sv10/1.png" }
    }
  ];

  assertEquals(extractUniqueSets(cards), [
    { setId: "base1", setName: "Base Set" },
    { setId: "sv10", setName: "Scarlet & Violet 10" }
  ]);
});

Deno.test("extractUniqueSets returns empty array for no cards", () => {
  assertEquals(extractUniqueSets([]), []);
});
