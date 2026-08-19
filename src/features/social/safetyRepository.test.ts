jest.mock("../../lib/supabaseClient", () => ({
  getSupabaseClient: jest.fn()
}));

import { getSupabaseClient } from "../../lib/supabaseClient";
import { blockUser, reportUser } from "./safetyRepository";

describe("blockUser", () => {
  it("inserts a block with the current user as blocker", async () => {
    const insertMock = jest.fn().mockResolvedValue({ error: null });
    const fromMock = jest.fn().mockReturnValue({ insert: insertMock });
    const getUserMock = jest.fn().mockResolvedValue({ data: { user: { id: "user-1" } } });

    (getSupabaseClient as jest.Mock).mockReturnValue({
      from: fromMock,
      auth: { getUser: getUserMock }
    });

    await blockUser("user-2");

    expect(fromMock).toHaveBeenCalledWith("blocks");
    expect(insertMock).toHaveBeenCalledWith({
      blocker_id: "user-1",
      blocked_id: "user-2"
    });
  });
});

describe("reportUser", () => {
  it("inserts a report with reason and context", async () => {
    const insertMock = jest.fn().mockResolvedValue({ error: null });
    const fromMock = jest.fn().mockReturnValue({ insert: insertMock });
    const getUserMock = jest.fn().mockResolvedValue({ data: { user: { id: "user-1" } } });

    (getSupabaseClient as jest.Mock).mockReturnValue({
      from: fromMock,
      auth: { getUser: getUserMock }
    });

    await reportUser("user-2", "spam", "conversa conv-1");

    expect(fromMock).toHaveBeenCalledWith("reports");
    expect(insertMock).toHaveBeenCalledWith({
      reporter_id: "user-1",
      reported_id: "user-2",
      reason: "spam",
      context: "conversa conv-1"
    });
  });

  it("throws when the insert fails", async () => {
    const insertMock = jest.fn().mockResolvedValue({ error: { message: "boom" } });
    const fromMock = jest.fn().mockReturnValue({ insert: insertMock });
    const getUserMock = jest.fn().mockResolvedValue({ data: { user: { id: "user-1" } } });

    (getSupabaseClient as jest.Mock).mockReturnValue({
      from: fromMock,
      auth: { getUser: getUserMock }
    });

    await expect(reportUser("user-2", "spam", "conversa conv-1")).rejects.toThrow("boom");
  });
});
