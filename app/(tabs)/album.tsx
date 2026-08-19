import { useEffect, useState } from "react";
import { FlatList, Pressable, Share, Text, View } from "react-native";
import { listUserCards } from "../../src/features/collection/collectionRepository";
import { fetchSetProgress, type SetProgress } from "../../src/features/collection/setProgressRepository";
import { buildCollectionShareMessage } from "../../src/features/collection/shareCollection";
import { isPremium } from "../../src/features/premium/entitlementsRepository";
import type { UserCard } from "../../src/features/collection/types";

export default function AlbumScreen() {
  const [cards, setCards] = useState<UserCard[]>([]);
  const [premium, setPremium] = useState(false);
  const [progress, setProgress] = useState<SetProgress[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listUserCards()
      .then(setCards)
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar álbum"));
    isPremium()
      .then((active) => {
        setPremium(active);
        if (active) {
          fetchSetProgress().then(setProgress).catch(() => setProgress([]));
        }
      })
      .catch(() => setPremium(false));
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
      <Pressable
        testID="share-collection"
        onPress={() => Share.share({ message: buildCollectionShareMessage(cards.length, null) })}
        style={{ marginBottom: 8 }}
      >
        <Text>Compartilhar</Text>
      </Pressable>
      {premium ? (
        progress.map((set) => (
          <Text key={set.setId} testID={`set-progress-${set.setId}`}>
            {`${set.setName}: ${set.owned} de ${set.total}`}
          </Text>
        ))
      ) : (
        <Text testID="set-progress-upsell" style={{ color: "#666", marginBottom: 8 }}>
          Assine o premium para ver o progresso por edição.
        </Text>
      )}
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
