export function buildCollectionShareMessage(cardCount: number, totalValue: number | null): string {
  if (totalValue === null) {
    return `Minha coleção no BrDex: ${cardCount} cartas! 🎴`;
  }

  const formatted = totalValue.toFixed(2).replace(".", ",");
  return `Minha coleção no BrDex: ${cardCount} cartas, avaliada em R$ ${formatted}! 🎴`;
}
