import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { fetchValueSnapshots, type ValueSnapshot } from "../../src/features/collection/valueRepository";
import { buildChartBars } from "../../src/features/collection/valueChart";

const BAR_MAX_HEIGHT = 160;

export default function ValueScreen() {
  const [snapshots, setSnapshots] = useState<ValueSnapshot[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchValueSnapshots()
      .then(setSnapshots)
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar valores"));
  }, []);

  if (error) {
    return (
      <View style={{ flex: 1, padding: 16 }}>
        <Text>{error}</Text>
      </View>
    );
  }

  const bars = buildChartBars(snapshots, BAR_MAX_HEIGHT);
  const latest = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;

  if (!latest || bars.length === 0) {
    return (
      <View style={{ flex: 1, padding: 16 }}>
        <Text testID="value-empty">
          Ainda sem histórico de valor. Cadastre cartas com preço e volte amanhã — o valor da
          coleção é calculado diariamente.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text testID="value-current" style={{ fontSize: 24, fontWeight: "bold" }}>
        {`R$ ${latest.totalValue.toFixed(2).replace(".", ",")}`}
      </Text>
      <Text style={{ color: "#666", marginBottom: 16 }}>Valor estimado da coleção</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: "row", alignItems: "flex-end", height: BAR_MAX_HEIGHT + 24 }}>
          {bars.map((bar) => (
            <View key={bar.label} style={{ alignItems: "center", marginRight: 6 }}>
              <View
                testID={`value-bar-${bar.label}`}
                style={{ width: 16, height: bar.height, backgroundColor: "#4a90d9", borderRadius: 3 }}
              />
              <Text style={{ fontSize: 9, marginTop: 4 }}>{bar.label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
