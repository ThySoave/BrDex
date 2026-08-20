import { canAddCard, FREE_CARD_LIMIT } from "./cardLimit";

describe("canAddCard", () => {
  it("permite premium mesmo no limite", () => {
    expect(canAddCard(FREE_CARD_LIMIT, true)).toBe(true);
  });

  it("permite premium acima do limite", () => {
    expect(canAddCard(FREE_CARD_LIMIT + 100, true)).toBe(true);
  });

  it("permite grátis abaixo do limite", () => {
    expect(canAddCard(FREE_CARD_LIMIT - 1, false)).toBe(true);
  });

  it("permite grátis com coleção vazia", () => {
    expect(canAddCard(0, false)).toBe(true);
  });

  it("bloqueia grátis exatamente no limite", () => {
    expect(canAddCard(FREE_CARD_LIMIT, false)).toBe(false);
  });

  it("bloqueia grátis acima do limite", () => {
    expect(canAddCard(FREE_CARD_LIMIT + 1, false)).toBe(false);
  });

  it("define o limite grátis em 50 cartas", () => {
    expect(FREE_CARD_LIMIT).toBe(50);
  });
});
