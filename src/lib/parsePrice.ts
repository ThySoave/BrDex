// Conversão única de preço digitado (pt-BR aceita vírgula decimal).
// Política de valor (ex.: exigir > 0) fica em cada tela.
export function parseBrlPrice(input: string): number | null {
  const parsed = Number.parseFloat(input.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}
