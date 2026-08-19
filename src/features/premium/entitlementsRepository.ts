import { getSupabaseClient } from "../../lib/supabaseClient";

export async function isPremium(): Promise<boolean> {
  const client = getSupabaseClient();
  const {
    data: { user }
  } = await client.auth.getUser();

  if (!user) {
    return false;
  }

  const { data, error } = await client.rpc("is_premium", { uid: user.id });

  if (error) {
    throw new Error(error.message);
  }

  return data === true;
}

// Selo de verificado = assinatura premium ativa; informativo, nunca quebra a listagem.
export async function isUserVerified(userId: string): Promise<boolean> {
  const client = getSupabaseClient();
  const { data, error } = await client.rpc("is_premium", { uid: userId });

  if (error) {
    return false;
  }

  return data === true;
}
