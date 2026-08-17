export type CardCondition = "mint" | "near_mint" | "excellent" | "good" | "played" | "damaged";

export const CARD_CONDITIONS: { value: CardCondition; label: string }[] = [
  { value: "mint", label: "Mint" },
  { value: "near_mint", label: "Quase Nova" },
  { value: "excellent", label: "Excelente" },
  { value: "good", label: "Boa" },
  { value: "played", label: "Jogada" },
  { value: "damaged", label: "Danificada" }
];
