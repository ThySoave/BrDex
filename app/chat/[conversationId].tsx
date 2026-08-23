import { useEffect, useState } from "react";
import { Alert, FlatList, Pressable, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  listMessages,
  sendMessage,
  subscribeToMessages,
  type ChatMessage
} from "../../src/features/social/chatRepository";
import {
  myRatedTradeIds,
  rateTrade,
  userRatingSummary,
  type RatingSummary
} from "../../src/features/social/ratingsRepository";
import { REPORT_REASONS } from "../../src/features/social/reportReasons";
import { blockUser, reportUser } from "../../src/features/social/safetyRepository";
import {
  completedTradesCount,
  confirmTrade,
  listTrades,
  proposeTrade,
  type Trade
} from "../../src/features/social/tradesRepository";

export default function ChatScreen() {
  const { conversationId, other } = useLocalSearchParams<{
    conversationId: string;
    other: string;
  }>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [trades, setTrades] = useState<Trade[]>([]);
  const [reputation, setReputation] = useState<number | null>(null);
  const [ratingSummary, setRatingSummary] = useState<RatingSummary | null>(null);
  const [ratedTradeIds, setRatedTradeIds] = useState<string[]>([]);
  const [choosingReportReason, setChoosingReportReason] = useState(false);

  const loadTrades = () => {
    if (!conversationId) {
      return;
    }
    listTrades(conversationId)
      .then((loaded) => {
        setTrades(loaded);
        const confirmedIds = loaded.filter((t) => t.confirmedAt).map((t) => t.id);
        return myRatedTradeIds(confirmedIds).then(setRatedTradeIds);
      })
      .catch(() => setTrades([]));
    if (other) {
      completedTradesCount(other)
        .then(setReputation)
        .catch(() => setReputation(null));
      userRatingSummary(other)
        .then(setRatingSummary)
        .catch(() => setRatingSummary(null));
    }
  };

  useEffect(() => {
    if (!conversationId) {
      return;
    }

    listMessages(conversationId)
      .then(setMessages)
      .catch((err: Error) => Alert.alert("Erro", err.message));

    loadTrades();

    const unsubscribe = subscribeToMessages(conversationId, (message) => {
      setMessages((current) =>
        current.some((m) => m.id === message.id) ? current : [...current, message]
      );
    });

    return unsubscribe;
  }, [conversationId]);

  const handleSend = () => {
    const body = draft.trim();
    if (!body || !conversationId) {
      return;
    }

    sendMessage(conversationId, body)
      .then(() => {
        setDraft("");
        return listMessages(conversationId).then(setMessages);
      })
      .catch((err: Error) => Alert.alert("Erro", err.message));
  };

  const handleReport = () => {
    setChoosingReportReason((current) => !current);
  };

  const handleReportReason = (reasonLabel: string) => {
    if (!other) {
      return;
    }

    setChoosingReportReason(false);
    reportUser(other, reasonLabel, `conversa ${conversationId}`)
      .then(() => Alert.alert("Denúncia enviada", "Nossa equipe vai analisar."))
      .catch((err: Error) => Alert.alert("Erro", err.message));
  };

  const handleBlock = () => {
    if (!other) {
      return;
    }

    blockUser(other)
      .then(() => {
        Alert.alert("Usuário bloqueado");
        router.back();
      })
      .catch((err: Error) => Alert.alert("Erro", err.message));
  };

  const handleProposeTrade = () => {
    if (!conversationId) {
      return;
    }

    proposeTrade(conversationId)
      .then(() => {
        Alert.alert("Proposta enviada", "Aguardando a confirmação do outro usuário.");
        loadTrades();
      })
      .catch((err: Error) => Alert.alert("Erro", err.message));
  };

  const handleConfirmTrade = (tradeId: string) => {
    confirmTrade(tradeId)
      .then(loadTrades)
      .catch((err: Error) => Alert.alert("Erro", err.message));
  };

  const handleRateTrade = (tradeId: string, stars: number) => {
    rateTrade(tradeId, stars)
      .then(() => {
        Alert.alert("Avaliação enviada", "Obrigado por avaliar a negociação.");
        loadTrades();
      })
      .catch((err: Error) => Alert.alert("Erro", err.message));
  };

  const pendingFromOther = trades.find((t) => !t.confirmedAt && t.proposedBy === other);
  const pendingOwn = trades.find((t) => !t.confirmedAt && t.proposedBy !== other);
  const unratedConfirmed = trades.find((t) => t.confirmedAt && !ratedTradeIds.includes(t.id));

  return (
    <View style={{ flex: 1, padding: 16 }}>
      {reputation !== null ? (
        <Text testID="chat-reputation" style={{ color: "#666" }}>
          {`${reputation} ${reputation === 1 ? "negociação concluída" : "negociações concluídas"}`}
        </Text>
      ) : null}
      {ratingSummary && ratingSummary.ratingsCount > 0 ? (
        <Text testID="chat-rating-summary" style={{ color: "#666" }}>
          {`${ratingSummary.avgStars} ★ (${ratingSummary.ratingsCount} ${
            ratingSummary.ratingsCount === 1 ? "avaliação" : "avaliações"
          })`}
        </Text>
      ) : null}
      {unratedConfirmed ? (
        <View style={{ marginVertical: 4 }}>
          <Text style={{ color: "#666" }}>Avaliar negociação:</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {[1, 2, 3, 4, 5].map((stars) => (
              <Pressable
                key={stars}
                testID={`chat-rate-${stars}`}
                accessibilityRole="button"
                accessibilityLabel={`Avaliar com ${stars} ${stars === 1 ? "estrela" : "estrelas"}`}
                onPress={() => handleRateTrade(unratedConfirmed.id, stars)}
              >
                <Text style={{ color: "#0a66c2" }}>{`${stars}★`}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
      {pendingFromOther ? (
        <Pressable
          testID="chat-confirm-trade"
          accessibilityRole="button"
          onPress={() => handleConfirmTrade(pendingFromOther.id)}
          style={{ marginVertical: 4 }}
        >
          <Text style={{ color: "#0a66c2" }}>Confirmar troca</Text>
        </Pressable>
      ) : null}
      {!pendingOwn ? (
        <Pressable
          testID="chat-propose-trade"
          accessibilityRole="button"
          onPress={handleProposeTrade}
          style={{ marginVertical: 4 }}
        >
          <Text style={{ color: "#0a66c2" }}>Troca concluída</Text>
        </Pressable>
      ) : (
        <Text style={{ color: "#666" }}>Proposta de troca aguardando confirmação.</Text>
      )}
      <Text testID="chat-disclaimer">
        A negociação (pagamento, entrega) é por conta dos usuários — o BrDex não garante nem
        participa da transação.
      </Text>
      <View style={{ flexDirection: "row", gap: 16, marginVertical: 8 }}>
        {other ? (
          <Pressable
            testID="chat-view-profile"
            accessibilityRole="button"
            onPress={() => router.push(`/user/${other}`)}
          >
            <Text style={{ color: "#0a66c2" }}>Ver perfil</Text>
          </Pressable>
        ) : null}
        <Pressable testID="chat-report" accessibilityRole="button" onPress={handleReport}>
          <Text>Denunciar</Text>
        </Pressable>
        <Pressable testID="chat-block" accessibilityRole="button" onPress={handleBlock}>
          <Text>Bloquear</Text>
        </Pressable>
      </View>
      {choosingReportReason ? (
        <View style={{ marginBottom: 8 }}>
          <Text style={{ marginBottom: 8 }}>Qual o motivo da denúncia?</Text>
          {REPORT_REASONS.map((reason) => (
            <Pressable
              key={reason.value}
              testID={`report-reason-${reason.value}`}
              accessibilityRole="button"
              onPress={() => handleReportReason(reason.label)}
              style={{ marginBottom: 8 }}
            >
              <Text>{reason.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <FlatList
        testID="chat-messages"
        data={messages}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text testID="chat-empty" style={{ color: "#666", marginTop: 16 }}>
            Nenhuma mensagem ainda. Envie a primeira para combinar a negociação.
          </Text>
        }
        renderItem={({ item }) => (
          <View testID={`chat-message-${item.id}`} style={{ marginBottom: 8 }}>
            <Text>{item.body}</Text>
          </View>
        )}
      />
      <View style={{ flexDirection: "row", gap: 8 }}>
        <TextInput
          testID="chat-input"
          placeholder="Escreva uma mensagem..."
          value={draft}
          onChangeText={setDraft}
          style={{ flex: 1 }}
        />
        <Pressable testID="chat-send" accessibilityRole="button" onPress={handleSend}>
          <Text>Enviar</Text>
        </Pressable>
      </View>
    </View>
  );
}
