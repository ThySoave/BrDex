import { useEffect, useState } from "react";
import { FlatList, Text, View } from "react-native";
import { listUserCards } from "../../src/features/collection/collectionRepository";
import type { UserCard } from "../../src/features/collection/types";

export default function AlbumScreen() {
  const [cards, setCards] = useState<UserCard[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listUserCards()
      .then(setCards)
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar álbum"));
  }, []);

  if (error) {
    return (
      <View style={{ flex: 1, padding: 16 }}>
        <Text>{error}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <FlatList
        testID="album-list"
        data={cards}
        keyExtractor={(item) => item.id}
        numColumns={3}
        renderItem={({ item }) => (
          <View testID={`album-item-${item.id}`} style={{ width: 100, margin: 8 }}>
            <Text numberOfLines={1}>{item.cardName}</Text>
          </View>
        )}
      />
    </View>
  );
}
