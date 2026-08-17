import { useState } from "react";
import { View, Text, Pressable, ScrollView, TextInput } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { addUserCard } from "../../src/features/collection/collectionRepository";
import { CardPrices } from "../../src/components/CardPrices";
import { CARD_CONDITIONS, type CardCondition } from "../../src/features/collection/conditionScale";
import type { CardLanguage, CardStatus } from "../../src/features/collection/types";

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
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    try {
      await addUserCard({
        catalogCardId,
        language,
        condition,
        pricePaid: pricePaid ? Number(pricePaid) : null,
        status
      });
      router.replace("/(tabs)/album");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao cadastrar carta");
    }
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
