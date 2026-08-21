import type { CardLanguage } from "./types";

// Rótulos únicos de idioma (mesmo padrão de CARD_CONDITIONS para condição).
export const LANGUAGE_OPTIONS: { value: CardLanguage; label: string }[] = [
  { value: "en", label: "Inglês" },
  { value: "pt", label: "Português" },
  { value: "jp", label: "Japonês" },
  { value: "other", label: "Outro" }
];

export function languageLabel(language: CardLanguage | null): string {
  const option = LANGUAGE_OPTIONS.find((item) => item.value === language);
  return option ? option.label : "Qualquer idioma";
}
