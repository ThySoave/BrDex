import { getSupabaseClient } from "../../lib/supabaseClient";
import type { CardRecognition } from "./matchCard";

export async function recognizeCard(imageBase64: string): Promise<CardRecognition> {
  const { data, error } = await getSupabaseClient().functions.invoke("recognize-card", {
    body: { imageBase64 }
  });

  if (error) {
    throw new Error(error.message);
  }

  return { name: data?.name ?? null, number: data?.number ?? null };
}
