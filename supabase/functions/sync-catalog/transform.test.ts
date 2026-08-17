import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { mapPokemonTcgCardToRow } from "./transform.ts";

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
