import { useEffect, useState } from "react";
import { FlatList, TextInput, View } from "react-native";
import { fetchCatalogPage } from "../../src/features/catalog/catalogRepository";
import { filterCatalogCards } from "../../src/features/catalog/catalogSearch";
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
        renderItem={({ item }) => <CardGridItem card={item} />}
      />
    </View>
  );
}
