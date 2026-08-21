import { parseBrlPrice } from "./parsePrice";

describe("parseBrlPrice", () => {
  it("parses a decimal comma price", () => {
    expect(parseBrlPrice("12,50")).toBe(12.5);
  });

  it("parses a decimal point price", () => {
    expect(parseBrlPrice("30.5")).toBe(30.5);
  });

  it("returns null for an empty input", () => {
    expect(parseBrlPrice("")).toBeNull();
  });

  it("returns null for a non-numeric input", () => {
    expect(parseBrlPrice("abc")).toBeNull();
  });

  it("parses zero (caller decides whether zero is allowed)", () => {
    expect(parseBrlPrice("0")).toBe(0);
  });

  it("ignores surrounding whitespace", () => {
    expect(parseBrlPrice(" 12,50 ")).toBe(12.5);
  });
});
