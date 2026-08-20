import { Text, View } from "react-native";
import { CARD_CONDITIONS } from "./conditionScale";
import type { UserCard } from "./types";

const MAX_NAMES = 4;

const cardStyle = {
  width: 320,
  padding: 24,
  backgroundColor: "#1a1a2e",
  borderRadius: 16
} as const;

const brandStyle = { color: "#e94560", fontSize: 20, fontWeight: "bold", marginBottom: 8 } as const;
const titleStyle = { color: "#fff", fontSize: 18, fontWeight: "bold", marginBottom: 8 } as const;
const lineStyle = { color: "#ccc", fontSize: 14 } as const;

export function ShareCollectionCard({ cardCount, cardNames }: { cardCount: number; cardNames: string[] }) {
  const shown = cardNames.slice(0, MAX_NAMES);
  const extra = cardNames.length - shown.length;

  return (
    <View style={cardStyle}>
      <Text style={brandStyle}>BrDex</Text>
      <Text testID="share-card-summary" style={titleStyle}>{`Minha coleção: ${cardCount} cartas`}</Text>
      {shown.map((name, i) => (
        <Text key={`${name}-${i}`} testID={`share-card-name-${i}`} style={lineStyle}>
          {name}
        </Text>
      ))}
      {extra > 0 ? (
        <Text testID="share-card-more" style={lineStyle}>{`+${extra} outras`}</Text>
      ) : null}
    </View>
  );
}

export function ShareSingleCard({ card }: { card: UserCard }) {
  const conditionLabel =
    CARD_CONDITIONS.find((c) => c.value === card.condition)?.label ?? card.condition;

  return (
    <View style={cardStyle}>
      <Text style={brandStyle}>BrDex</Text>
      <Text testID="share-single-name" style={titleStyle}>{card.cardName}</Text>
      <Text testID="share-single-details" style={lineStyle}>
        {`${conditionLabel} · ${card.language.toUpperCase()}`}
      </Text>
    </View>
  );
}
