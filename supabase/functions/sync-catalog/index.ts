import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { mapPokemonTcgCardToRow, type PokemonTcgApiCard } from "./transform.ts";

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  let page = 1;
  let totalUpserted = 0;

  while (true) {
    const response = await fetch(
      `https://api.pokemontcg.io/v2/cards?page=${page}&pageSize=250`,
      { headers: { "X-Api-Key": Deno.env.get("POKEMON_TCG_API_KEY") ?? "" } }
    );

    if (!response.ok) {
      return new Response(`Pokémon TCG API error: ${response.status}`, { status: 502 });
    }

    const body = await response.json();
    const cards: PokemonTcgApiCard[] = body.data;

    if (cards.length === 0) {
      break;
    }

    const rows = cards.map(mapPokemonTcgCardToRow);
    const { error } = await supabase.from("cards_catalog").upsert(rows, {
      onConflict: "external_id"
    });

    if (error) {
      return new Response(`Upsert error: ${error.message}`, { status: 500 });
    }

    totalUpserted += rows.length;
    page += 1;
  }

  return new Response(JSON.stringify({ upserted: totalUpserted }), {
    headers: { "Content-Type": "application/json" }
  });
});
