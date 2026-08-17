import { getSupabaseClient } from "../../lib/supabaseClient";
import type { CardLanguage } from "../collection/types";
import type { CardPricesData } from "./types";

export async function fetchCardPrices(
  catalogCardId: string,
  language: CardLanguage
): Promise<CardPricesData> {
  const client = getSupabaseClient();

  const { data: communityRow, error: communityError } = await client
    .from("price_community")
    .select("median_price, min_price, max_price, sample_count")
    .eq("catalog_card_id", catalogCardId)
    .eq("language", language)
    .maybeSingle();

  if (communityError) {
    throw new Error(communityError.message);
  }

  let reference = null;
  if (language === "en") {
    const { data: referenceRow, error: referenceError } = await client
      .from("price_reference")
      .select("price_brl, source")
      .eq("catalog_card_id", catalogCardId)
      .eq("language", "en")
      .maybeSingle();

    if (referenceError) {
      throw new Error(referenceError.message);
    }

    reference = referenceRow
      ? { priceBrl: referenceRow.price_brl, source: referenceRow.source }
      : null;
  }

  return {
    community: communityRow
      ? {
          medianPrice: communityRow.median_price,
          minPrice: communityRow.min_price,
          maxPrice: communityRow.max_price,
          sampleCount: communityRow.sample_count
        }
      : null,
    reference
  };
}
