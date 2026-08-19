import { useEffect, useState } from "react";
import { Alert, FlatList, Pressable, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  listMessages,
  sendMessage,
  subscribeToMessages,
  type ChatMessage
} from "../../src/features/social/chatRepository";
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

  const loadTrades = () => {
    if (!conversationId) {
      return;
    }
    listTrades(conversationId)
      .then(setTrades)
      .catch(() => setTrades([]));
    if (other) {
      completedTradesCount(other)
        .then(setReputation)
        .catch(() => setReputation(null));
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
    if (!other) {
      return;
    }

    reportUser(other, "denúncia feita a partir do chat", `conversa ${conversationId}`)
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

  const pendingFromOther = trades.find((t) => !t.confirmedAt && t.proposedBy === other);
  const pendingOwn = trades.find((t) => !t.confirmedAt && t.proposedBy !== other);

  return (
    <View style={{ flex: 1, padding: 16 }}>
      {reputation !== null ? (
        <Text testID="chat-reputation" style={{ color: "#666" }}>
          {`${reputation} ${reputation === 1 ? "negociação concluída" : "negociações concluídas"}`}
        </Text>
      ) : null}
      {pendingFromOther ? (
        <Pressable
          testID="chat-confirm-trade"
          onPress={() => handleConfirmTrade(pendingFromOther.id)}
          style={{ marginVertical: 4 }}
        >
          <Text style={{ color: "#0a66c2" }}>Confirmar troca</Text>
        </Pressable>
      ) : null}
      {!pendingOwn ? (
        <Pressable testID="chat-propose-trade" onPress={handleProposeTrade} style={{ marginVertical: 4 }}>
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
        <Pressable testID="chat-report" onPress={handleReport}>
          <Text>Denunciar</Text>
        </Pressable>
        <Pressable testID="chat-block" onPress={handleBlock}>
          <Text>Bloquear</Text>
        </Pressable>
      </View>
      <FlatList
        testID="chat-messages"
        data={messages}
        keyExtractor={(item) => item.id}
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
        <Pressable testID="chat-send" onPress={handleSend}>
          <Text>Enviar</Text>
        </Pressable>
      </View>
    </View>
  );
}
