jest.mock("../../lib/supabaseClient", () => ({
  getSupabaseClient: jest.fn()
}));

import { getSupabaseClient } from "../../lib/supabaseClient";
import { recognizeCard } from "./scannerRepository";

describe("recognizeCard", () => {
  it("invokes the recognize-card function with the image and returns the recognition", async () => {
    const invokeMock = jest.fn().mockResolvedValue({
      data: { name: "Charizard", number: "4" },
      error: null
    });
    (getSupabaseClient as jest.Mock).mockReturnValue({ functions: { invoke: invokeMock } });

    const result = await recognizeCard("base64-da-foto");

    expect(invokeMock).toHaveBeenCalledWith("recognize-card", {
      body: { imageBase64: "base64-da-foto" }
    });
    expect(result).toEqual({ name: "Charizard", number: "4" });
  });

  it("throws when the function returns an error", async () => {
    const invokeMock = jest.fn().mockResolvedValue({
      data: null,
      error: { message: "function offline" }
    });
    (getSupabaseClient as jest.Mock).mockReturnValue({ functions: { invoke: invokeMock } });

    await expect(recognizeCard("abc")).rejects.toThrow("function offline");
  });
});
