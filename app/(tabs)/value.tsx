import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { fetchValueSnapshots, type ValueSnapshot } from "../../src/features/collection/valueRepository";
import { buildChartBars, limitHistoryDays } from "../../src/features/collection/valueChart";
import { isPremium } from "../../src/features/premium/entitlementsRepository";
import {
  listTriggeredPriceAlerts,
  removePriceAlert,
  type TriggeredPriceAlert
} from "../../src/features/premium/priceAlertsRepository";

function formatBrl(value: number): string {
  return `R$ ${value.toFixed(2).replace(".", ",")}`;
}

const FREE_HISTORY_DAYS = 30;

const BAR_MAX_HEIGHT = 160;

export default function ValueScreen() {
  const [snapshots, setSnapshots] = useState<ValueSnapshot[]>([]);
  const [premium, setPremium] = useState(false);
  const [alerts, setAlerts] = useState<TriggeredPriceAlert[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchValueSnapshots()
      .then(setSnapshots)
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar valores"));
    isPremium()
      .then(setPremium)
      .catch(() => setPremium(false));
    listTriggeredPriceAlerts()
      .then(setAlerts)
      .catch(() => setAlerts([]));
  }, []);

  const handleRemoveAlert = (alertId: string) => {
    removePriceAlert(alertId)
      .then(() => setAlerts((current) => current.filter((alert) => alert.alertId !== alertId)))
      .catch((err: Error) => Alert.alert("Erro", err.message));
  };

  const alertsSection =
    alerts.length > 0 ? (
      <View style={{ marginBottom: 16 }}>
        {alerts.map((alert) => (
          <View
            key={alert.alertId}
            testID={`triggered-alert-${alert.alertId}`}
            style={{ backgroundColor: "#fff7e6", borderRadius: 8, padding: 12, marginBottom: 8 }}
          >
            <Text style={{ fontWeight: "bold" }}>
              {`${alert.cardName} passou de ${formatBrl(alert.thresholdBrl)} — atual ${formatBrl(alert.currentPrice)}`}
            </Text>
            <Pressable
              testID={`triggered-alert-remove-${alert.alertId}`}
              onPress={() => handleRemoveAlert(alert.alertId)}
              style={{ marginTop: 4 }}
            >
              <Text style={{ color: "#0a66c2" }}>Remover alerta</Text>
            </Pressable>
          </View>
        ))}
      </View>
    ) : null;

  if (error) {
    return (
      <View style={{ flex: 1, padding: 16 }}>
        <Text>{error}</Text>
      </View>
    );
  }

  const visibleSnapshots = premium ? snapshots : limitHistoryDays(snapshots, FREE_HISTORY_DAYS);
  const bars = buildChartBars(visibleSnapshots, BAR_MAX_HEIGHT);
  const latest = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;

  if (!latest || bars.length === 0) {
    return (
      <View style={{ flex: 1, padding: 16 }}>
        {alertsSection}
        <Text testID="value-empty">
          Ainda sem histórico de valor. Cadastre cartas com preço e volte amanhã — o valor da
          coleção é calculado diariamente.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      {alertsSection}
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
      {!premium && (
        <Text testID="value-upsell" style={{ color: "#666", marginTop: 12 }}>
          Assine o premium para ver o histórico completo.
        </Text>
      )}
    </View>
  );
}
