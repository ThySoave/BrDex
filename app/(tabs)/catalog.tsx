import { useEffect, useState } from "react";
import { Alert, FlatList, Linking, Pressable, Text, TextInput, View } from "react-native";
import { fetchCatalogPage } from "../../src/features/catalog/catalogRepository";
import { filterCatalogCards } from "../../src/features/catalog/catalogSearch";
import { addToWishlist } from "../../src/features/social/wishlistRepository";
import { buildTcgplayerSearchUrl } from "../../src/features/premium/affiliateLinks";
import { CardGridItem } from "../../src/components/CardGridItem";
import type { CatalogCard } from "../../src/features/catalog/types";

export default function CatalogScreen() {
  const [cards, setCards] = useState<CatalogCard[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetchCatalogPage(0).then(setCards).catch(() => setCards([]));
  }, []);

  const visibleCards = filterCatalogCards(cards, query);

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <TextInput
        testID="catalog-search-input"
        placeholder="Buscar carta..."
        value={query}
        onChangeText={setQuery}
      />
      <FlatList
        testID="catalog-list"
        data={visibleCards}
        keyExtractor={(item) => item.id}
        numColumns={3}
        renderItem={({ item }) => (
          <View>
            <CardGridItem card={item} />
            <Pressable
              testID={`wishlist-add-${item.id}`}
              onPress={() =>
                addToWishlist(item.id, null)
                  .then(() => Alert.alert("Adicionado à lista de desejos"))
                  .catch((error: Error) => Alert.alert("Erro", error.message))
              }
            >
              <Text>Quero</Text>
            </Pressable>
            <Pressable
              testID={`buy-${item.id}`}
              onPress={() => Linking.openURL(buildTcgplayerSearchUrl(item.name))}
            >
              <Text>Comprar</Text>
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}
