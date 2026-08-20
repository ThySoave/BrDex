import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { buildPushMessages, chunk, type PushTokenRow, type QueueRow } from "./transform.ts";

const row = (id: string, userId: string): QueueRow => ({
  id,
  user_id: userId,
  title: "Novo match!",
  body: "Uma carta da sua wishlist está disponível para negociação.",
  data: { type: "match", matchId: "m-1" },
});

Deno.test("buildPushMessages gera uma mensagem por token do destinatário", () => {
  const rows = [row("q-1", "user-a")];
  const tokens: PushTokenRow[] = [
    { user_id: "user-a", token: "ExponentPushToken[device-1]" },
    { user_id: "user-a", token: "ExponentPushToken[device-2]" },
  ];

  const result = buildPushMessages(rows, tokens);

  assertEquals(result.messages.length, 2);
  assertEquals(result.messages[0].to, "ExponentPushToken[device-1]");
  assertEquals(result.messages[1].to, "ExponentPushToken[device-2]");
  assertEquals(result.messages[0].title, "Novo match!");
  assertEquals(result.deliveredIds, ["q-1"]);
  assertEquals(result.skippedIds, []);
});

Deno.test("buildPushMessages pula linhas de usuários sem token registrado", () => {
  const rows = [row("q-1", "user-a"), row("q-2", "user-b")];
  const tokens: PushTokenRow[] = [{ user_id: "user-a", token: "ExponentPushToken[device-1]" }];

  const result = buildPushMessages(rows, tokens);

  assertEquals(result.messages.length, 1);
  assertEquals(result.deliveredIds, ["q-1"]);
  assertEquals(result.skippedIds, ["q-2"]);
});

Deno.test("buildPushMessages preserva o payload data para deep-link", () => {
  const rows = [row("q-1", "user-a")];
  const tokens: PushTokenRow[] = [{ user_id: "user-a", token: "ExponentPushToken[device-1]" }];

  const result = buildPushMessages(rows, tokens);

  assertEquals(result.messages[0].data, { type: "match", matchId: "m-1" });
});

Deno.test("chunk divide as mensagens em blocos do tamanho máximo", () => {
  const items = Array.from({ length: 250 }, (_, i) => i);

  const chunks = chunk(items, 100);

  assertEquals(chunks.length, 3);
  assertEquals(chunks[0].length, 100);
  assertEquals(chunks[2].length, 50);
});
