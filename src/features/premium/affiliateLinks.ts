export const TCGPLAYER_AFFILIATE_ID = "brdex-placeholder";

export function buildTcgplayerSearchUrl(cardName: string): string {
  const query = encodeURIComponent(cardName);
  return `https://www.tcgplayer.com/search/pokemon/product?q=${query}&utm_campaign=affiliate&utm_source=${TCGPLAYER_AFFILIATE_ID}`;
}
