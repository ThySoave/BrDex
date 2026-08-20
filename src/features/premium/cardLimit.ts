export const FREE_CARD_LIMIT = 50;

export function canAddCard(cardCount: number, premium: boolean): boolean {
  if (premium) {
    return true;
  }
  return cardCount < FREE_CARD_LIMIT;
}
