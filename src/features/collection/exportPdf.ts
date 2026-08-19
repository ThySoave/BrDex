import type { UserCard } from "./types";

const LANGUAGE_LABELS: Record<UserCard["language"], string> = {
  en: "Inglês",
  pt: "Português",
  jp: "Japonês",
  other: "Outro"
};

const CONDITION_LABELS: Record<UserCard["condition"], string> = {
  mint: "Mint",
  near_mint: "Near Mint",
  excellent: "Excelente",
  good: "Boa",
  played: "Jogada",
  damaged: "Danificada"
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatBrl(value: number): string {
  return `R$ ${value.toFixed(2).replace(".", ",")}`;
}

export function buildCollectionPdfHtml(cards: UserCard[], generatedAtIso: string): string {
  const generatedAt = new Date(generatedAtIso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC"
  });

  const rows = cards
    .map((card) => {
      const price = card.pricePaid !== null ? formatBrl(card.pricePaid) : "—";
      return `<tr>
        <td>${escapeHtml(card.cardName)}</td>
        <td>${LANGUAGE_LABELS[card.language]}</td>
        <td>${CONDITION_LABELS[card.condition]}</td>
        <td>${price}</td>
      </tr>`;
    })
    .join("\n");

  const total = cards.reduce((sum, card) => sum + (card.pricePaid ?? 0), 0);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: sans-serif; padding: 24px; }
    h1 { font-size: 20px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; font-size: 12px; }
    th { background: #f0f0f0; }
    footer { margin-top: 16px; font-size: 12px; color: #444; }
  </style>
</head>
<body>
  <h1>Coleção BrDex</h1>
  <p>Documento gerado em ${generatedAt}</p>
  <table>
    <thead>
      <tr><th>Carta</th><th>Idioma</th><th>Condição</th><th>Preço pago</th></tr>
    </thead>
    <tbody>
${rows}
    </tbody>
  </table>
  <footer>
    <p>${cards.length} cartas</p>
    <p>Total investido: ${formatBrl(total)}</p>
  </footer>
</body>
</html>`;
}
