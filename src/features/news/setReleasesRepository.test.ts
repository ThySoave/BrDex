jest.mock("../../lib/supabaseClient", () => ({
  getSupabaseClient: jest.fn()
}));

import { getSupabaseClient } from "../../lib/supabaseClient";
import { dismissSetRelease, listUndismissedSetReleases } from "./setReleasesRepository";

describe("listUndismissedSetReleases", () => {
  it("lists set releases not dismissed by the current user", async () => {
    const dismissedSelectMock = jest.fn().mockResolvedValue({
      data: [{ set_release_id: "release-2" }],
      error: null
    });
    const notMock = jest.fn().mockResolvedValue({
      data: [
        {
          id: "release-1",
          set_id: "sv10",
          set_name: "Scarlet & Violet 10",
          released_detected_at: "2026-08-18T00:00:00Z"
        }
      ],
      error: null
    });
    const limitMock = jest.fn().mockReturnValue({ not: notMock });
    const orderMock = jest.fn().mockReturnValue({ limit: limitMock });
    const releasesSelectMock = jest.fn().mockReturnValue({ order: orderMock });
    const fromMock = jest.fn().mockImplementation((table: string) => {
      if (table === "user_dismissed_set_releases") {
        return { select: dismissedSelectMock };
      }
      return { select: releasesSelectMock };
    });

    (getSupabaseClient as jest.Mock).mockReturnValue({ from: fromMock });

    const result = await listUndismissedSetReleases();

    expect(fromMock).toHaveBeenCalledWith("user_dismissed_set_releases");
    expect(fromMock).toHaveBeenCalledWith("set_releases");
    expect(orderMock).toHaveBeenCalledWith("released_detected_at", { ascending: false });
    expect(notMock).toHaveBeenCalledWith("id", "in", "(release-2)");
    expect(result).toEqual([
      {
        id: "release-1",
        setId: "sv10",
        setName: "Scarlet & Violet 10",
        releasedDetectedAt: "2026-08-18T00:00:00Z"
      }
    ]);
  });

  it("throws when the query fails", async () => {
    const dismissedSelectMock = jest.fn().mockResolvedValue({
      data: null,
      error: { message: "boom" }
    });
    const fromMock = jest.fn().mockReturnValue({ select: dismissedSelectMock });

    (getSupabaseClient as jest.Mock).mockReturnValue({ from: fromMock });

    await expect(listUndismissedSetReleases()).rejects.toThrow("boom");
  });
});

describe("dismissSetRelease", () => {
  it("inserts a dismissal for the current user", async () => {
    const insertMock = jest.fn().mockResolvedValue({ error: null });
    const fromMock = jest.fn().mockReturnValue({ insert: insertMock });
    const getUserMock = jest.fn().mockResolvedValue({ data: { user: { id: "user-1" } } });

    (getSupabaseClient as jest.Mock).mockReturnValue({
      from: fromMock,
      auth: { getUser: getUserMock }
    });

    await dismissSetRelease("release-1");

    expect(fromMock).toHaveBeenCalledWith("user_dismissed_set_releases");
    expect(insertMock).toHaveBeenCalledWith({
      user_id: "user-1",
      set_release_id: "release-1"
    });
  });
});
