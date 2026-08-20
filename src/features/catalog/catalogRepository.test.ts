jest.mock("../../lib/supabaseClient", () => ({
  getSupabaseClient: jest.fn()
}));

import { getSupabaseClient } from "../../lib/supabaseClient";
import { fetchCatalogPage, searchCatalogByName } from "./catalogRepository";

describe("fetchCatalogPage", () => {
  it("queries cards_catalog ordered by name and maps rows to CatalogCard", async () => {
    const rangeMock = jest.fn().mockResolvedValue({
      data: [
        {
          id: "1",
          name: "Pikachu",
          number: "25",
          set_name: "Base Set",
          rarity: "Common",
          image_url: "https://x/pikachu.png"
        }
      ],
      error: null
    });
    const orderMock = jest.fn().mockReturnValue({ range: rangeMock });
    const selectMock = jest.fn().mockReturnValue({ order: orderMock });
    const fromMock = jest.fn().mockReturnValue({ select: selectMock });

    (getSupabaseClient as jest.Mock).mockReturnValue({ from: fromMock });

    const result = await fetchCatalogPage(0);

    expect(fromMock).toHaveBeenCalledWith("cards_catalog");
    expect(orderMock).toHaveBeenCalledWith("name", { ascending: true });
    expect(rangeMock).toHaveBeenCalledWith(0, 49);
    expect(result).toEqual([
      {
        id: "1",
        name: "Pikachu",
        number: "25",
        setName: "Base Set",
        rarity: "Common",
        imageUrl: "https://x/pikachu.png"
      }
    ]);
  });

  it("throws when Supabase returns an error", async () => {
    const rangeMock = jest.fn().mockResolvedValue({ data: null, error: { message: "network down" } });
    const orderMock = jest.fn().mockReturnValue({ range: rangeMock });
    const selectMock = jest.fn().mockReturnValue({ order: orderMock });
    const fromMock = jest.fn().mockReturnValue({ select: selectMock });
    (getSupabaseClient as jest.Mock).mockReturnValue({ from: fromMock });

    await expect(fetchCatalogPage(0)).rejects.toThrow("network down");
  });
});

describe("searchCatalogByName", () => {
  it("searches cards_catalog with ilike and maps rows to CatalogCard", async () => {
    const limitMock = jest.fn().mockResolvedValue({
      data: [
        {
          id: "base1-4",
          name: "Charizard",
          number: "4",
          set_name: "Base",
          rarity: "Rare Holo",
          image_url: "https://x/charizard.png"
        }
      ],
      error: null
    });
    const ilikeMock = jest.fn().mockReturnValue({ limit: limitMock });
    const selectMock = jest.fn().mockReturnValue({ ilike: ilikeMock });
    const fromMock = jest.fn().mockReturnValue({ select: selectMock });
    (getSupabaseClient as jest.Mock).mockReturnValue({ from: fromMock });

    const result = await searchCatalogByName("Charizard");

    expect(fromMock).toHaveBeenCalledWith("cards_catalog");
    expect(ilikeMock).toHaveBeenCalledWith("name", "%Charizard%");
    expect(result).toEqual([
      {
        id: "base1-4",
        name: "Charizard",
        number: "4",
        setName: "Base",
        rarity: "Rare Holo",
        imageUrl: "https://x/charizard.png"
      }
    ]);
  });

  it("throws when Supabase returns an error", async () => {
    const limitMock = jest.fn().mockResolvedValue({ data: null, error: { message: "search failed" } });
    const ilikeMock = jest.fn().mockReturnValue({ limit: limitMock });
    const selectMock = jest.fn().mockReturnValue({ ilike: ilikeMock });
    const fromMock = jest.fn().mockReturnValue({ select: selectMock });
    (getSupabaseClient as jest.Mock).mockReturnValue({ from: fromMock });

    await expect(searchCatalogByName("Charizard")).rejects.toThrow("search failed");
  });
});
