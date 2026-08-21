import { LANGUAGE_OPTIONS, STATUS_OPTIONS, languageLabel } from "./labels";

describe("STATUS_OPTIONS", () => {
  it("lists the three statuses with the current labels", () => {
    expect(STATUS_OPTIONS).toEqual([
      { value: "guardada", label: "Guardada" },
      { value: "a_venda", label: "À venda" },
      { value: "disponivel_troca", label: "Disponível para troca" }
    ]);
  });
});

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
