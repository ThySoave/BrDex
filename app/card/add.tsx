import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, View, Text, Pressable, ScrollView, TextInput } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { addUserCard, countUserCards } from "../../src/features/collection/collectionRepository";
import { uploadCardPhoto } from "../../src/features/collection/photoRepository";
import { CardPrices } from "../../src/components/CardPrices";
import { parseBrlPrice } from "../../src/lib/parsePrice";
import { CARD_CONDITIONS, type CardCondition } from "../../src/features/collection/conditionScale";
import type { CardLanguage, CardStatus } from "../../src/features/collection/types";
import { isPremium } from "../../src/features/premium/entitlementsRepository";
import { canAddCard, FREE_CARD_LIMIT } from "../../src/features/premium/cardLimit";

const LANGUAGES: { value: CardLanguage; label: string }[] = [
  { value: "en", label: "Inglês" },
  { value: "pt", label: "Português" },
  { value: "jp", label: "Japonês" },
  { value: "other", label: "Outro" }
];

const STATUSES: { value: CardStatus; label: string }[] = [
  { value: "guardada", label: "Guardada" },
  { value: "a_venda", label: "À venda" },
  { value: "disponivel_troca", label: "Disponível para troca" }
];

export default function AddCardScreen() {
  const { catalogCardId } = useLocalSearchParams<{ catalogCardId: string }>();
  const router = useRouter();

  const [language, setLanguage] = useState<CardLanguage>("en");
  const [condition, setCondition] = useState<CardCondition>("near_mint");
  const [status, setStatus] = useState<CardStatus>("guardada");
  const [pricePaid, setPricePaid] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    Promise.all([isPremium(), countUserCards()])
      .then(([premium, count]) => setAllowed(canAddCard(count, premium)))
      .catch(() => setAllowed(true));
  }, []);

  async function handleTakePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permissão negada", "Autorize o uso da câmera para fotografar a carta.");
      return;
    }

    const capture = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      base64: true,
      quality: 0.5
    });

    const imageBase64 = capture.canceled ? null : capture.assets?.[0]?.base64;
    if (!imageBase64) {
      return;
    }

    try {
      setPhotoUrl(await uploadCardPhoto(imageBase64));
    } catch (err) {
      Alert.alert("Erro", err instanceof Error ? err.message : "Erro ao enviar a foto");
    }
  }

  async function handleSubmit() {
    setError(null);
    try {
      await addUserCard({
        catalogCardId,
        language,
        condition,
        pricePaid: parseBrlPrice(pricePaid),
        status,
        photoUrl
      });
      router.replace("/(tabs)/album");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao cadastrar carta");
    }
  }

  if (allowed === null) {
    return (
      <View style={{ flex: 1, padding: 16 }}>
        <ActivityIndicator testID="add-card-loading" />
      </View>
    );
  }

  if (!allowed) {
    return (
      <View style={{ flex: 1, padding: 16 }}>
        <Text testID="card-limit-upsell" style={{ color: "#666" }}>
          Você chegou ao limite de {FREE_CARD_LIMIT} cartas do plano grátis. Assine o premium para
          cadastrar cartas ilimitadas.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, padding: 16 }}>
      {catalogCardId ? <CardPrices catalogCardId={catalogCardId} language={language} /> : null}
      <Text>Idioma</Text>
      {LANGUAGES.map((lang) => (
        <Pressable key={lang.value} testID={`language-${lang.value}`} onPress={() => setLanguage(lang.value)}>
          <Text style={{ fontWeight: language === lang.value ? "bold" : "normal" }}>{lang.label}</Text>
        </Pressable>
      ))}

      <Text>Estado de conservação</Text>
      {CARD_CONDITIONS.map((cond) => (
        <Pressable key={cond.value} testID={`condition-${cond.value}`} onPress={() => setCondition(cond.value)}>
          <Text style={{ fontWeight: condition === cond.value ? "bold" : "normal" }}>{cond.label}</Text>
        </Pressable>
      ))}

      <Text>Status</Text>
      {STATUSES.map((s) => (
        <Pressable key={s.value} testID={`status-${s.value}`} onPress={() => setStatus(s.value)}>
          <Text style={{ fontWeight: status === s.value ? "bold" : "normal" }}>{s.label}</Text>
        </Pressable>
      ))}

      <Text>Foto da carta (opcional)</Text>
      <Pressable testID="add-card-photo" onPress={handleTakePhoto}>
        <Text>Tirar foto da carta</Text>
      </Pressable>
      {photoUrl ? <Text testID="add-card-photo-done">Foto adicionada</Text> : null}

      <Text>Preço pago (R$)</Text>
      <TextInput
        testID="add-card-price"
        keyboardType="numeric"
        value={pricePaid}
        onChangeText={setPricePaid}
      />

      {error ? <Text style={{ color: "red" }}>{error}</Text> : null}

      <Pressable testID="add-card-submit" onPress={handleSubmit}>
        <Text>Salvar carta</Text>
      </Pressable>
    </ScrollView>
  );
}
