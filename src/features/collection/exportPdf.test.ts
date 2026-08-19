import { buildCollectionPdfHtml } from "./exportPdf";
import type { UserCard } from "./types";

const CARDS: UserCard[] = [
  {
    id: "uc-1",
    catalogCardId: "card-1",
    cardName: "Pikachu",
    cardImageUrl: "https://example.com/25.png",
    language: "en",
    condition: "near_mint",
    pricePaid: 100.5,
    status: "guardada"
  },
  {
    id: "uc-2",
    catalogCardId: "card-2",
    cardName: "Alakazam",
    cardImageUrl: "https://example.com/1.png",
    language: "pt",
    condition: "played",
    pricePaid: null,
    status: "a_venda"
  }
];

describe("buildCollectionPdfHtml", () => {
  it("includes title, generation date and one row per card", () => {
    const html = buildCollectionPdfHtml(CARDS, "2026-08-19T12:00:00Z");

    expect(html).toContain("Coleção BrDex");
    expect(html).toContain("19/08/2026");
    expect(html).toContain("Pikachu");
    expect(html).toContain("Alakazam");
    expect(html).toContain("2 cartas");
  });

  it("escapes special characters in card names", () => {
    const html = buildCollectionPdfHtml(
      [{ ...CARDS[0], cardName: "Mew & Mewtwo <GX>" }],
      "2026-08-19T12:00:00Z"
    );

    expect(html).toContain("Mew &amp; Mewtwo &lt;GX&gt;");
    expect(html).not.toContain("Mew & Mewtwo <GX>");
  });

  it("renders a dash for null prices and keeps them out of the total", () => {
    const html = buildCollectionPdfHtml(CARDS, "2026-08-19T12:00:00Z");

    expect(html).toContain("—");
    expect(html).toContain("Total investido: R$ 100,50");
  });

  it("sums paid prices with comma decimal separator", () => {
    const html = buildCollectionPdfHtml(
      [CARDS[0], { ...CARDS[1], pricePaid: 49.5 }],
      "2026-08-19T12:00:00Z"
    );

    expect(html).toContain("Total investido: R$ 150,00");
  });
});
