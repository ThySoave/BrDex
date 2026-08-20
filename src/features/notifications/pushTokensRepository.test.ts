jest.mock("../../lib/supabaseClient", () => ({
  getSupabaseClient: jest.fn()
}));

import { getSupabaseClient } from "../../lib/supabaseClient";
import { registerPushToken } from "./pushTokensRepository";

describe("registerPushToken", () => {
  it("upserts the device token for the current user", async () => {
    const upsertMock = jest.fn().mockResolvedValue({ error: null });
    const fromMock = jest.fn().mockReturnValue({ upsert: upsertMock });
    const getUserMock = jest.fn().mockResolvedValue({ data: { user: { id: "user-1" } } });

    (getSupabaseClient as jest.Mock).mockReturnValue({
      from: fromMock,
      auth: { getUser: getUserMock }
    });

    await registerPushToken("ExponentPushToken[device-1]", "android");

    expect(fromMock).toHaveBeenCalledWith("push_tokens");
    expect(upsertMock).toHaveBeenCalledWith(
      {
        user_id: "user-1",
        token: "ExponentPushToken[device-1]",
        platform: "android"
      },
      { onConflict: "user_id,token" }
    );
  });

  it("throws when the upsert fails", async () => {
    const upsertMock = jest.fn().mockResolvedValue({ error: { message: "boom" } });
    const fromMock = jest.fn().mockReturnValue({ upsert: upsertMock });
    const getUserMock = jest.fn().mockResolvedValue({ data: { user: { id: "user-1" } } });

    (getSupabaseClient as jest.Mock).mockReturnValue({
      from: fromMock,
      auth: { getUser: getUserMock }
    });

    await expect(registerPushToken("ExponentPushToken[device-1]", "android")).rejects.toThrow(
      "boom"
    );
  });
});
