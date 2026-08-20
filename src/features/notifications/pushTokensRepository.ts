import { getSupabaseClient } from "../../lib/supabaseClient";

export async function registerPushToken(token: string, platform: string): Promise<void> {
  const client = getSupabaseClient();
  const {
    data: { user }
  } = await client.auth.getUser();

  if (!user) {
    throw new Error("Usuário não autenticado");
  }

  const { error } = await client
    .from("push_tokens")
    .upsert({ user_id: user.id, token, platform }, { onConflict: "user_id,token" });

  if (error) {
    throw new Error(error.message);
  }
}
