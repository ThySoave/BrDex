import { getSupabaseClient } from "../../lib/supabaseClient";

export interface TriggeredPriceAlert {
  alertId: string;
  catalogCardId: string;
  cardName: string;
  language: string;
  thresholdBrl: number;
  currentPrice: number;
}

export async function createPriceAlert(
  catalogCardId: string,
  language: string,
  thresholdBrl: number
): Promise<void> {
  const client = getSupabaseClient();
  const {
    data: { user }
  } = await client.auth.getUser();

  if (!user) {
    throw new Error("Usuário não autenticado");
  }

  const { error } = await client.from("price_alerts").insert({
    user_id: user.id,
    catalog_card_id: catalogCardId,
    language,
    threshold_brl: thresholdBrl
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function listTriggeredPriceAlerts(): Promise<TriggeredPriceAlert[]> {
  const client = getSupabaseClient();
  const { data, error } = await client.rpc("triggered_price_alerts");

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row: any) => ({
    alertId: row.alert_id,
    catalogCardId: row.catalog_card_id,
    cardName: row.card_name,
    language: row.language,
    thresholdBrl: row.threshold_brl,
    currentPrice: row.current_price
  }));
}

export async function removePriceAlert(alertId: string): Promise<void> {
  const client = getSupabaseClient();
  const { error } = await client.from("price_alerts").delete().eq("id", alertId);

  if (error) {
    throw new Error(error.message);
  }
}
