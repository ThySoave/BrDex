import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { extractTcgplayerMarketUsd, toBrl, type TcgplayerCard } from "./transform.ts";

Deno.serve(async () => {
  const rateEnv = Deno.env.get("USD_BRL_RATE");
  const rate = Number(rateEnv);

  if (!rateEnv || Number.isNaN(rate) || rate <= 0) {
    return new Response(
      "USD_BRL_RATE não configurada — defina a taxa de conversão USD→BRL nas secrets da function.",
      { status: 500 }
    );
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  let page = 1;
  let upserted = 0;
  let skipped = 0;

  while (true) {
    const response = await fetch(
      `https://api.pokemontcg.io/v2/cards?select=id,tcgplayer&page=${page}&pageSize=250`,
      { headers: { "X-Api-Key": Deno.env.get("POKEMON_TCG_API_KEY") ?? "" } }
    );

    if (!response.ok) {
      return new Response(`Pokémon TCG API error: ${response.status}`, { status: 502 });
    }

    const body = await response.json();
    const cards: TcgplayerCard[] = body.data;

    if (cards.length === 0) {
      break;
    }

    for (const card of cards) {
      const usd = extractTcgplayerMarketUsd(card);
      if (usd === null) {
        skipped += 1;
        continue;
      }

      const { data, error } = await supabase.rpc("upsert_reference_price", {
        p_external_id: card.id,
        p_language: "en",
        p_price_brl: toBrl(usd, rate),
        p_source: "tcgplayer"
      });

      if (error) {
        return new Response(`Upsert error: ${error.message}`, { status: 500 });
      }

      if (data === true) {
        upserted += 1;
      } else {
        skipped += 1;
      }
    }

    page += 1;
  }

  return new Response(JSON.stringify({ upserted, skipped }), {
    headers: { "Content-Type": "application/json" }
  });
});
