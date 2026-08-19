jest.mock("../../lib/supabaseClient", () => ({
  getSupabaseClient: jest.fn()
}));

import { getSupabaseClient } from "../../lib/supabaseClient";
import {
  completedTradesCount,
  confirmTrade,
  listTrades,
  proposeTrade
} from "./tradesRepository";

describe("listTrades", () => {
  it("lists trades for a conversation ordered by newest first", async () => {
    const orderMock = jest.fn().mockResolvedValue({
      data: [
        {
          id: "trade-1",
          conversation_id: "conv-1",
          proposed_by: "user-1",
          created_at: "2026-08-19T10:00:00Z",
          confirmed_at: null
        }
      ],
      error: null
    });
    const eqMock = jest.fn().mockReturnValue({ order: orderMock });
    const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
    const fromMock = jest.fn().mockReturnValue({ select: selectMock });

    (getSupabaseClient as jest.Mock).mockReturnValue({ from: fromMock });

    const result = await listTrades("conv-1");

    expect(fromMock).toHaveBeenCalledWith("trades");
    expect(eqMock).toHaveBeenCalledWith("conversation_id", "conv-1");
    expect(orderMock).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(result).toEqual([
      {
        id: "trade-1",
        conversationId: "conv-1",
        proposedBy: "user-1",
        createdAt: "2026-08-19T10:00:00Z",
        confirmedAt: null
      }
    ]);
  });

  it("throws when the query fails", async () => {
    const orderMock = jest.fn().mockResolvedValue({ data: null, error: { message: "boom" } });
    const eqMock = jest.fn().mockReturnValue({ order: orderMock });
    const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
    const fromMock = jest.fn().mockReturnValue({ select: selectMock });

    (getSupabaseClient as jest.Mock).mockReturnValue({ from: fromMock });

    await expect(listTrades("conv-1")).rejects.toThrow("boom");
  });
});

describe("proposeTrade", () => {
  it("inserts a trade proposed by the current user", async () => {
    const insertMock = jest.fn().mockResolvedValue({ error: null });
    const fromMock = jest.fn().mockReturnValue({ insert: insertMock });
    const getUserMock = jest.fn().mockResolvedValue({ data: { user: { id: "user-1" } } });

    (getSupabaseClient as jest.Mock).mockReturnValue({
      from: fromMock,
      auth: { getUser: getUserMock }
    });

    await proposeTrade("conv-1");

    expect(fromMock).toHaveBeenCalledWith("trades");
    expect(insertMock).toHaveBeenCalledWith({
      conversation_id: "conv-1",
      proposed_by: "user-1"
    });
  });
});

describe("confirmTrade", () => {
  it("calls the confirm_trade RPC with the trade id", async () => {
    const rpcMock = jest.fn().mockResolvedValue({ error: null });

    (getSupabaseClient as jest.Mock).mockReturnValue({ rpc: rpcMock });

    await confirmTrade("trade-1");

    expect(rpcMock).toHaveBeenCalledWith("confirm_trade", { trade_id: "trade-1" });
  });
});

describe("completedTradesCount", () => {
  it("returns the count from the RPC", async () => {
    const rpcMock = jest.fn().mockResolvedValue({ data: 3, error: null });

    (getSupabaseClient as jest.Mock).mockReturnValue({ rpc: rpcMock });

    const result = await completedTradesCount("user-2");

    expect(rpcMock).toHaveBeenCalledWith("completed_trades_count", { target_user: "user-2" });
    expect(result).toBe(3);
  });
});
