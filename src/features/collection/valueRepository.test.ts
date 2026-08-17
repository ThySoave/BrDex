jest.mock("../../lib/supabaseClient", () => ({
  getSupabaseClient: jest.fn()
}));

import { getSupabaseClient } from "../../lib/supabaseClient";
import { fetchValueSnapshots } from "./valueRepository";

describe("fetchValueSnapshots", () => {
  it("reads snapshots ordered by captured_on ascending and maps to camelCase", async () => {
    const orderMock = jest.fn().mockResolvedValue({
      data: [
        { captured_on: "2026-08-16", total_value: 120.5 },
        { captured_on: "2026-08-17", total_value: 130 }
      ],
      error: null
    });
    const selectMock = jest.fn().mockReturnValue({ order: orderMock });
    const fromMock = jest.fn().mockReturnValue({ select: selectMock });
    (getSupabaseClient as jest.Mock).mockReturnValue({ from: fromMock });

    const result = await fetchValueSnapshots();

    expect(fromMock).toHaveBeenCalledWith("collection_value_snapshots");
    expect(selectMock).toHaveBeenCalledWith("captured_on, total_value");
    expect(orderMock).toHaveBeenCalledWith("captured_on", { ascending: true });
    expect(result).toEqual([
      { capturedOn: "2026-08-16", totalValue: 120.5 },
      { capturedOn: "2026-08-17", totalValue: 130 }
    ]);
  });

  it("throws when Supabase returns an error", async () => {
    const orderMock = jest.fn().mockResolvedValue({ data: null, error: { message: "down" } });
    const selectMock = jest.fn().mockReturnValue({ order: orderMock });
    const fromMock = jest.fn().mockReturnValue({ select: selectMock });
    (getSupabaseClient as jest.Mock).mockReturnValue({ from: fromMock });

    await expect(fetchValueSnapshots()).rejects.toThrow("down");
  });
});
