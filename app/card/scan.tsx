import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { isPremium } from "../../src/features/premium/entitlementsRepository";
import { recognizeCard } from "../../src/features/scanner/scannerRepository";
import { searchCatalogByName } from "../../src/features/catalog/catalogRepository";
import { matchScannedCard } from "../../src/features/scanner/matchCard";

export default function ScanCardScreen() {
  const router = useRouter();
  const [premium, setPremium] = useState<boolean | null>(null);
  const [scanning, setScanning] = useState(false);
  const [noMatch, setNoMatch] = useState(false);

  useEffect(() => {
    isPremium()
      .then(setPremium)
      .catch(() => setPremium(false));
  }, []);

  async function handleCapture() {
    setNoMatch(false);

    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permissão negada", "Autorize o uso da câmera para escanear cartas.");
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

    setScanning(true);
    try {
      const recognition = await recognizeCard(imageBase64);
      const candidates = recognition.name ? await searchCatalogByName(recognition.name) : [];
      const match = matchScannedCard(candidates, recognition);

      if (match) {
        router.replace(`/card/add?catalogCardId=${match.id}`);
        return;
      }

      setNoMatch(true);
    } catch (err) {
      Alert.alert("Erro", err instanceof Error ? err.message : "Erro ao reconhecer a carta");
    } finally {
      setScanning(false);
    }
  }

  if (premium === null) {
    return (
      <View style={{ flex: 1, padding: 16 }}>
        <ActivityIndicator testID="scan-loading" />
      </View>
    );
  }

  if (!premium) {
    return (
      <View style={{ flex: 1, padding: 16 }}>
        <Text testID="scanner-upsell" style={{ color: "#666" }}>
          O scanner de cartas por foto é um recurso premium. Assine para cadastrar cartas
          apontando a câmera para elas.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ marginBottom: 8 }}>
        Tire uma foto da carta para reconhecê-la e preencher o cadastro automaticamente.
      </Text>

      <Pressable testID="scan-capture" accessibilityRole="button" disabled={scanning} onPress={handleCapture}>
        <Text style={{ color: "#0a66c2" }}>{scanning ? "Reconhecendo..." : "Escanear carta"}</Text>
      </Pressable>

      {noMatch ? (
        <View style={{ marginTop: 16 }}>
          <Text testID="scan-no-match" style={{ color: "#666" }}>
            Carta não reconhecida. Tente outra foto ou busque manualmente no catálogo.
          </Text>
          <Pressable
            testID="scan-manual-fallback"
            accessibilityRole="button"
            onPress={() => router.replace("/(tabs)/catalog")}
          >
            <Text style={{ color: "#0a66c2" }}>Buscar no catálogo</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
