import { useCallback, useState } from "react";
import { Alert, FlatList, Image, Pressable, Text, TextInput, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { getOrCreateConversation } from "../../src/features/social/chatRepository";
import {
  searchMarketListings,
  type MarketListing
} from "../../src/features/social/marketRepository";

const STATUS_LABELS: Record<string, string> = {
  a_venda: "À venda",
  disponivel_troca: "Para troca"
};

export default function MarketScreen() {
  const [query, setQuery] = useState("");
  const [listings, setListings] = useState<MarketListing[]>([]);
  const [error, setError] = useState<string | null>(null);

  const runSearch = useCallback((text: string) => {
    searchMarketListings(text)
      .then((results) => {
        setListings(results);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao buscar no mercado"));
  }, []);

  useFocusEffect(
    useCallback(() => {
      runSearch("");
    }, [runSearch])
  );

  const openConversation = (listing: MarketListing) => {
    getOrCreateConversation(listing.sellerId)
      .then((conversationId) => router.push(`/chat/${conversationId}?other=${listing.sellerId}`))
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
      <TextInput
        testID="market-search-input"
        placeholder="Buscar carta no mercado..."
        value={query}
        onChangeText={setQuery}
      />
      <Pressable testID="market-search-submit" onPress={() => runSearch(query)} style={{ marginVertical: 8 }}>
        <Text style={{ color: "#0a66c2" }}>Buscar</Text>
      </Pressable>
      <FlatList
        testID="market-list"
        data={listings}
        keyExtractor={(item) => item.userCardId}
        ListEmptyComponent={
          <Text testID="market-empty">
            Nenhuma carta à venda ou para troca encontrada. Tente outro nome ou volte depois.
          </Text>
        }
        renderItem={({ item }) => (
          <View testID={`market-item-${item.userCardId}`} style={{ flexDirection: "row", marginBottom: 16 }}>
            <Image source={{ uri: item.cardImageUrl }} style={{ width: 60, height: 84, marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              {item.sellerVerified ? (
                <Text testID={`market-verified-${item.userCardId}`} style={{ color: "#0a8f3c" }}>
                  ✓ Verificado
                </Text>
              ) : null}
              <Text style={{ fontWeight: "bold" }}>{item.cardName}</Text>
              <Text style={{ color: "#666" }}>
                {STATUS_LABELS[item.status] ?? item.status}
              </Text>
              <Pressable testID={`market-chat-${item.userCardId}`} onPress={() => openConversation(item)}>
                <Text style={{ color: "#0a66c2" }}>Conversar</Text>
              </Pressable>
              <Pressable
                testID={`market-seller-${item.userCardId}`}
                onPress={() => router.push(`/user/${item.sellerId}`)}
              >
                <Text style={{ color: "#0a66c2" }}>Ver perfil do vendedor</Text>
              </Pressable>
            </View>
          </View>
        )}
      />
    </View>
  );
}
