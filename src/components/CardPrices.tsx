import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { fetchCardPrices } from "../features/pricing/pricingRepository";
import type { CardPricesData } from "../features/pricing/types";
import type { CardLanguage } from "../features/collection/types";

function formatBrl(value: number): string {
  return `R$ ${value.toFixed(2).replace(".", ",")}`;
}

export function CardPrices({
  catalogCardId,
  language
}: {
  catalogCardId: string;
  language: CardLanguage;
}) {
  const [prices, setPrices] = useState<CardPricesData | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchCardPrices(catalogCardId, language)
      .then((data) => {
        if (!cancelled) setPrices(data);
      })
      .catch(() => {
        if (!cancelled) setPrices({ community: null, reference: null });
      });
    return () => {
      cancelled = true;
    };
  }, [catalogCardId, language]);

  if (!prices) {
    return null;
  }

  return (
    <View style={{ marginBottom: 16 }}>
      {prices.community ? (
        <Text testID="community-price">
          {"Preço comunitário (BR): "}
          {formatBrl(prices.community.medianPrice)}
          {" · "}
          {prices.community.sampleCount}
          {" registros"}
        </Text>
      ) : (
        <Text testID="community-price-empty">Ainda sem preço comunitário para esta carta.</Text>
      )}
      {prices.reference ? (
        <Text testID="reference-price" style={{ color: "#666" }}>
          {"Referência internacional: "}
          {formatBrl(prices.reference.priceBrl)}
        </Text>
      ) : null}
    </View>
  );
}
