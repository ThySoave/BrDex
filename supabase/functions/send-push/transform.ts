export interface QueueRow {
  id: string;
  user_id: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
}

export interface PushTokenRow {
  user_id: string;
  token: string;
}

export interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
}

export interface BuildResult {
  messages: ExpoPushMessage[];
  deliveredIds: string[];
  skippedIds: string[];
}

export function buildPushMessages(rows: QueueRow[], tokens: PushTokenRow[]): BuildResult {
  const tokensByUser = new Map<string, string[]>();
  for (const { user_id, token } of tokens) {
    const list = tokensByUser.get(user_id) ?? [];
    list.push(token);
    tokensByUser.set(user_id, list);
  }

  const messages: ExpoPushMessage[] = [];
  const deliveredIds: string[] = [];
  const skippedIds: string[] = [];

  for (const row of rows) {
    const userTokens = tokensByUser.get(row.user_id) ?? [];
    if (userTokens.length === 0) {
      // Sem dispositivo registrado: marca como enviada para não acumular na fila.
      skippedIds.push(row.id);
      continue;
    }
    for (const token of userTokens) {
      messages.push({ to: token, title: row.title, body: row.body, data: row.data });
    }
    deliveredIds.push(row.id);
  }

  return { messages, deliveredIds, skippedIds };
}

export function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}
