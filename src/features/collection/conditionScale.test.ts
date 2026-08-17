import { CARD_CONDITIONS } from "./conditionScale";

describe("CARD_CONDITIONS", () => {
  it("defines exactly the 6 fixed condition values in best-to-worst order", () => {
    expect(CARD_CONDITIONS.map((c) => c.value)).toEqual([
      "mint",
      "near_mint",
      "excellent",
      "good",
      "played",
      "damaged"
    ]);
  });

  it("gives every condition a non-empty Portuguese label", () => {
    for (const condition of CARD_CONDITIONS) {
      expect(condition.label.length).toBeGreaterThan(0);
    }
  });
});
