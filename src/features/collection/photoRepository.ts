import { getSupabaseClient } from "../../lib/supabaseClient";

export async function uploadCardPhoto(base64: string): Promise<string> {
  const client = getSupabaseClient();
  const {
    data: { user }
  } = await client.auth.getUser();

  if (!user) {
    throw new Error("Usuário não autenticado");
  }

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  const path = `${user.id}/${Date.now()}.jpg`;
  const bucket = client.storage.from("card-photos");
  const { error } = await bucket.upload(path, bytes, { contentType: "image/jpeg" });

  if (error) {
    throw new Error(error.message);
  }

  return bucket.getPublicUrl(path).data.publicUrl;
}
