import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { parseFeed } from "./parse.ts";

const RSS_FIXTURE = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>PokéNews</title>
    <item>
      <title>Novo set Scarlet &amp; Violet anunciado</title>
      <description>A The Pokémon Company anunciou o próximo set da série.</description>
      <link>https://example.com/noticias/novo-set</link>
      <pubDate>Tue, 18 Aug 2026 12:00:00 GMT</pubDate>
    </item>
    <item>
      <title>Torneio regional confirmado</title>
      <link>https://example.com/noticias/torneio</link>
      <pubDate>Mon, 17 Aug 2026 09:30:00 GMT</pubDate>
    </item>
  </channel>
</rss>`;

const ATOM_FIXTURE = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>TCG Blog</title>
  <entry>
    <title>Análise do meta atual</title>
    <summary>Uma análise das cartas mais jogadas.</summary>
    <link href="https://example.com/blog/meta"/>
    <updated>2026-08-16T15:00:00Z</updated>
  </entry>
</feed>`;

Deno.test("parseFeed parses RSS 2.0 items", () => {
  const items = parseFeed(RSS_FIXTURE, "PokéNews");

  assertEquals(items.length, 2);
  assertEquals(items[0], {
    title: "Novo set Scarlet & Violet anunciado",
    summary: "A The Pokémon Company anunciou o próximo set da série.",
    url: "https://example.com/noticias/novo-set",
    source: "PokéNews",
    publishedAt: new Date("Tue, 18 Aug 2026 12:00:00 GMT").toISOString()
  });
});

Deno.test("parseFeed parses Atom entries", () => {
  const items = parseFeed(ATOM_FIXTURE, "TCG Blog");

  assertEquals(items, [{
    title: "Análise do meta atual",
    summary: "Uma análise das cartas mais jogadas.",
    url: "https://example.com/blog/meta",
    source: "TCG Blog",
    publishedAt: new Date("2026-08-16T15:00:00Z").toISOString()
  }]);
});

Deno.test("parseFeed uses empty summary when description is missing", () => {
  const items = parseFeed(RSS_FIXTURE, "PokéNews");

  assertEquals(items[1].summary, "");
});

Deno.test("parseFeed truncates descriptions longer than 300 chars with ellipsis", () => {
  const longDescription = "a".repeat(400);
  const xml = `<?xml version="1.0"?><rss version="2.0"><channel><item>
    <title>Notícia longa</title>
    <description>${longDescription}</description>
    <link>https://example.com/longa</link>
    <pubDate>Tue, 18 Aug 2026 12:00:00 GMT</pubDate>
  </item></channel></rss>`;

  const items = parseFeed(xml, "PokéNews");

  assertEquals(items[0].summary.length, 300);
  assertEquals(items[0].summary, "a".repeat(299) + "…");
});

Deno.test("parseFeed strips HTML tags from descriptions", () => {
  const xml = `<?xml version="1.0"?><rss version="2.0"><channel><item>
    <title>Com HTML</title>
    <description>&lt;p&gt;Texto com &lt;strong&gt;destaque&lt;/strong&gt; e link.&lt;/p&gt;</description>
    <link>https://example.com/html</link>
    <pubDate>Tue, 18 Aug 2026 12:00:00 GMT</pubDate>
  </item></channel></rss>`;

  const items = parseFeed(xml, "PokéNews");

  assertEquals(items[0].summary, "Texto com destaque e link.");
});
