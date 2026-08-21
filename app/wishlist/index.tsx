import { useCallback, useState } from "react";
import { Alert, FlatList, Pressable, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import {
  listWishlist,
  removeFromWishlist,
  type WishlistItem
} from "../../src/features/social/wishlistRepository";
import { languageLabel } from "../../src/features/collection/labels";

export default function WishlistScreen() {
  const [items, setItems] = useState<WishlistItem[]>([]);

  useFocusEffect(
    useCallback(() => {
      listWishlist()
        .then(setItems)
        .catch((err: Error) => Alert.alert("Erro", err.message));
    }, [])
  );

  const handleRemove = (item: WishlistItem) => {
    removeFromWishlist(item.id)
      .then(() => setItems((current) => current.filter((i) => i.id !== item.id)))
      .catch((err: Error) => Alert.alert("Erro", err.message));
  };

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 12 }}>
        Minha lista de desejos
      </Text>
      <FlatList
        testID="wishlist-list"
        data={items}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text testID="wishlist-empty">
            Sua lista de desejos está vazia. Adicione cartas com o botão "Quero" no catálogo —
            quando alguém colocar uma delas à venda ou para troca, você recebe um match.
          </Text>
        }
        renderItem={({ item }) => (
          <View testID={`wishlist-item-${item.id}`} style={{ marginBottom: 16 }}>
            <Text>{item.cardName}</Text>
            <Text style={{ color: "#666" }}>
              {languageLabel(item.language)}
            </Text>
            <Pressable
              testID={`wishlist-remove-${item.id}`}
              accessibilityRole="button"
              accessibilityLabel={`Remover ${item.cardName}`}
              onPress={() => handleRemove(item)}
            >
              <Text style={{ color: "#c22" }}>Remover</Text>
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}
