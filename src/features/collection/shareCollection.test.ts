import { buildCollectionShareMessage } from "./shareCollection";

describe("buildCollectionShareMessage", () => {
  it("includes the card count and formatted value when a value is given", () => {
    expect(buildCollectionShareMessage(87, 1234.5)).toBe(
      "Minha coleção no BrDex: 87 cartas, avaliada em R$ 1234,50! 🎴"
    );
  });

  it("omits the value part when the value is null", () => {
    expect(buildCollectionShareMessage(12, null)).toBe("Minha coleção no BrDex: 12 cartas! 🎴");
  });
});
