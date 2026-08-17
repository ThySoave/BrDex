import { filterCatalogCards } from "./catalogSearch";
import type { CatalogCard } from "./types";

const CARDS: CatalogCard[] = [
  { id: "1", name: "Pikachu", number: "25", setName: "Base Set", rarity: "Common", imageUrl: "x" },
  { id: "2", name: "Charizard", number: "4", setName: "Base Set", rarity: "Rare Holo", imageUrl: "x" },
  { id: "3", name: "Raichu", number: "26", setName: "Base Set", rarity: "Rare", imageUrl: "x" }
];

describe("filterCatalogCards", () => {
  it("returns all cards when the query is empty", () => {
    expect(filterCatalogCards(CARDS, "")).toHaveLength(3);
  });

  it("filters case-insensitively by name substring", () => {
    const result = filterCatalogCards(CARDS, "pika");
    expect(result.map((c) => c.name)).toEqual(["Pikachu"]);
  });

  it("matches partial names shared by multiple cards", () => {
    const result = filterCatalogCards(CARDS, "chu");
    expect(result.map((c) => c.name).sort()).toEqual(["Pikachu", "Raichu"]);
  });
});
