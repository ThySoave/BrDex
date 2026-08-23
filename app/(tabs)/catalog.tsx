import { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, Linking, Pressable, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { fetchCatalogPage, searchCatalogByName } from "../../src/features/catalog/catalogRepository";
import { filterCatalogCards } from "../../src/features/catalog/catalogSearch";
import { addToWishlist } from "../../src/features/social/wishlistRepository";
import { buildTcgplayerSearchUrl } from "../../src/features/premium/affiliateLinks";
import { isPremium } from "../../src/features/premium/entitlementsRepository";
import { createPriceAlert } from "../../src/features/premium/priceAlertsRepository";
import { CardGridItem } from "../../src/components/CardGridItem";
import type { CatalogCard } from "../../src/features/catalog/types";
import type { CardLanguage } from "../../src/features/collection/types";
import { LANGUAGE_OPTIONS } from "../../src/features/collection/labels";
import { parseBrlPrice } from "../../src/lib/parsePrice";
import { useDebouncedValue } from "../../src/lib/useDebouncedValue";

const SEARCH_DEBOUNCE_MS = 300;

export default function CatalogScreen() {
  const router = useRouter();
  const [cards, setCards] = useState<CatalogCard[]>([]);
  const [query, setQuery] = useState("");
  const [premium, setPremium] = useState(false);
  const [alertCardId, setAlertCardId] = useState<string | null>(null);
  const [threshold, setThreshold] = useState("");
  const [showAlertUpsell, setShowAlertUpsell] = useState(false);
  const [wishlistCardId, setWishlistCardId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);

  const loadCards = useCallback((searchText: string) => {
    const trimmed = searchText.trim();
    const request = trimmed === "" ? fetchCatalogPage(0) : searchCatalogByName(trimmed);
    request
      .then((items) => {
        setCards(items);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar catálogo"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadCards(debouncedQuery);
  }, [loadCards, debouncedQuery]);

  useEffect(() => {
    isPremium()
      .then(setPremium)
      .catch(() => setPremium(false));
  }, []);

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    loadCards(debouncedQuery);
  };

  const visibleCards = filterCatalogCards(cards, query);

  if (error) {
    return (
      <View style={{ flex: 1, padding: 16 }}>
        <Text testID="catalog-error">{error}</Text>
        <Pressable testID="catalog-retry" accessibilityRole="button" onPress={handleRetry}>
          <Text style={{ color: "#0a66c2", marginTop: 8 }}>Tentar novamente</Text>
        </Pressable>
      </View>
    );
  }

  const handleOpenAlert = (cardId: string) => {
    if (!premium) {
      setShowAlertUpsell(true);
      return;
    }
    setThreshold("");
    setAlertCardId(cardId);
  };

  const handleConfirmAlert = () => {
    const value = parseBrlPrice(threshold);
    if (!alertCardId || value === null || value <= 0) {
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

  const handleChooseLanguage = (language: CardLanguage | null) => {
    if (!wishlistCardId) {
      return;
    }

    addToWishlist(wishlistCardId, language)
      .then(() => {
        setWishlistCardId(null);
        Alert.alert("Adicionado à lista de desejos");
      })
      .catch((error: Error) => Alert.alert("Erro", error.message));
  };

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <TextInput
        testID="catalog-search-input"
        placeholder="Buscar carta..."
        value={query}
        onChangeText={setQuery}
      />
      <Pressable testID="open-scanner" accessibilityRole="button" onPress={() => router.push("/card/scan")}>
        <Text style={{ color: "#0a66c2", marginVertical: 8 }}>Escanear carta com a câmera</Text>
      </Pressable>
      {showAlertUpsell ? (
        <Text testID="price-alert-upsell" style={{ color: "#666", marginVertical: 8 }}>
          Alertas de preço são um recurso premium. Assine para ser avisado quando uma carta
          passar do valor que você definir.
        </Text>
      ) : null}
      {wishlistCardId ? (
        <View style={{ marginVertical: 8 }}>
          <Text>Em qual idioma você quer essa carta?</Text>
          <Pressable
            testID="wishlist-language-any"
            accessibilityRole="button"
            onPress={() => handleChooseLanguage(null)}
          >
            <Text style={{ color: "#0a66c2" }}>Qualquer idioma</Text>
          </Pressable>
          {LANGUAGE_OPTIONS.map((lang) => (
            <Pressable
              key={lang.value}
              testID={`wishlist-language-${lang.value}`}
              accessibilityRole="button"
              onPress={() => handleChooseLanguage(lang.value)}
            >
              <Text style={{ color: "#0a66c2" }}>{lang.label}</Text>
            </Pressable>
          ))}
          <Pressable
            testID="wishlist-language-cancel"
            accessibilityRole="button"
            onPress={() => setWishlistCardId(null)}
          >
            <Text style={{ color: "#666" }}>Cancelar</Text>
          </Pressable>
        </View>
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
          <Pressable testID="price-alert-confirm" accessibilityRole="button" onPress={handleConfirmAlert}>
            <Text style={{ color: "#0a66c2" }}>Criar alerta</Text>
          </Pressable>
        </View>
      ) : null}
      {loading ? (
        <Text testID="catalog-loading" style={{ color: "#666", marginTop: 16 }}>
          Carregando...
        </Text>
      ) : (
      <FlatList
        testID="catalog-list"
        data={visibleCards}
        keyExtractor={(item) => item.id}
        numColumns={3}
        ListEmptyComponent={
          <Text testID="catalog-empty" style={{ color: "#666", marginTop: 16 }}>
            Nenhuma carta encontrada. Tente outra busca ou volte mais tarde.
          </Text>
        }
        renderItem={({ item }) => (
          <View>
            <CardGridItem card={item} />
            <Pressable
              testID={`wishlist-add-${item.id}`}
              accessibilityRole="button"
              accessibilityLabel={`Quero ${item.name}`}
              onPress={() => setWishlistCardId(item.id)}
            >
              <Text>Quero</Text>
            </Pressable>
            <Pressable
              testID={`buy-${item.id}`}
              accessibilityRole="button"
              accessibilityLabel={`Comprar ${item.name}`}
              onPress={() => Linking.openURL(buildTcgplayerSearchUrl(item.name))}
            >
              <Text>Comprar</Text>
            </Pressable>
            <Pressable
              testID={`price-alert-add-${item.id}`}
              accessibilityRole="button"
              accessibilityLabel={`Alerta de preço para ${item.name}`}
              onPress={() => handleOpenAlert(item.id)}
            >
              <Text>Alerta</Text>
            </Pressable>
          </View>
        )}
      />
      )}
    </View>
  );
}
