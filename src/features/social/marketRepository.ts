import { getSupabaseClient } from "../../lib/supabaseClient";
import type { CardCondition } from "../collection/conditionScale";
import type { CardLanguage, CardStatus } from "../collection/types";

export interface MarketListing {
  userCardId: string;
  catalogCardId: string;
  cardName: string;
  cardImageUrl: string;
  language: CardLanguage;
  condition: CardCondition;
  status: CardStatus;
  sellerId: string;
  sellerVerified: boolean;
}

export async function searchMarketListings(query: string): Promise<MarketListing[]> {
  const client = getSupabaseClient();
  const { data, error } = await client.rpc("search_market_listings", { search_text: query });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row: any) => ({
    userCardId: row.user_card_id,
    catalogCardId: row.catalog_card_id,
    cardName: row.card_name,
    cardImageUrl: row.card_image_url,
    language: row.language,
    condition: row.condition,
    status: row.status,
    sellerId: row.seller_id,
    sellerVerified: row.seller_verified === true
  }));
}
