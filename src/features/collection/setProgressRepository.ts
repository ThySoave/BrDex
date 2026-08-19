import { getSupabaseClient } from "../../lib/supabaseClient";

export interface SetProgress {
  setId: string;
  setName: string;
  owned: number;
  total: number;
}

export async function fetchSetProgress(): Promise<SetProgress[]> {
  const client = getSupabaseClient();
  const {
    data: { user }
  } = await client.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await client.rpc("set_progress", { uid: user.id });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row: any) => ({
    setId: row.set_id,
    setName: row.set_name,
    owned: row.owned,
    total: row.total
  }));
}
