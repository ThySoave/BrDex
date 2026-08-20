import type { CardCondition } from "./conditionScale";

export type CardLanguage = "en" | "pt" | "jp" | "other";
export type CardStatus = "guardada" | "a_venda" | "disponivel_troca" | "vendida";

export interface AddUserCardInput {
  catalogCardId: string;
  language: CardLanguage;
  condition: CardCondition;
  pricePaid: number | null;
  status: CardStatus;
  photoUrl: string | null;
}

export interface UserCard {
  id: string;
  catalogCardId: string;
  cardName: string;
  cardImageUrl: string;
  language: CardLanguage;
  condition: CardCondition;
  pricePaid: number | null;
  status: CardStatus;
  photoUrl: string | null;
}
