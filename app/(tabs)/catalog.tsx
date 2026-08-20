import { useEffect, useState } from "react";
import { Alert, FlatList, Linking, Pressable, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { fetchCatalogPage } from "../../src/features/catalog/catalogRepository";
import { filterCatalogCards } from "../../src/features/catalog/catalogSearch";
import { addToWishlist } from "../../src/features/social/wishlistRepository";
import { buildTcgplayerSearchUrl } from "../../src/features/premium/affiliateLinks";
import { isPremium } from "../../src/features/premium/entitlementsRepository";
import { createPriceAlert } from "../../src/features/premium/priceAlertsRepository";
import { CardGridItem } from "../../src/components/CardGridItem";
import type { CatalogCard } from "../../src/features/catalog/types";

export default function CatalogScreen() {
  const router = useRouter();
  const [cards, setCards] = useState<CatalogCard[]>([]);
  const [query, setQuery] = useState("");
  const [premium, setPremium] = useState(false);
  const [alertCardId, setAlertCardId] = useState<string | null>(null);
  const [threshold, setThreshold] = useState("");
  const [showAlertUpsell, setShowAlertUpsell] = useState(false);

  useEffect(() => {
    fetchCatalogPage(0).then(setCards).catch(() => setCards([]));
    isPremium()
      .then(setPremium)
      .catch(() => setPremium(false));
  }, []);

  const visibleCards = filterCatalogCards(cards, query);

  const handleOpenAlert = (cardId: string) => {
    if (!premium) {
      setShowAlertUpsell(true);
      return;
    }
    setThreshold("");
    setAlertCardId(cardId);
  };

  const handleConfirmAlert = () => {
    const value = Number(threshold.replace(",", "."));
    if (!alertCardId || Number.isNaN(value) || value <= 0) {
      Alert.alert("Informe um valor válido em reais");
      return;
    }

    createPriceAlert(alertCardId, "en", value)
      .then(() => {
        setAlertCardId(null);
        Alert.alert("Alerta criado", "Você será avisado quando a carta passar desse valor.");
      })
      .catch((err: Error) => Alert.alert("Erro", err.message));
  };

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <TextInput
        testID="catalog-search-input"
        placeholder="Buscar carta..."
        value={query}
        onChangeText={setQuery}
      />
      <Pressable testID="open-scanner" onPress={() => router.push("/card/scan")}>
        <Text style={{ color: "#0a66c2", marginVertical: 8 }}>Escanear carta com a câmera</Text>
      </Pressable>
      {showAlertUpsell ? (
        <Text testID="price-alert-upsell" style={{ color: "#666", marginVertical: 8 }}>
          Alertas de preço são um recurso premium. Assine para ser avisado quando uma carta
          passar do valor que você definir.
        </Text>
      ) : null}
      {alertCardId ? (
        <View style={{ marginVertical: 8 }}>
          <TextInput
            testID="price-alert-threshold"
            placeholder="Avisar quando passar de (R$)"
            keyboardType="numeric"
            value={threshold}
            onChangeText={setThreshold}
          />
          <Pressable testID="price-alert-confirm" onPress={handleConfirmAlert}>
            <Text style={{ color: "#0a66c2" }}>Criar alerta</Text>
          </Pressable>
        </View>
      ) : null}
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
            <Pressable testID={`price-alert-add-${item.id}`} onPress={() => handleOpenAlert(item.id)}>
              <Text>Alerta</Text>
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}
