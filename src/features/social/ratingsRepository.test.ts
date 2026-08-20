jest.mock("../../lib/supabaseClient", () => ({
  getSupabaseClient: jest.fn()
}));

import { getSupabaseClient } from "../../lib/supabaseClient";
import { myRatedTradeIds, rateTrade, userRatingSummary } from "./ratingsRepository";

describe("rateTrade", () => {
  it("calls the rate_trade RPC with id, stars and comment", async () => {
    const rpcMock = jest.fn().mockResolvedValue({ error: null });

    (getSupabaseClient as jest.Mock).mockReturnValue({ rpc: rpcMock });

    await rateTrade("trade-1", 5, "negociação tranquila");

    expect(rpcMock).toHaveBeenCalledWith("rate_trade", {
      trade_id: "trade-1",
      stars: 5,
      comment: "negociação tranquila"
    });
  });

  it("throws when the RPC fails", async () => {
    const rpcMock = jest.fn().mockResolvedValue({ error: { message: "boom" } });

    (getSupabaseClient as jest.Mock).mockReturnValue({ rpc: rpcMock });

    await expect(rateTrade("trade-1", 4)).rejects.toThrow("boom");
  });
});

describe("myRatedTradeIds", () => {
  it("filters by the current user and maps trade ids", async () => {
    const inMock = jest.fn().mockResolvedValue({
      data: [{ trade_id: "trade-1" }, { trade_id: "trade-2" }],
      error: null
    });
    const eqMock = jest.fn().mockReturnValue({ in: inMock });
    const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
    const fromMock = jest.fn().mockReturnValue({ select: selectMock });
    const getUserMock = jest.fn().mockResolvedValue({ data: { user: { id: "user-1" } } });

    (getSupabaseClient as jest.Mock).mockReturnValue({
      from: fromMock,
      auth: { getUser: getUserMock }
    });

    const result = await myRatedTradeIds(["trade-1", "trade-2", "trade-3"]);

    expect(fromMock).toHaveBeenCalledWith("trade_ratings");
    expect(eqMock).toHaveBeenCalledWith("rater", "user-1");
    expect(inMock).toHaveBeenCalledWith("trade_id", ["trade-1", "trade-2", "trade-3"]);
    expect(result).toEqual(["trade-1", "trade-2"]);
  });

  it("returns [] for an empty list without querying", async () => {
    const fromMock = jest.fn();

    (getSupabaseClient as jest.Mock).mockReturnValue({ from: fromMock });

    const result = await myRatedTradeIds([]);

    expect(result).toEqual([]);
    expect(fromMock).not.toHaveBeenCalled();
  });
});

describe("userRatingSummary", () => {
  it("maps avg_stars and ratings_count from the RPC", async () => {
    const rpcMock = jest.fn().mockResolvedValue({
      data: [{ avg_stars: 4.5, ratings_count: 2 }],
      error: null
    });

    (getSupabaseClient as jest.Mock).mockReturnValue({ rpc: rpcMock });

    const result = await userRatingSummary("user-2");

    expect(rpcMock).toHaveBeenCalledWith("user_rating_summary", { target_user: "user-2" });
    expect(result).toEqual({ avgStars: 4.5, ratingsCount: 2 });
  });
});
