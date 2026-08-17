import { Image, Text, View } from "react-native";
import type { CatalogCard } from "../features/catalog/types";

export function CardGridItem({ card }: { card: CatalogCard }) {
  return (
    <View testID={`card-grid-item-${card.id}`} style={{ width: 100, margin: 8 }}>
      <Image source={{ uri: card.imageUrl }} style={{ width: 100, height: 140 }} />
      <Text numberOfLines={1}>{card.name}</Text>
      <Text style={{ fontSize: 12, color: "#666" }}>{card.setName}</Text>
    </View>
  );
}
