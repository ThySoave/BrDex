import { useEffect, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { getSession, signOut } from "../../src/features/auth/authRepository";
import { isPremium, isUserVerified } from "../../src/features/premium/entitlementsRepository";
import { userRatingSummary } from "../../src/features/social/ratingsRepository";
import type { RatingSummary } from "../../src/features/social/ratingsRepository";

export default function ProfileScreen() {
  const [email, setEmail] = useState<string | null>(null);
  const [premium, setPremium] = useState(false);
  const [verified, setVerified] = useState(false);
  const [rating, setRating] = useState<RatingSummary | null>(null);

  useEffect(() => {
    getSession()
      .then((session) => {
        if (!session?.user) {
          return;
        }

        setEmail(session.user.email ?? null);

        isUserVerified(session.user.id).then(setVerified).catch(() => setVerified(false));
        userRatingSummary(session.user.id)
          .then(setRating)
          .catch(() => setRating(null));
      })
      .catch(() => setEmail(null));

    isPremium()
      .then(setPremium)
      .catch(() => setPremium(false));
  }, []);

  const handleSignOut = () => {
    signOut()
      .then(() => router.replace("/(auth)/login"))
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
      <Text style={{ fontSize: 20, fontWeight: "bold", marginBottom: 16 }}>Perfil</Text>
      {email ? (
        <Text testID="profile-email" style={{ marginBottom: 8 }}>
          {email}
        </Text>
      ) : null}
      {verified ? (
        <Text testID="profile-verified" style={{ color: "#0a8f3c", marginBottom: 8 }}>
          ✓ Verificado
        </Text>
      ) : null}
      <Text testID="profile-plan" style={{ marginBottom: 8 }}>
        {premium ? "Plano: Premium" : "Plano: Grátis"}
      </Text>
      <Text testID="profile-rating" style={{ marginBottom: 24 }}>
        {ratingLabel}
      </Text>
      <Pressable testID="sign-out" accessibilityRole="button" onPress={handleSignOut}>
        <Text style={{ color: "#c22" }}>Sair da conta</Text>
      </Pressable>
    </View>
  );
}
