jest.mock("../../lib/supabaseClient", () => ({
  getSupabaseClient: jest.fn()
}));

import { getSupabaseClient } from "../../lib/supabaseClient";
import {
  addUserCard,
  countUserCards,
  listUserCards,
  markCardAsSold,
  updateCardStatus
} from "./collectionRepository";

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
      status: "guardada",
      photoUrl: "https://cdn.supabase.co/card-photos/user-1/1.jpg"
    });

    expect(fromMock).toHaveBeenCalledWith("user_cards");
    expect(insertMock).toHaveBeenCalledWith({
      user_id: "user-1",
      catalog_card_id: "card-1",
      language: "en",
      condition: "near_mint",
      price_paid: 25.5,
      status: "guardada",
      photo_url: "https://cdn.supabase.co/card-photos/user-1/1.jpg"
    });
  });
});

describe("listUserCards", () => {
  it("joins user_cards with cards_catalog, excludes sold cards and maps to UserCard", async () => {
    const neqMock = jest.fn().mockResolvedValue({
      data: [
        {
          id: "uc-1",
          catalog_card_id: "card-1",
          language: "en",
          condition: "near_mint",
          price_paid: 25.5,
          status: "guardada",
          photo_url: "https://cdn.supabase.co/card-photos/user-1/1.jpg",
          cards_catalog: { name: "Pikachu", image_url: "https://x/pikachu.png" }
        }
      ],
      error: null
    });
    const eqMock = jest.fn().mockReturnValue({ neq: neqMock });
    const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
    const fromMock = jest.fn().mockReturnValue({ select: selectMock });
    const getUserMock = jest.fn().mockResolvedValue({ data: { user: { id: "user-1" } } });

    (getSupabaseClient as jest.Mock).mockReturnValue({
      from: fromMock,
      auth: { getUser: getUserMock }
    });

    const result = await listUserCards();

    expect(selectMock).toHaveBeenCalledWith(
      "id, catalog_card_id, language, condition, price_paid, status, photo_url, cards_catalog(name, image_url)"
    );
    expect(eqMock).toHaveBeenCalledWith("user_id", "user-1");
    expect(neqMock).toHaveBeenCalledWith("status", "vendida");
    expect(result).toEqual([
      {
        id: "uc-1",
        catalogCardId: "card-1",
        cardName: "Pikachu",
        cardImageUrl: "https://x/pikachu.png",
        language: "en",
        condition: "near_mint",
        pricePaid: 25.5,
        status: "guardada",
        photoUrl: "https://cdn.supabase.co/card-photos/user-1/1.jpg"
      }
    ]);
  });
});

describe("countUserCards", () => {
  function mockClient(response: { count: number | null; error: { message: string } | null }) {
    const neqMock = jest.fn().mockResolvedValue(response);
    const eqMock = jest.fn().mockReturnValue({ neq: neqMock });
    const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
    const fromMock = jest.fn().mockReturnValue({ select: selectMock });
    const getUserMock = jest.fn().mockResolvedValue({ data: { user: { id: "user-1" } } });

    (getSupabaseClient as jest.Mock).mockReturnValue({
      from: fromMock,
      auth: { getUser: getUserMock }
    });

    return { fromMock, selectMock, eqMock, neqMock };
  }

  it("counts unsold user_cards rows without fetching them", async () => {
    const { fromMock, selectMock, eqMock, neqMock } = mockClient({ count: 42, error: null });

    const result = await countUserCards();

    expect(fromMock).toHaveBeenCalledWith("user_cards");
    expect(selectMock).toHaveBeenCalledWith("id", { count: "exact", head: true });
    expect(eqMock).toHaveBeenCalledWith("user_id", "user-1");
    expect(neqMock).toHaveBeenCalledWith("status", "vendida");
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

describe("markCardAsSold", () => {
  function mockClient(response: { error: { message: string } | null }) {
    const eqUserMock = jest.fn().mockResolvedValue(response);
    const eqIdMock = jest.fn().mockReturnValue({ eq: eqUserMock });
    const updateMock = jest.fn().mockReturnValue({ eq: eqIdMock });
    const fromMock = jest.fn().mockReturnValue({ update: updateMock });
    const getUserMock = jest.fn().mockResolvedValue({ data: { user: { id: "user-1" } } });

    (getSupabaseClient as jest.Mock).mockReturnValue({
      from: fromMock,
      auth: { getUser: getUserMock }
    });

    return { fromMock, updateMock, eqIdMock, eqUserMock };
  }

  it("updates the card with the sale price and sold status scoped to the user", async () => {
    const { fromMock, updateMock, eqIdMock, eqUserMock } = mockClient({ error: null });

    await markCardAsSold("uc-1", 30.5);

    expect(fromMock).toHaveBeenCalledWith("user_cards");
    expect(updateMock).toHaveBeenCalledWith({ price_sold: 30.5, status: "vendida" });
    expect(eqIdMock).toHaveBeenCalledWith("id", "uc-1");
    expect(eqUserMock).toHaveBeenCalledWith("user_id", "user-1");
  });

  it("throws when the update fails", async () => {
    mockClient({ error: { message: "boom" } });

    await expect(markCardAsSold("uc-1", 30.5)).rejects.toThrow("boom");
  });
});

describe("updateCardStatus", () => {
  function mockClient(response: { error: { message: string } | null }) {
    const eqUserMock = jest.fn().mockResolvedValue(response);
    const eqIdMock = jest.fn().mockReturnValue({ eq: eqUserMock });
    const updateMock = jest.fn().mockReturnValue({ eq: eqIdMock });
    const fromMock = jest.fn().mockReturnValue({ update: updateMock });
    const getUserMock = jest.fn().mockResolvedValue({ data: { user: { id: "user-1" } } });

    (getSupabaseClient as jest.Mock).mockReturnValue({
      from: fromMock,
      auth: { getUser: getUserMock }
    });

    return { fromMock, updateMock, eqIdMock, eqUserMock };
  }

  it("updates the card status scoped to the user", async () => {
    const { fromMock, updateMock, eqIdMock, eqUserMock } = mockClient({ error: null });

    await updateCardStatus("uc-1", "a_venda");

    expect(fromMock).toHaveBeenCalledWith("user_cards");
    expect(updateMock).toHaveBeenCalledWith({ status: "a_venda" });
    expect(eqIdMock).toHaveBeenCalledWith("id", "uc-1");
    expect(eqUserMock).toHaveBeenCalledWith("user_id", "user-1");
  });

  it("throws when the update fails", async () => {
    mockClient({ error: { message: "boom" } });

    await expect(updateCardStatus("uc-1", "guardada")).rejects.toThrow("boom");
  });
});
