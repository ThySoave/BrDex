jest.mock("../../lib/supabaseClient", () => ({
  getSupabaseClient: jest.fn()
}));

import { getSupabaseClient } from "../../lib/supabaseClient";
import { fetchCardPrices } from "./pricingRepository";

function chainReturning(result: unknown) {
  const maybeSingleMock = jest.fn().mockResolvedValue(result);
  const eq2 = jest.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
  const eq1 = jest.fn().mockReturnValue({ eq: eq2 });
  const select = jest.fn().mockReturnValue({ eq: eq1 });
  return { select, eq1, eq2 };
}

describe("fetchCardPrices", () => {
  it("returns community and EN reference prices mapped to camelCase", async () => {
    const community = chainReturning({
      data: { median_price: 10.5, min_price: 10, max_price: 12, sample_count: 4 },
      error: null
    });
    const reference = chainReturning({
      data: { price_brl: 42.9, source: "seed-manual" },
      error: null
    });
    const fromMock = jest.fn((table: string) =>
      table === "price_community" ? { select: community.select } : { select: reference.select }
    );
    (getSupabaseClient as jest.Mock).mockReturnValue({ from: fromMock });

    const result = await fetchCardPrices("card-1", "en");

    expect(fromMock).toHaveBeenCalledWith("price_community");
    expect(fromMock).toHaveBeenCalledWith("price_reference");
    expect(community.eq1).toHaveBeenCalledWith("catalog_card_id", "card-1");
    expect(community.eq2).toHaveBeenCalledWith("language", "en");
    expect(result).toEqual({
      community: { medianPrice: 10.5, minPrice: 10, maxPrice: 12, sampleCount: 4 },
      reference: { priceBrl: 42.9, source: "seed-manual" }
    });
  });

  it("does not query price_reference for non-EN copies", async () => {
    const community = chainReturning({ data: null, error: null });
    const fromMock = jest.fn().mockReturnValue({ select: community.select });
    (getSupabaseClient as jest.Mock).mockReturnValue({ from: fromMock });

    const result = await fetchCardPrices("card-1", "pt");

    expect(fromMock).toHaveBeenCalledTimes(1);
    expect(fromMock).toHaveBeenCalledWith("price_community");
    expect(result).toEqual({ community: null, reference: null });
  });

  it("throws when the community query errors", async () => {
    const community = chainReturning({ data: null, error: { message: "boom" } });
    const fromMock = jest.fn().mockReturnValue({ select: community.select });
    (getSupabaseClient as jest.Mock).mockReturnValue({ from: fromMock });

    await expect(fetchCardPrices("card-1", "en")).rejects.toThrow("boom");
  });
});
