import type { Session } from "@supabase/supabase-js";
import { getSupabaseClient } from "../../lib/supabaseClient";

export async function signUp(email: string, password: string): Promise<void> {
  const { error } = await getSupabaseClient().auth.signUp({ email, password });
  if (error) {
    throw new Error(error.message);
  }
}

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await getSupabaseClient().auth.signInWithPassword({ email, password });
  if (error) {
    throw new Error(error.message);
  }
}

export async function signOut(): Promise<void> {
  const { error } = await getSupabaseClient().auth.signOut();
  if (error) {
    throw new Error(error.message);
  }
}

export async function getSession(): Promise<Session | null> {
  const {
    data: { session }
  } = await getSupabaseClient().auth.getSession();
  return session;
}
