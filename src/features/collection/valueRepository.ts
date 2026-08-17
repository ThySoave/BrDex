import { getSupabaseClient } from "../../lib/supabaseClient";

export interface ValueSnapshot {
  capturedOn: string;
  totalValue: number;
}

export async function fetchValueSnapshots(): Promise<ValueSnapshot[]> {
  const { data, error } = await getSupabaseClient()
    .from("collection_value_snapshots")
    .select("captured_on, total_value")
    .order("captured_on", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    capturedOn: row.captured_on,
    totalValue: row.total_value
  }));
}
