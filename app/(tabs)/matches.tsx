import { useCallback, useState } from "react";
import { Alert, FlatList, Pressable, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { listMatches, type MatchItem } from "../../src/features/social/matchesRepository";
import { getOrCreateConversation } from "../../src/features/social/chatRepository";
import { isUserVerified } from "../../src/features/premium/entitlementsRepository";

export default function MatchesScreen() {
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [verifiedByUser, setVerifiedByUser] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMatches = useCallback(() => {
    listMatches()
      .then((items) => {
        setMatches(items);
        setError(null);

        const userIds = [...new Set(items.map((item) => item.otherUserId))];
        return Promise.all(
          userIds.map((userId) => isUserVerified(userId).then((verified) => [userId, verified] as const))
        ).then((entries) => setVerifiedByUser(Object.fromEntries(entries)));
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar trocas"))
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(loadMatches);

  // Verificados primeiro, ordem original preservada entre iguais
  const sortedMatches = [...matches].sort(
    (a, b) => Number(verifiedByUser[b.otherUserId] ?? false) - Number(verifiedByUser[a.otherUserId] ?? false)
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
        <Text testID="matches-error">{error}</Text>
        <Pressable
          testID="matches-retry"
          accessibilityRole="button"
          onPress={() => {
            setError(null);
            setLoading(true);
            loadMatches();
          }}
        >
          <Text style={{ color: "#0a66c2", marginTop: 8 }}>Tentar novamente</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Pressable testID="open-wishlist" accessibilityRole="button" onPress={() => router.push("/wishlist")}>
        <Text style={{ color: "#0a66c2", marginBottom: 12 }}>Minha lista de desejos</Text>
      </Pressable>
      {loading ? (
        <Text testID="matches-loading" style={{ color: "#666", marginTop: 16 }}>
          Carregando...
        </Text>
      ) : (
      <FlatList
        testID="matches-list"
        data={sortedMatches}
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
            {verifiedByUser[item.otherUserId] ? (
              <Text testID={`verified-badge-${item.id}`} style={{ color: "#0a8f3c" }}>
                ✓ Verificado
              </Text>
            ) : null}
            <Text>
              {item.role === "quero"
                ? `Você quer: ${item.cardName}`
                : `Alguém quer sua: ${item.cardName}`}
            </Text>
            <Pressable
              testID={`match-chat-${item.id}`}
              accessibilityRole="button"
              accessibilityLabel={`Conversar sobre ${item.cardName}`}
              onPress={() => openConversation(item)}
            >
              <Text>Conversar</Text>
            </Pressable>
          </View>
        )}
      />
      )}
    </View>
  );
}
