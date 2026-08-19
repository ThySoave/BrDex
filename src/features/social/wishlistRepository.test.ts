jest.mock("../../lib/supabaseClient", () => ({
  getSupabaseClient: jest.fn()
}));

import { getSupabaseClient } from "../../lib/supabaseClient";
import { addToWishlist } from "./wishlistRepository";

describe("addToWishlist", () => {
  it("inserts a row into wishlist with the current user's id", async () => {
    const insertMock = jest.fn().mockResolvedValue({ error: null });
    const fromMock = jest.fn().mockReturnValue({ insert: insertMock });
    const getUserMock = jest.fn().mockResolvedValue({ data: { user: { id: "user-1" } } });

    (getSupabaseClient as jest.Mock).mockReturnValue({
      from: fromMock,
      auth: { getUser: getUserMock }
    });

    await addToWishlist("card-1", null);

    expect(fromMock).toHaveBeenCalledWith("wishlist");
    expect(insertMock).toHaveBeenCalledWith({
      user_id: "user-1",
      catalog_card_id: "card-1",
      language: null
    });
  });

  it("throws when the insert fails", async () => {
    const insertMock = jest.fn().mockResolvedValue({ error: { message: "duplicate key" } });
    const fromMock = jest.fn().mockReturnValue({ insert: insertMock });
    const getUserMock = jest.fn().mockResolvedValue({ data: { user: { id: "user-1" } } });

    (getSupabaseClient as jest.Mock).mockReturnValue({
      from: fromMock,
      auth: { getUser: getUserMock }
    });

    await expect(addToWishlist("card-1", "en")).rejects.toThrow("duplicate key");
  });
});
