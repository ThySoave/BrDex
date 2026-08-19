jest.mock("../../lib/supabaseClient", () => ({
  getSupabaseClient: jest.fn()
}));

import { getSupabaseClient } from "../../lib/supabaseClient";
import { fetchSetProgress } from "./setProgressRepository";

describe("fetchSetProgress", () => {
  it("calls the set_progress rpc and maps rows to SetProgress", async () => {
    const rpcMock = jest.fn().mockResolvedValue({
      data: [{ set_id: "base1", set_name: "Base Set", owned: 2, total: 3 }],
      error: null
    });
    const getUserMock = jest.fn().mockResolvedValue({ data: { user: { id: "user-1" } } });

    (getSupabaseClient as jest.Mock).mockReturnValue({
      rpc: rpcMock,
      auth: { getUser: getUserMock }
    });

    const result = await fetchSetProgress();

    expect(rpcMock).toHaveBeenCalledWith("set_progress", { uid: "user-1" });
    expect(result).toEqual([{ setId: "base1", setName: "Base Set", owned: 2, total: 3 }]);
  });

  it("throws when the rpc fails", async () => {
    const rpcMock = jest.fn().mockResolvedValue({ data: null, error: { message: "boom" } });
    const getUserMock = jest.fn().mockResolvedValue({ data: { user: { id: "user-1" } } });

    (getSupabaseClient as jest.Mock).mockReturnValue({
      rpc: rpcMock,
      auth: { getUser: getUserMock }
    });

    await expect(fetchSetProgress()).rejects.toThrow("boom");
  });

  it("returns an empty list without calling the rpc when no user is logged in", async () => {
    const rpcMock = jest.fn();
    const getUserMock = jest.fn().mockResolvedValue({ data: { user: null } });

    (getSupabaseClient as jest.Mock).mockReturnValue({
      rpc: rpcMock,
      auth: { getUser: getUserMock }
    });

    await expect(fetchSetProgress()).resolves.toEqual([]);
    expect(rpcMock).not.toHaveBeenCalled();
  });
});
