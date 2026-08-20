import { matchScannedCard } from "./matchCard";
import type { CatalogCard } from "../catalog/types";

function card(overrides: Partial<CatalogCard>): CatalogCard {
  return {
    id: "base1-4",
    name: "Charizard",
    number: "4",
    setName: "Base",
    rarity: "Rare Holo",
    imageUrl: "https://img.example/base1-4.png",
    ...overrides
  };
}

describe("matchScannedCard", () => {
  it("encontra a carta pelo nome exato", () => {
    const cards = [card({ id: "base1-4", name: "Charizard" }), card({ id: "base1-58", name: "Pikachu", number: "58" })];

    expect(matchScannedCard(cards, { name: "Pikachu", number: null })?.id).toBe("base1-58");
  });

  it("ignora caixa e acentos ao comparar o nome", () => {
    const cards = [card({ id: "svp-1", name: "Pikachu com Boné" })];

    expect(matchScannedCard(cards, { name: "  pikachu com bone ", number: null })?.id).toBe("svp-1");
  });

  it("usa o número para desempatar cartas de mesmo nome", () => {
    const cards = [
      card({ id: "base1-4", name: "Charizard", number: "4" }),
      card({ id: "ex3-100", name: "Charizard", number: "100" })
    ];

    expect(matchScannedCard(cards, { name: "Charizard", number: "100" })?.id).toBe("ex3-100");
  });

  it("sem número reconhecido retorna o primeiro candidato pelo nome", () => {
    const cards = [
      card({ id: "base1-4", name: "Charizard", number: "4" }),
      card({ id: "ex3-100", name: "Charizard", number: "100" })
    ];

    expect(matchScannedCard(cards, { name: "Charizard", number: null })?.id).toBe("base1-4");
  });

  it("número sem correspondência não descarta o match por nome", () => {
    const cards = [card({ id: "base1-4", name: "Charizard", number: "4" })];

    expect(matchScannedCard(cards, { name: "Charizard", number: "999" })?.id).toBe("base1-4");
  });

  it("retorna null quando nenhum nome corresponde", () => {
    const cards = [card({ id: "base1-4", name: "Charizard" })];

    expect(matchScannedCard(cards, { name: "Blastoise", number: null })).toBeNull();
  });

  it("retorna null quando o nome reconhecido é null", () => {
    const cards = [card({ id: "base1-4", name: "Charizard" })];

    expect(matchScannedCard(cards, { name: null, number: "4" })).toBeNull();
  });
});
