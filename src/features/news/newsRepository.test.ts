jest.mock("../../lib/supabaseClient", () => ({
  getSupabaseClient: jest.fn()
}));

import { getSupabaseClient } from "../../lib/supabaseClient";
import { listNews } from "./newsRepository";

describe("listNews", () => {
  it("lists news ordered by published date and maps rows", async () => {
    const limitMock = jest.fn().mockResolvedValue({
      data: [
        {
          id: "news-1",
          title: "Novo set anunciado",
          summary: "Resumo curto.",
          url: "https://example.com/noticia-1",
          source: "PokéNews",
          published_at: "2026-08-18T12:00:00Z"
        }
      ],
      error: null
    });
    const orderMock = jest.fn().mockReturnValue({ limit: limitMock });
    const selectMock = jest.fn().mockReturnValue({ order: orderMock });
    const fromMock = jest.fn().mockReturnValue({ select: selectMock });

    (getSupabaseClient as jest.Mock).mockReturnValue({ from: fromMock });

    const result = await listNews();

    expect(fromMock).toHaveBeenCalledWith("news_items");
    expect(orderMock).toHaveBeenCalledWith("published_at", { ascending: false });
    expect(limitMock).toHaveBeenCalledWith(30);
    expect(result).toEqual([
      {
        id: "news-1",
        title: "Novo set anunciado",
        summary: "Resumo curto.",
        url: "https://example.com/noticia-1",
        source: "PokéNews",
        publishedAt: "2026-08-18T12:00:00Z"
      }
    ]);
  });

  it("throws when the query fails", async () => {
    const limitMock = jest.fn().mockResolvedValue({ data: null, error: { message: "boom" } });
    const orderMock = jest.fn().mockReturnValue({ limit: limitMock });
    const selectMock = jest.fn().mockReturnValue({ order: orderMock });
    const fromMock = jest.fn().mockReturnValue({ select: selectMock });

    (getSupabaseClient as jest.Mock).mockReturnValue({ from: fromMock });

    await expect(listNews()).rejects.toThrow("boom");
  });
});
