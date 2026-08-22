import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, FlatList, Image, Pressable, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "expo-router";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import {
  deleteUserCard,
  listUserCards,
  markCardAsSold,
  updateCardStatus,
  updateUserCard
} from "../../src/features/collection/collectionRepository";
import { CARD_CONDITIONS, type CardCondition } from "../../src/features/collection/conditionScale";
import { buildCollectionPdfHtml } from "../../src/features/collection/exportPdf";
import { fetchSetProgress, type SetProgress } from "../../src/features/collection/setProgressRepository";
import { ShareCollectionCard, ShareSingleCard } from "../../src/features/collection/shareCards";
import { captureAndShareView } from "../../src/features/collection/shareImage";
import { isPremium } from "../../src/features/premium/entitlementsRepository";
import { LANGUAGE_OPTIONS, STATUS_OPTIONS } from "../../src/features/collection/labels";
import type { CardLanguage, CardStatus, UserCard } from "../../src/features/collection/types";
import { parseBrlPrice } from "../../src/lib/parsePrice";

export default function AlbumScreen() {
  const [cards, setCards] = useState<UserCard[]>([]);
  const [premium, setPremium] = useState(false);
  const [progress, setProgress] = useState<SetProgress[]>([]);
  const [showPdfUpsell, setShowPdfUpsell] = useState(false);
  const [shareCard, setShareCard] = useState<UserCard | null>(null);
  const [sellingCard, setSellingCard] = useState<UserCard | null>(null);
  const [salePrice, setSalePrice] = useState("");
  const [statusCard, setStatusCard] = useState<UserCard | null>(null);
  const [editingCard, setEditingCard] = useState<UserCard | null>(null);
  const [editLanguage, setEditLanguage] = useState<CardLanguage>("en");
  const [editCondition, setEditCondition] = useState<CardCondition>("near_mint");
  const [editPrice, setEditPrice] = useState("");
  const [deletingCard, setDeletingCard] = useState<UserCard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const collectionShareRef = useRef<View>(null);
  const cardShareRef = useRef<View>(null);

  const handleShareCollection = () => {
    captureAndShareView(collectionShareRef).catch((err: Error) => Alert.alert("Erro", err.message));
  };

  const handleExportPdf = () => {
    if (!premium) {
      setShowPdfUpsell(true);
      return;
    }

    const html = buildCollectionPdfHtml(cards, new Date().toISOString());
    Print.printToFileAsync({ html })
      .then(({ uri }) => Sharing.shareAsync(uri))
      .catch((err: Error) => Alert.alert("Erro", err.message));
  };

  const handleOpenSale = (card: UserCard) => {
    setSellingCard(card);
    setSalePrice("");
  };

  const handleConfirmSale = () => {
    if (!sellingCard) return;
    const price = parseBrlPrice(salePrice);
    if (price === null || price <= 0) {
      Alert.alert("Informe um valor válido em reais");
      return;
    }

    const cardId = sellingCard.id;
    markCardAsSold(cardId, price)
      .then(() => {
        setCards((current) => current.filter((card) => card.id !== cardId));
        setSellingCard(null);
      })
      .catch((err: Error) => Alert.alert("Erro", err.message));
  };

  const handleOpenEdit = (card: UserCard) => {
    setEditingCard(card);
    setEditLanguage(card.language);
    setEditCondition(card.condition);
    setEditPrice(card.pricePaid != null ? String(card.pricePaid) : "");
  };

  const handleSaveEdit = () => {
    if (!editingCard) return;
    const pricePaid = parseBrlPrice(editPrice);

    const cardId = editingCard.id;
    const updates = { language: editLanguage, condition: editCondition, pricePaid };
    updateUserCard(cardId, updates)
      .then(() => {
        setCards((current) =>
          current.map((card) => (card.id === cardId ? { ...card, ...updates } : card))
        );
        setEditingCard(null);
      })
      .catch((err: Error) => Alert.alert("Erro", err.message));
  };

  const handleConfirmDelete = () => {
    if (!deletingCard) return;
    const cardId = deletingCard.id;
    deleteUserCard(cardId)
      .then(() => {
        setCards((current) => current.filter((card) => card.id !== cardId));
        setDeletingCard(null);
      })
      .catch((err: Error) => Alert.alert("Erro", err.message));
  };

  const handleChangeStatus = (status: CardStatus) => {
    if (!statusCard) return;
    const cardId = statusCard.id;
    updateCardStatus(cardId, status)
      .then(() => {
        setCards((current) =>
          current.map((card) => (card.id === cardId ? { ...card, status } : card))
        );
        setStatusCard(null);
      })
      .catch((err: Error) => Alert.alert("Erro", err.message));
  };

  useEffect(() => {
    if (!shareCard) return;
    captureAndShareView(cardShareRef)
      .catch((err: Error) => Alert.alert("Erro", err.message))
      .finally(() => setShareCard(null));
  }, [shareCard]);

  const loadCards = useCallback(
    () =>
      listUserCards()
        .then((items) => {
          setCards(items);
          setError(null);
        })
        .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar álbum")),
    []
  );

  useFocusEffect(
    useCallback(() => {
      loadCards();
      isPremium()
        .then((active) => {
          setPremium(active);
          if (active) {
            fetchSetProgress().then(setProgress).catch(() => setProgress([]));
          }
        })
        .catch(() => setPremium(false));
    }, [loadCards])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadCards().finally(() => setRefreshing(false));
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
      <Pressable
        testID="share-collection"
        accessibilityRole="button"
        onPress={handleShareCollection}
        style={{ marginBottom: 8 }}
      >
        <Text>Compartilhar</Text>
      </Pressable>
      <Pressable
        testID="export-pdf"
        accessibilityRole="button"
        onPress={handleExportPdf}
        style={{ marginBottom: 8 }}
      >
        <Text>Exportar PDF</Text>
      </Pressable>
      {showPdfUpsell ? (
        <Text testID="export-pdf-upsell" style={{ color: "#666", marginBottom: 8 }}>
          Exportar a coleção em PDF é um recurso premium. Assine para gerar a documentação da
          sua coleção.
        </Text>
      ) : null}
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
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListEmptyComponent={
          <Text testID="album-empty" style={{ color: "#666", marginTop: 16 }}>
            Seu álbum está vazio. Busque uma carta no catálogo para cadastrar a primeira.
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable
            testID={`album-item-${item.id}`}
            onLongPress={() => setShareCard(item)}
            style={{ width: 100, margin: 8 }}
          >
            <Image
              testID={`album-image-${item.id}`}
              accessibilityLabel={item.cardName}
              source={{ uri: item.photoUrl ?? item.cardImageUrl }}
              style={{ width: 84, height: 117, borderRadius: 4 }}
            />
            <Text numberOfLines={1}>{item.cardName}</Text>
            <Pressable
              testID={`sell-card-${item.id}`}
              accessibilityRole="button"
              accessibilityLabel={`Vender ${item.cardName}`}
              onPress={() => handleOpenSale(item)}
            >
              <Text style={{ color: "#c00" }}>Vender</Text>
            </Pressable>
            <Pressable
              testID={`card-status-${item.id}`}
              accessibilityRole="button"
              accessibilityLabel={`Status ${item.cardName}`}
              onPress={() => setStatusCard(item)}
            >
              <Text style={{ color: "#06c" }}>Status</Text>
            </Pressable>
            <Pressable
              testID={`edit-card-${item.id}`}
              accessibilityRole="button"
              accessibilityLabel={`Editar ${item.cardName}`}
              onPress={() => handleOpenEdit(item)}
            >
              <Text style={{ color: "#090" }}>Editar</Text>
            </Pressable>
            <Pressable
              testID={`delete-card-${item.id}`}
              accessibilityRole="button"
              accessibilityLabel={`Excluir ${item.cardName}`}
              onPress={() => setDeletingCard(item)}
            >
              <Text style={{ color: "#900" }}>Excluir</Text>
            </Pressable>
          </Pressable>
        )}
      />
      {statusCard ? (
        <View style={{ padding: 12, borderWidth: 1, borderColor: "#ccc", borderRadius: 8 }}>
          <Text>{`Status de ${statusCard.cardName}`}</Text>
          {STATUS_OPTIONS.map((option) => (
            <Pressable
              key={option.value}
              testID={`status-option-${option.value}`}
              accessibilityRole="button"
              onPress={() => handleChangeStatus(option.value)}
              style={{ marginVertical: 4 }}
            >
              <Text style={{ fontWeight: statusCard.status === option.value ? "bold" : "normal" }}>
                {option.label}
              </Text>
            </Pressable>
          ))}
          <Pressable testID="cancel-status" accessibilityRole="button" onPress={() => setStatusCard(null)}>
            <Text>Cancelar</Text>
          </Pressable>
        </View>
      ) : null}
      {deletingCard ? (
        <View style={{ padding: 12, borderWidth: 1, borderColor: "#ccc", borderRadius: 8 }}>
          <Text>{`Excluir ${deletingCard.cardName} da coleção? Essa ação não pode ser desfeita.`}</Text>
          <Pressable
            testID="confirm-delete"
            accessibilityRole="button"
            onPress={handleConfirmDelete}
            style={{ marginVertical: 8 }}
          >
            <Text style={{ color: "#900" }}>Excluir carta</Text>
          </Pressable>
          <Pressable testID="cancel-delete" accessibilityRole="button" onPress={() => setDeletingCard(null)}>
            <Text>Cancelar</Text>
          </Pressable>
        </View>
      ) : null}
      {editingCard ? (
        <View style={{ padding: 12, borderWidth: 1, borderColor: "#ccc", borderRadius: 8 }}>
          <Text>{`Editar ${editingCard.cardName}`}</Text>
          <Text>Idioma</Text>
          {LANGUAGE_OPTIONS.map((lang) => (
            <Pressable
              key={lang.value}
              testID={`edit-language-${lang.value}`}
              accessibilityRole="button"
              onPress={() => setEditLanguage(lang.value)}
            >
              <Text style={{ fontWeight: editLanguage === lang.value ? "bold" : "normal" }}>
                {lang.label}
              </Text>
            </Pressable>
          ))}
          <Text>Estado de conservação</Text>
          {CARD_CONDITIONS.map((cond) => (
            <Pressable
              key={cond.value}
              testID={`edit-condition-${cond.value}`}
              accessibilityRole="button"
              onPress={() => setEditCondition(cond.value)}
            >
              <Text style={{ fontWeight: editCondition === cond.value ? "bold" : "normal" }}>
                {cond.label}
              </Text>
            </Pressable>
          ))}
          <Text>Preço pago (R$)</Text>
          <TextInput
            testID="edit-price-input"
            keyboardType="numeric"
            value={editPrice}
            onChangeText={setEditPrice}
            style={{ borderWidth: 1, borderColor: "#ccc", marginVertical: 8, padding: 8 }}
          />
          <Pressable testID="save-edit" accessibilityRole="button" onPress={handleSaveEdit} style={{ marginBottom: 8 }}>
            <Text>Salvar</Text>
          </Pressable>
          <Pressable testID="cancel-edit" accessibilityRole="button" onPress={() => setEditingCard(null)}>
            <Text>Cancelar</Text>
          </Pressable>
        </View>
      ) : null}
      {sellingCard ? (
        <View style={{ padding: 12, borderWidth: 1, borderColor: "#ccc", borderRadius: 8 }}>
          <Text>{`Vender ${sellingCard.cardName}`}</Text>
          <TextInput
            testID="sale-price-input"
            keyboardType="numeric"
            placeholder="Preço de venda (R$)"
            value={salePrice}
            onChangeText={setSalePrice}
            style={{ borderWidth: 1, borderColor: "#ccc", marginVertical: 8, padding: 8 }}
          />
          <Pressable
            testID="confirm-sale"
            accessibilityRole="button"
            onPress={handleConfirmSale}
            style={{ marginBottom: 8 }}
          >
            <Text>Confirmar venda</Text>
          </Pressable>
          <Pressable testID="cancel-sale" accessibilityRole="button" onPress={() => setSellingCard(null)}>
            <Text>Cancelar</Text>
          </Pressable>
        </View>
      ) : null}
      <View style={{ position: "absolute", left: -1000, top: 0 }}>
        <View ref={collectionShareRef} collapsable={false}>
          <ShareCollectionCard cardCount={cards.length} cardNames={cards.map((c) => c.cardName)} />
        </View>
        {shareCard ? (
          <View ref={cardShareRef} collapsable={false}>
            <ShareSingleCard card={shareCard} />
          </View>
        ) : null}
      </View>
    </View>
  );
}
