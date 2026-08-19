jest.mock("../../lib/supabaseClient", () => ({
  getSupabaseClient: jest.fn()
}));

import { getSupabaseClient } from "../../lib/supabaseClient";
import { listMatches } from "./matchesRepository";

describe("listMatches", () => {
  it("maps rows to MatchItem with role based on the current user", async () => {
    const selectMock = jest.fn().mockResolvedValue({
      data: [
        {
          id: "match-1",
          wanter_id: "user-1",
          owner_id: "user-2",
          user_cards: { cards_catalog: { name: "Pikachu", image_url: "https://x/pikachu.png" } }
        },
        {
          id: "match-2",
          wanter_id: "user-3",
          owner_id: "user-1",
          user_cards: { cards_catalog: { name: "Charizard", image_url: "https://x/charizard.png" } }
        }
      ],
      error: null
    });
    const fromMock = jest.fn().mockReturnValue({ select: selectMock });
    const getUserMock = jest.fn().mockResolvedValue({ data: { user: { id: "user-1" } } });

    (getSupabaseClient as jest.Mock).mockReturnValue({
      from: fromMock,
      auth: { getUser: getUserMock }
    });

    const result = await listMatches();

    expect(fromMock).toHaveBeenCalledWith("matches");
    expect(selectMock).toHaveBeenCalledWith(
      "id, wanter_id, owner_id, user_cards(cards_catalog(name, image_url))"
    );
    expect(result).toEqual([
      {
        id: "match-1",
        role: "quero",
        otherUserId: "user-2",
        cardName: "Pikachu",
        cardImageUrl: "https://x/pikachu.png"
      },
      {
        id: "match-2",
        role: "tenho",
        otherUserId: "user-3",
        cardName: "Charizard",
        cardImageUrl: "https://x/charizard.png"
      }
    ]);
  });

  it("throws when the select fails", async () => {
    const selectMock = jest.fn().mockResolvedValue({ data: null, error: { message: "boom" } });
    const fromMock = jest.fn().mockReturnValue({ select: selectMock });
    const getUserMock = jest.fn().mockResolvedValue({ data: { user: { id: "user-1" } } });

    (getSupabaseClient as jest.Mock).mockReturnValue({
      from: fromMock,
      auth: { getUser: getUserMock }
    });

    await expect(listMatches()).rejects.toThrow("boom");
  });
});
