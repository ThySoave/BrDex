import { getSupabaseClient } from "../../lib/supabaseClient";

export interface SetRelease {
  id: string;
  setId: string;
  setName: string;
  releasedDetectedAt: string;
}

const MAX_RELEASES = 10;

export async function listUndismissedSetReleases(): Promise<SetRelease[]> {
  const client = getSupabaseClient();

  // RLS garante que só as dispensas do usuário atual são visíveis
  const { data: dismissed, error: dismissedError } = await client
    .from("user_dismissed_set_releases")
    .select("set_release_id");

  if (dismissedError) {
    throw new Error(dismissedError.message);
  }

  const dismissedIds = (dismissed ?? []).map((row: any) => row.set_release_id);

  let query = client
    .from("set_releases")
    .select("id, set_id, set_name, released_detected_at")
    .order("released_detected_at", { ascending: false })
    .limit(MAX_RELEASES);

  if (dismissedIds.length > 0) {
    query = query.not("id", "in", `(${dismissedIds.join(",")})`);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    setId: row.set_id,
    setName: row.set_name,
    releasedDetectedAt: row.released_detected_at
  }));
}

export async function dismissSetRelease(setReleaseId: string): Promise<void> {
  const client = getSupabaseClient();
  const {
    data: { user }
  } = await client.auth.getUser();

  if (!user) {
    throw new Error("Usuário não autenticado");
  }

  const { error } = await client.from("user_dismissed_set_releases").insert({
    user_id: user.id,
    set_release_id: setReleaseId
  });

  if (error) {
    throw new Error(error.message);
  }
}
