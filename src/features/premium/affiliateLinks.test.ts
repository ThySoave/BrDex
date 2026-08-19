import { buildTcgplayerSearchUrl, TCGPLAYER_AFFILIATE_ID } from "./affiliateLinks";

describe("buildTcgplayerSearchUrl", () => {
  it("builds a search url with the card name url-encoded", () => {
    expect(buildTcgplayerSearchUrl("Mr. Mime & Pikachu")).toBe(
      `https://www.tcgplayer.com/search/pokemon/product?q=Mr.%20Mime%20%26%20Pikachu&utm_campaign=affiliate&utm_source=${TCGPLAYER_AFFILIATE_ID}`
    );
  });

  it("includes the affiliate id as utm_source", () => {
    const url = buildTcgplayerSearchUrl("Charizard");
    expect(url).toContain(`utm_source=${TCGPLAYER_AFFILIATE_ID}`);
    expect(TCGPLAYER_AFFILIATE_ID).toBe("brdex-placeholder");
  });
});
