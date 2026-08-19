jest.mock("../../lib/supabaseClient", () => ({
  getSupabaseClient: jest.fn()
}));

import { getSupabaseClient } from "../../lib/supabaseClient";
import { isPremium } from "./entitlementsRepository";

describe("isPremium", () => {
  it("returns true when the rpc reports an active subscription", async () => {
    const rpcMock = jest.fn().mockResolvedValue({ data: true, error: null });
    const getUserMock = jest.fn().mockResolvedValue({ data: { user: { id: "user-1" } } });

    (getSupabaseClient as jest.Mock).mockReturnValue({
      rpc: rpcMock,
      auth: { getUser: getUserMock }
    });

    await expect(isPremium()).resolves.toBe(true);
    expect(rpcMock).toHaveBeenCalledWith("is_premium", { uid: "user-1" });
  });

  it("returns false when the user has no active subscription", async () => {
    const rpcMock = jest.fn().mockResolvedValue({ data: false, error: null });
    const getUserMock = jest.fn().mockResolvedValue({ data: { user: { id: "user-1" } } });

    (getSupabaseClient as jest.Mock).mockReturnValue({
      rpc: rpcMock,
      auth: { getUser: getUserMock }
    });

    await expect(isPremium()).resolves.toBe(false);
  });

  it("throws when the rpc fails", async () => {
    const rpcMock = jest.fn().mockResolvedValue({ data: null, error: { message: "boom" } });
    const getUserMock = jest.fn().mockResolvedValue({ data: { user: { id: "user-1" } } });

    (getSupabaseClient as jest.Mock).mockReturnValue({
      rpc: rpcMock,
      auth: { getUser: getUserMock }
    });

    await expect(isPremium()).rejects.toThrow("boom");
  });

  it("returns false without calling the rpc when no user is logged in", async () => {
    const rpcMock = jest.fn();
    const getUserMock = jest.fn().mockResolvedValue({ data: { user: null } });

    (getSupabaseClient as jest.Mock).mockReturnValue({
      rpc: rpcMock,
      auth: { getUser: getUserMock }
    });

    await expect(isPremium()).resolves.toBe(false);
    expect(rpcMock).not.toHaveBeenCalled();
  });
});
