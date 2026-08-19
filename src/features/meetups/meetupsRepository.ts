import { getSupabaseClient } from "../../lib/supabaseClient";

export interface Meetup {
  id: string;
  title: string;
  city: string;
  startsAt: string;
  description: string | null;
}

export interface MeetupInput {
  title: string;
  city: string;
  startsAt: string;
  description: string | null;
}

export async function listUpcomingMeetups(): Promise<Meetup[]> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("meetups")
    .select("id, title, city, starts_at, description")
    .gte("starts_at", new Date().toISOString())
    .order("starts_at");

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    title: row.title,
    city: row.city,
    startsAt: row.starts_at,
    description: row.description
  }));
}

export async function createMeetup(input: MeetupInput): Promise<void> {
  const client = getSupabaseClient();
  const {
    data: { user }
  } = await client.auth.getUser();

  if (!user) {
    throw new Error("Usuário não autenticado");
  }

  const { error } = await client.from("meetups").insert({
    created_by: user.id,
    title: input.title,
    city: input.city,
    starts_at: input.startsAt,
    description: input.description
  });

  if (error) {
    throw new Error(error.message);
  }
}
