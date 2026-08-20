jest.mock("../../lib/supabaseClient", () => ({
  getSupabaseClient: jest.fn()
}));

import { getSupabaseClient } from "../../lib/supabaseClient";
import { searchMarketListings } from "./marketRepository";

describe("searchMarketListings", () => {
  it("maps the RPC rows called with the search text", async () => {
    const rpcMock = jest.fn().mockResolvedValue({
      data: [
        {
          user_card_id: "uc-1",
          catalog_card_id: "card-1",
          card_name: "Pikachu",
          card_image_url: "https://example.com/25.png",
          language: "en",
          condition: "near_mint",
          status: "a_venda",
          seller_id: "user-2",
          seller_verified: true
        }
      ],
      error: null
    });

    (getSupabaseClient as jest.Mock).mockReturnValue({ rpc: rpcMock });

    const result = await searchMarketListings("Pika");

    expect(rpcMock).toHaveBeenCalledWith("search_market_listings", { search_text: "Pika" });
    expect(result).toEqual([
      {
        userCardId: "uc-1",
        catalogCardId: "card-1",
        cardName: "Pikachu",
        cardImageUrl: "https://example.com/25.png",
        language: "en",
        condition: "near_mint",
        status: "a_venda",
        sellerId: "user-2",
        sellerVerified: true
      }
    ]);
  });

  it("throws when the rpc fails", async () => {
    const rpcMock = jest.fn().mockResolvedValue({ data: null, error: { message: "boom" } });

    (getSupabaseClient as jest.Mock).mockReturnValue({ rpc: rpcMock });

    await expect(searchMarketListings("")).rejects.toThrow("boom");
  });
});
