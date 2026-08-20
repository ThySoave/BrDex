jest.mock("../../lib/supabaseClient", () => ({
  getSupabaseClient: jest.fn()
}));

import { getSupabaseClient } from "../../lib/supabaseClient";
import { addUserCard, countUserCards, listUserCards } from "./collectionRepository";

describe("addUserCard", () => {
  it("inserts a row into user_cards with the current user's id", async () => {
    const insertMock = jest.fn().mockResolvedValue({ error: null });
    const fromMock = jest.fn().mockReturnValue({ insert: insertMock });
    const getUserMock = jest.fn().mockResolvedValue({ data: { user: { id: "user-1" } } });

    (getSupabaseClient as jest.Mock).mockReturnValue({
      from: fromMock,
      auth: { getUser: getUserMock }
    });

    await addUserCard({
      catalogCardId: "card-1",
      language: "en",
      condition: "near_mint",
      pricePaid: 25.5,
      status: "guardada"
    });

    expect(fromMock).toHaveBeenCalledWith("user_cards");
    expect(insertMock).toHaveBeenCalledWith({
      user_id: "user-1",
      catalog_card_id: "card-1",
      language: "en",
      condition: "near_mint",
      price_paid: 25.5,
      status: "guardada"
    });
  });
});

describe("listUserCards", () => {
  it("joins user_cards with cards_catalog and maps to UserCard", async () => {
    const eqMock = jest.fn().mockResolvedValue({
      data: [
        {
          id: "uc-1",
          catalog_card_id: "card-1",
          language: "en",
          condition: "near_mint",
          price_paid: 25.5,
          status: "guardada",
          cards_catalog: { name: "Pikachu", image_url: "https://x/pikachu.png" }
        }
      ],
      error: null
    });
    const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
    const fromMock = jest.fn().mockReturnValue({ select: selectMock });
    const getUserMock = jest.fn().mockResolvedValue({ data: { user: { id: "user-1" } } });

    (getSupabaseClient as jest.Mock).mockReturnValue({
      from: fromMock,
      auth: { getUser: getUserMock }
    });

    const result = await listUserCards();

    expect(selectMock).toHaveBeenCalledWith(
      "id, catalog_card_id, language, condition, price_paid, status, cards_catalog(name, image_url)"
    );
    expect(eqMock).toHaveBeenCalledWith("user_id", "user-1");
    expect(result).toEqual([
      {
        id: "uc-1",
        catalogCardId: "card-1",
        cardName: "Pikachu",
        cardImageUrl: "https://x/pikachu.png",
        language: "en",
        condition: "near_mint",
        pricePaid: 25.5,
        status: "guardada"
      }
    ]);
  });
});

describe("countUserCards", () => {
  function mockClient(response: { count: number | null; error: { message: string } | null }) {
    const eqMock = jest.fn().mockResolvedValue(response);
    const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
    const fromMock = jest.fn().mockReturnValue({ select: selectMock });
    const getUserMock = jest.fn().mockResolvedValue({ data: { user: { id: "user-1" } } });

    (getSupabaseClient as jest.Mock).mockReturnValue({
      from: fromMock,
      auth: { getUser: getUserMock }
    });

    return { fromMock, selectMock, eqMock };
  }

  it("counts user_cards rows without fetching them", async () => {
    const { fromMock, selectMock, eqMock } = mockClient({ count: 42, error: null });

    const result = await countUserCards();

    expect(fromMock).toHaveBeenCalledWith("user_cards");
    expect(selectMock).toHaveBeenCalledWith("id", { count: "exact", head: true });
    expect(eqMock).toHaveBeenCalledWith("user_id", "user-1");
    expect(result).toBe(42);
  });

  it("returns 0 when count is null", async () => {
    mockClient({ count: null, error: null });

    await expect(countUserCards()).resolves.toBe(0);
  });

  it("throws when the query fails", async () => {
    mockClient({ count: null, error: { message: "boom" } });

    await expect(countUserCards()).rejects.toThrow("boom");
  });
});
