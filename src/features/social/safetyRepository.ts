import { getSupabaseClient } from "../../lib/supabaseClient";

export async function blockUser(blockedId: string): Promise<void> {
  const client = getSupabaseClient();
  const {
    data: { user }
  } = await client.auth.getUser();

  if (!user) {
    throw new Error("Usuário não autenticado");
  }

  const { error } = await client.from("blocks").insert({
    blocker_id: user.id,
    blocked_id: blockedId
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function reportUser(
  reportedId: string,
  reason: string,
  context: string
): Promise<void> {
  const client = getSupabaseClient();
  const {
    data: { user }
  } = await client.auth.getUser();

  if (!user) {
    throw new Error("Usuário não autenticado");
  }

  const { error } = await client.from("reports").insert({
    reporter_id: user.id,
    reported_id: reportedId,
    reason,
    context
  });

  if (error) {
    throw new Error(error.message);
  }
}
