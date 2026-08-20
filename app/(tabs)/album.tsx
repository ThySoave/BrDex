import { useEffect, useRef, useState } from "react";
import { Alert, FlatList, Pressable, Text, View } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { listUserCards } from "../../src/features/collection/collectionRepository";
import { buildCollectionPdfHtml } from "../../src/features/collection/exportPdf";
import { fetchSetProgress, type SetProgress } from "../../src/features/collection/setProgressRepository";
import { ShareCollectionCard, ShareSingleCard } from "../../src/features/collection/shareCards";
import { captureAndShareView } from "../../src/features/collection/shareImage";
import { isPremium } from "../../src/features/premium/entitlementsRepository";
import type { UserCard } from "../../src/features/collection/types";

export default function AlbumScreen() {
  const [cards, setCards] = useState<UserCard[]>([]);
  const [premium, setPremium] = useState(false);
  const [progress, setProgress] = useState<SetProgress[]>([]);
  const [showPdfUpsell, setShowPdfUpsell] = useState(false);
  const [shareCard, setShareCard] = useState<UserCard | null>(null);
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
            <Text numberOfLines={1}>{item.cardName}</Text>
          </Pressable>
        )}
      />
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
