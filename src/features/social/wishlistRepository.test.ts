jest.mock("../../lib/supabaseClient", () => ({
  getSupabaseClient: jest.fn()
}));

import { getSupabaseClient } from "../../lib/supabaseClient";
import { addToWishlist, listWishlist, removeFromWishlist } from "./wishlistRepository";

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

describe("listWishlist", () => {
  it("queries the wishlist with the catalog join and maps rows", async () => {
    const orderMock = jest.fn().mockResolvedValue({
      data: [
        {
          id: "wish-1",
          catalog_card_id: "card-1",
          language: null,
          cards_catalog: { name: "Pikachu", image_url: "https://img/pikachu.png" }
        },
        {
          id: "wish-2",
          catalog_card_id: "card-2",
          language: "pt",
          cards_catalog: { name: "Charizard", image_url: "https://img/charizard.png" }
        }
      ],
      error: null
    });
    const eqMock = jest.fn().mockReturnValue({ order: orderMock });
    const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
    const fromMock = jest.fn().mockReturnValue({ select: selectMock });
    const getUserMock = jest.fn().mockResolvedValue({ data: { user: { id: "user-1" } } });

    (getSupabaseClient as jest.Mock).mockReturnValue({
      from: fromMock,
      auth: { getUser: getUserMock }
    });

    const items = await listWishlist();

    expect(fromMock).toHaveBeenCalledWith("wishlist");
    expect(selectMock).toHaveBeenCalledWith(
      "id, catalog_card_id, language, cards_catalog(name, image_url)"
    );
    expect(eqMock).toHaveBeenCalledWith("user_id", "user-1");
    expect(orderMock).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(items).toEqual([
      {
        id: "wish-1",
        catalogCardId: "card-1",
        cardName: "Pikachu",
        cardImageUrl: "https://img/pikachu.png",
        language: null
      },
      {
        id: "wish-2",
        catalogCardId: "card-2",
        cardName: "Charizard",
        cardImageUrl: "https://img/charizard.png",
        language: "pt"
      }
    ]);
  });

  it("throws when the select fails", async () => {
    const orderMock = jest.fn().mockResolvedValue({ data: null, error: { message: "boom" } });
    const eqMock = jest.fn().mockReturnValue({ order: orderMock });
    const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
    const fromMock = jest.fn().mockReturnValue({ select: selectMock });
    const getUserMock = jest.fn().mockResolvedValue({ data: { user: { id: "user-1" } } });

    (getSupabaseClient as jest.Mock).mockReturnValue({
      from: fromMock,
      auth: { getUser: getUserMock }
    });

    await expect(listWishlist()).rejects.toThrow("boom");
  });
});

describe("removeFromWishlist", () => {
  it("deletes the wishlist row filtering by id and user_id", async () => {
    const secondEqMock = jest.fn().mockResolvedValue({ error: null });
    const firstEqMock = jest.fn().mockReturnValue({ eq: secondEqMock });
    const deleteMock = jest.fn().mockReturnValue({ eq: firstEqMock });
    const fromMock = jest.fn().mockReturnValue({ delete: deleteMock });
    const getUserMock = jest.fn().mockResolvedValue({ data: { user: { id: "user-1" } } });

    (getSupabaseClient as jest.Mock).mockReturnValue({
      from: fromMock,
      auth: { getUser: getUserMock }
    });

    await removeFromWishlist("wish-1");

    expect(fromMock).toHaveBeenCalledWith("wishlist");
    expect(deleteMock).toHaveBeenCalled();
    expect(firstEqMock).toHaveBeenCalledWith("id", "wish-1");
    expect(secondEqMock).toHaveBeenCalledWith("user_id", "user-1");
  });

  it("throws when the delete fails", async () => {
    const secondEqMock = jest.fn().mockResolvedValue({ error: { message: "denied" } });
    const firstEqMock = jest.fn().mockReturnValue({ eq: secondEqMock });
    const deleteMock = jest.fn().mockReturnValue({ eq: firstEqMock });
    const fromMock = jest.fn().mockReturnValue({ delete: deleteMock });
    const getUserMock = jest.fn().mockResolvedValue({ data: { user: { id: "user-1" } } });

    (getSupabaseClient as jest.Mock).mockReturnValue({
      from: fromMock,
      auth: { getUser: getUserMock }
    });

    await expect(removeFromWishlist("wish-1")).rejects.toThrow("denied");
  });
});
