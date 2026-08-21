import { LANGUAGE_OPTIONS, languageLabel } from "./labels";

describe("LANGUAGE_OPTIONS", () => {
  it("lists the four languages with the current labels", () => {
    expect(LANGUAGE_OPTIONS).toEqual([
      { value: "en", label: "Inglês" },
      { value: "pt", label: "Português" },
      { value: "jp", label: "Japonês" },
      { value: "other", label: "Outro" }
    ]);
  });
});

describe("languageLabel", () => {
  it("returns the label for a known language", () => {
    expect(languageLabel("pt")).toBe("Português");
  });

  it("returns the any-language label for null", () => {
    expect(languageLabel(null)).toBe("Qualquer idioma");
  });
});
