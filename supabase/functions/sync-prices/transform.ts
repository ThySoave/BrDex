interface VariantPrices {
  market?: number;
  [key: string]: number | undefined;
}

export interface TcgplayerCard {
  id: string;
  tcgplayer?: {
    prices?: Record<string, VariantPrices>;
  };
}

const PREFERRED_VARIANTS = ["normal", "holofoil", "reverseHolofoil"];

export function extractTcgplayerMarketUsd(card: TcgplayerCard): number | null {
  const prices = card.tcgplayer?.prices;
  if (!prices) {
    return null;
  }

  for (const variant of PREFERRED_VARIANTS) {
    const market = prices[variant]?.market;
    if (typeof market === "number") {
      return market;
    }
  }

  for (const variant of Object.keys(prices)) {
    const market = prices[variant]?.market;
    if (typeof market === "number") {
      return market;
    }
  }

  return null;
}

export function toBrl(usd: number, rate: number): number {
  return Math.round(usd * rate * 100) / 100;
}
