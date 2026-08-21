import { useEffect, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { isUserVerified } from "../../src/features/premium/entitlementsRepository";
import { userRatingSummary } from "../../src/features/social/ratingsRepository";
import type { RatingSummary } from "../../src/features/social/ratingsRepository";
import { blockUser, reportUser } from "../../src/features/social/safetyRepository";

export default function UserProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const [verified, setVerified] = useState(false);
  const [rating, setRating] = useState<RatingSummary | null>(null);

  useEffect(() => {
    if (!userId) {
      return;
    }

    isUserVerified(userId).then(setVerified).catch(() => setVerified(false));
    userRatingSummary(userId)
      .then(setRating)
      .catch(() => setRating(null));
  }, [userId]);

  const handleReport = () => {
    if (!userId) {
      return;
    }

    reportUser(userId, "denúncia feita a partir do perfil", `perfil ${userId}`)
      .then(() => Alert.alert("Denúncia enviada", "Nossa equipe vai analisar."))
      .catch((err: Error) => Alert.alert("Erro", err.message));
  };

  const handleBlock = () => {
    if (!userId) {
      return;
    }

    blockUser(userId)
      .then(() => {
        Alert.alert("Usuário bloqueado");
        router.back();
      })
      .catch((err: Error) => Alert.alert("Erro", err.message));
  };

  const ratingLabel =
    rating && rating.ratingsCount > 0 && rating.avgStars !== null
      ? `Reputação: ${rating.avgStars.toFixed(1).replace(".", ",")} (${rating.ratingsCount} ${
          rating.ratingsCount === 1 ? "avaliação" : "avaliações"
        })`
      : "Sem avaliações";

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: "bold", marginBottom: 16 }}>Perfil do usuário</Text>
      {verified ? (
        <Text testID="user-verified" style={{ color: "#0a8f3c", marginBottom: 8 }}>
          ✓ Verificado
        </Text>
      ) : null}
      <Text testID="user-rating" style={{ marginBottom: 24 }}>
        {ratingLabel}
      </Text>
      <Pressable testID="report-user" onPress={handleReport} style={{ marginBottom: 16 }}>
        <Text style={{ color: "#c22" }}>Denunciar usuário</Text>
      </Pressable>
      <Pressable testID="block-user" onPress={handleBlock}>
        <Text style={{ color: "#c22" }}>Bloquear usuário</Text>
      </Pressable>
    </View>
  );
}
