import { useCallback, useState } from "react";
import { Alert, FlatList, Pressable, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { listMatches, type MatchItem } from "../../src/features/social/matchesRepository";
import { getOrCreateConversation } from "../../src/features/social/chatRepository";

export default function MatchesScreen() {
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      listMatches()
        .then((items) => {
          setMatches(items);
          setError(null);
        })
        .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar trocas"));
    }, [])
  );

  const openConversation = (match: MatchItem) => {
    getOrCreateConversation(match.otherUserId)
      .then((conversationId) =>
        router.push(`/chat/${conversationId}?other=${match.otherUserId}`)
      )
      .catch((err: Error) => Alert.alert("Erro", err.message));
  };

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
        testID="matches-list"
        data={matches}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text testID="matches-empty">
            Nenhuma troca por enquanto. Adicione cartas à sua lista de desejos com o botão
            "Quero" no catálogo — quando alguém colocar uma delas à venda ou para troca, o
            match aparece aqui.
          </Text>
        }
        renderItem={({ item }) => (
          <View testID={`match-item-${item.id}`} style={{ marginBottom: 16 }}>
            <Text>
              {item.role === "quero"
                ? `Você quer: ${item.cardName}`
                : `Alguém quer sua: ${item.cardName}`}
            </Text>
            <Pressable
              testID={`match-chat-${item.id}`}
              onPress={() => openConversation(item)}
            >
              <Text>Conversar</Text>
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}
