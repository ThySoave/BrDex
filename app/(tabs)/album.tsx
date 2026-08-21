import { useEffect, useRef, useState } from "react";
import { Alert, FlatList, Image, Pressable, Text, TextInput, View } from "react-native";
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
import type { CardLanguage, CardStatus, UserCard } from "../../src/features/collection/types";

const STATUS_OPTIONS: { value: CardStatus; label: string }[] = [
  { value: "guardada", label: "Guardada" },
  { value: "a_venda", label: "À venda" },
  { value: "disponivel_troca", label: "Disponível para troca" }
];

const LANGUAGES: { value: CardLanguage; label: string }[] = [
  { value: "en", label: "Inglês" },
  { value: "pt", label: "Português" },
  { value: "jp", label: "Japonês" },
  { value: "other", label: "Outro" }
];

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
    const price = Number.parseFloat(salePrice.replace(",", "."));
    if (!Number.isFinite(price) || price <= 0) return;

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
    const parsed = Number.parseFloat(editPrice.replace(",", "."));
    const pricePaid = Number.isFinite(parsed) ? parsed : null;

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
      <Pressable testID="share-collection" onPress={handleShareCollection} style={{ marginBottom: 8 }}>
        <Text>Compartilhar</Text>
      </Pressable>
      <Pressable testID="export-pdf" onPress={handleExportPdf} style={{ marginBottom: 8 }}>
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
        renderItem={({ item }) => (
          <Pressable
            testID={`album-item-${item.id}`}
            onLongPress={() => setShareCard(item)}
            style={{ width: 100, margin: 8 }}
          >
            <Image
              testID={`album-image-${item.id}`}
              source={{ uri: item.photoUrl ?? item.cardImageUrl }}
              style={{ width: 84, height: 117, borderRadius: 4 }}
            />
            <Text numberOfLines={1}>{item.cardName}</Text>
            <Pressable testID={`sell-card-${item.id}`} onPress={() => handleOpenSale(item)}>
              <Text style={{ color: "#c00" }}>Vender</Text>
            </Pressable>
            <Pressable testID={`card-status-${item.id}`} onPress={() => setStatusCard(item)}>
              <Text style={{ color: "#06c" }}>Status</Text>
            </Pressable>
            <Pressable testID={`edit-card-${item.id}`} onPress={() => handleOpenEdit(item)}>
              <Text style={{ color: "#090" }}>Editar</Text>
            </Pressable>
            <Pressable testID={`delete-card-${item.id}`} onPress={() => setDeletingCard(item)}>
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
              onPress={() => handleChangeStatus(option.value)}
              style={{ marginVertical: 4 }}
            >
              <Text style={{ fontWeight: statusCard.status === option.value ? "bold" : "normal" }}>
                {option.label}
              </Text>
            </Pressable>
          ))}
          <Pressable testID="cancel-status" onPress={() => setStatusCard(null)}>
            <Text>Cancelar</Text>
          </Pressable>
        </View>
      ) : null}
      {deletingCard ? (
        <View style={{ padding: 12, borderWidth: 1, borderColor: "#ccc", borderRadius: 8 }}>
          <Text>{`Excluir ${deletingCard.cardName} da coleção? Essa ação não pode ser desfeita.`}</Text>
          <Pressable testID="confirm-delete" onPress={handleConfirmDelete} style={{ marginVertical: 8 }}>
            <Text style={{ color: "#900" }}>Excluir carta</Text>
          </Pressable>
          <Pressable testID="cancel-delete" onPress={() => setDeletingCard(null)}>
            <Text>Cancelar</Text>
          </Pressable>
        </View>
      ) : null}
      {editingCard ? (
        <View style={{ padding: 12, borderWidth: 1, borderColor: "#ccc", borderRadius: 8 }}>
          <Text>{`Editar ${editingCard.cardName}`}</Text>
          <Text>Idioma</Text>
          {LANGUAGES.map((lang) => (
            <Pressable
              key={lang.value}
              testID={`edit-language-${lang.value}`}
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
          <Pressable testID="save-edit" onPress={handleSaveEdit} style={{ marginBottom: 8 }}>
            <Text>Salvar</Text>
          </Pressable>
          <Pressable testID="cancel-edit" onPress={() => setEditingCard(null)}>
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
          <Pressable testID="confirm-sale" onPress={handleConfirmSale} style={{ marginBottom: 8 }}>
            <Text>Confirmar venda</Text>
          </Pressable>
          <Pressable testID="cancel-sale" onPress={() => setSellingCard(null)}>
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
