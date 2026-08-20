import type { CatalogCard } from "../catalog/types";

export interface CardRecognition {
  name: string | null;
  number: string | null;
}

function normalizeName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function matchScannedCard(cards: CatalogCard[], recognition: CardRecognition): CatalogCard | null {
  if (!recognition.name) {
    return null;
  }

  const target = normalizeName(recognition.name);
  const byName = cards.filter((card) => normalizeName(card.name) === target);

  if (byName.length === 0) {
    return null;
  }

  if (recognition.number) {
    const byNumber = byName.find((card) => card.number === recognition.number);
    if (byNumber) {
      return byNumber;
    }
  }

  return byName[0];
}
