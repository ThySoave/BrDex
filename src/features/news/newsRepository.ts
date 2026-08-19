import { getSupabaseClient } from "../../lib/supabaseClient";

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  publishedAt: string;
}

export async function listNews(limit = 30): Promise<NewsItem[]> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("news_items")
    .select("id, title, summary, url, source, published_at")
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    title: row.title,
    summary: row.summary,
    url: row.url,
    source: row.source,
    publishedAt: row.published_at
  }));
}
