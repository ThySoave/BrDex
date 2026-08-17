jest.mock("../../lib/supabaseClient", () => ({
  getSupabaseClient: jest.fn()
}));

import { getSupabaseClient } from "../../lib/supabaseClient";
import { fetchCatalogPage } from "./catalogRepository";

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
