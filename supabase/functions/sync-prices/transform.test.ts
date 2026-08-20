import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { extractTcgplayerMarketUsd, toBrl } from "./transform.ts";

Deno.test("extractTcgplayerMarketUsd prefers the normal variant market price", () => {
  const card = {
    id: "base1-25",
    tcgplayer: {
      prices: {
        normal: { market: 10.5 },
        holofoil: { market: 99.9 }
      }
    }
  };

  assertEquals(extractTcgplayerMarketUsd(card), 10.5);
});

Deno.test("extractTcgplayerMarketUsd falls back to holofoil when normal is absent", () => {
  const card = {
    id: "base1-4",
    tcgplayer: {
      prices: {
        holofoil: { market: 250.0 },
        reverseHolofoil: { market: 40.0 }
      }
    }
  };

  assertEquals(extractTcgplayerMarketUsd(card), 250.0);
});

Deno.test("extractTcgplayerMarketUsd uses the first available variant otherwise", () => {
  const card = {
    id: "swsh1-1",
    tcgplayer: {
      prices: {
        "1stEditionHolofoil": { market: 500.0 }
      }
    }
  };

  assertEquals(extractTcgplayerMarketUsd(card), 500.0);
});

Deno.test("extractTcgplayerMarketUsd returns null without tcgplayer prices or market", () => {
  assertEquals(extractTcgplayerMarketUsd({ id: "x" }), null);
  assertEquals(extractTcgplayerMarketUsd({ id: "y", tcgplayer: {} }), null);
  assertEquals(
    extractTcgplayerMarketUsd({ id: "z", tcgplayer: { prices: { normal: { low: 1.0 } } } }),
    null
  );
});

Deno.test("toBrl converts with the given rate and rounds to 2 decimals", () => {
  assertEquals(toBrl(10, 5.25), 52.5);
  assertEquals(toBrl(0.333, 5.0), 1.67);
});
