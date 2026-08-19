import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { parseFeed } from "./parse.ts";

// Fontes públicas com RSS/Atom do universo Pokémon TCG.
// O site oficial pokemon.com não publica RSS público, então fica de fora.
const FEEDS = [
  { name: "PokéBeach", url: "https://www.pokebeach.com/feed" },
  { name: "Serebii", url: "https://www.serebii.net/index.xml" },
  { name: "PokéGuardian", url: "https://www.pokeguardian.com/index.rss" }
];

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  let totalUpserted = 0;
  const failures: string[] = [];

  for (const feed of FEEDS) {
    try {
      const response = await fetch(feed.url);
      if (!response.ok) {
        failures.push(`${feed.name}: HTTP ${response.status}`);
        continue;
      }

      const xml = await response.text();
      const items = parseFeed(xml, feed.name);
      if (items.length === 0) {
        continue;
      }

      const rows = items.map((item) => ({
        title: item.title,
        summary: item.summary,
        url: item.url,
        source: item.source,
        published_at: item.publishedAt
      }));

      const { error } = await supabase.from("news_items").upsert(rows, {
        onConflict: "url",
        ignoreDuplicates: true
      });

      if (error) {
        failures.push(`${feed.name}: upsert error ${error.message}`);
        continue;
      }

      totalUpserted += rows.length;
    } catch (err) {
      failures.push(`${feed.name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return new Response(JSON.stringify({ upserted: totalUpserted, failures }), {
    headers: { "Content-Type": "application/json" }
  });
});
