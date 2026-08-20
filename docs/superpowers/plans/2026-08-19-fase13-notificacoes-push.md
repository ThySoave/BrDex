# BrDex Fase 13 — Notificações Push de Match e Chat — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O spec exige que o match "dispara notificação para os dois" (Modelo de dados, `matches`) e que o fluxo Wishlist → Match → Chat "notifica os dois lados" (Fluxos). Hoje a notificação só existe passivamente dentro do app (aba Matches, Realtime no chat aberto) — se o usuário não está com o app aberto, ele não fica sabendo de um match novo nem de uma mensagem nova, o que mata o loop social do produto. A Fase 13 entrega notificações push (Expo Push) para match novo e mensagem nova, respeitando bloqueios (que já impedem a criação de match/mensagem na origem).

**Architecture:** Mesmo padrão de infraestrutura das Fases 7/12: fila no Postgres + Edge Function drenada por pg_cron. Triggers **security definer** em `matches` (enfileira para `wanter_id` e `owner_id`) e `messages` (enfileira para o outro participante da conversa) gravam em `notification_queue` — tabela sem nenhum acesso de cliente (nem RLS policy, nem grant; só triggers e service role escrevem/leem). O app registra o Expo push token do dispositivo em `push_tokens` (RLS dono-somente) via `pushTokensRepository`. A Edge Function `send-push` (service role) lê a fila pendente, junta com os tokens do destinatário, monta os payloads da Expo Push API (helpers puros em `transform.ts`, testados em Deno) e marca `sent_at`. pg_cron roda a cada minuto (latência aceitável para push social; zero infraestrutura nova).

**Tech Stack:** Supabase (Postgres + pgTAP + Edge Functions/Deno + pg_cron/pg_net/Vault), Expo/React Native (`expo-notifications`), Jest (preset jest-expo).

## Global Constraints

- Grátis para todos — notificação de match/chat é requisito do spec (Fase 3), não recurso premium.
- `notification_queue` nunca é exposta ao cliente: sem policies, sem grants para `authenticated`. Escrita só por triggers security definer; leitura/atualização só pela service role.
- `push_tokens`: RLS dono-somente; um usuário pode ter vários dispositivos (`unique (user_id, token)`).
- O corpo da mensagem de chat **não** vai no push (privacidade — o push transita por serviços de terceiros): push de mensagem usa texto genérico "Você recebeu uma nova mensagem"; o payload `data` carrega só ids para deep-link.
- Bloqueio já é garantido na origem (triggers de match e RLS de messages já impedem pares bloqueados) — a fila não precisa re-checar.
- npm com `--legacy-peer-deps`; testes JS `npx jest <pattern>`; banco `sg docker -c "npx supabase db reset"` / `sg docker -c "npx supabase test db"`; Deno `deno test supabase/functions/send-push/` e `deno check supabase/functions/send-push/index.ts`.
- UI/textos em pt-BR.

## File Structure

- `supabase/migrations/0017_push_tokens.sql` — tabela `push_tokens` (RLS dono-somente).
- `supabase/migrations/0018_notification_queue.sql` — tabela `notification_queue` + triggers em `matches` e `messages`.
- `supabase/migrations/0019_send_push_schedule.sql` — pg_cron a cada minuto (padrão 0010/0015).
- `supabase/tests/database/push_tokens.test.sql` / `notification_queue.test.sql` — pgTAP.
- `supabase/functions/send-push/transform.ts` (+ `transform.test.ts`) — helpers puros.
- `supabase/functions/send-push/index.ts` — entrypoint Deno.
- `src/features/notifications/pushTokensRepository.ts` (+ test) — registro do token.
- `app/(tabs)/home.tsx` (+ test) — registro do push token ao abrir o app.

---

### Task 1: Tabela push_tokens

**Files:**
- Create: `supabase/migrations/0017_push_tokens.sql`
- Test: `supabase/tests/database/push_tokens.test.sql`

**Interfaces:**
- Produces: `push_tokens (user_id uuid references auth.users on delete cascade, token text not null, platform text, updated_at timestamptz default now(), primary key (user_id, token))`; RLS: select/insert/update/delete apenas do próprio usuário; grant select, insert, update, delete to authenticated. Task 5 faz upsert `{ user_id, token, platform }` com `on_conflict` na PK.

- [x] **Step 1: Write the failing pgTAP test** (`push_tokens.test.sql` — asserções: tabela existe; usuário insere e lê o próprio token; não lê token de outro usuário; upsert do mesmo `(user_id, token)` não duplica.)
- [x] **Step 2: Run to verify it fails** — `sg docker -c "npx supabase test db"` → FAIL (tabela não existe).
- [x] **Step 3: Write the migration** (`0017_push_tokens.sql`).
- [x] **Step 4: Apply and verify** — reset + test db → novos testes PASS + suite pgTAP completa verde.
- [x] **Step 5: Commit** — `feat: add push_tokens table for device push registration`

---

### Task 2: notification_queue + triggers

**Files:**
- Create: `supabase/migrations/0018_notification_queue.sql`
- Test: `supabase/tests/database/notification_queue.test.sql`

**Interfaces:**
- Produces: `notification_queue (id uuid pk default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade, title text not null, body text not null, data jsonb not null default '{}', created_at timestamptz not null default now(), sent_at timestamptz)`. RLS habilitado **sem policies e sem grants** (cliente não acessa). Trigger `matches_enqueue_push` (after insert on `matches`): 2 linhas — wanter: title `"Novo match!"`, body `"Uma carta da sua wishlist está disponível para negociação."`; owner: title `"Novo match!"`, body `"Alguém quer uma carta que você anunciou."`; `data = {"type":"match","matchId":...}`. Trigger `messages_enqueue_push` (after insert on `messages`): 1 linha para o participante que não é `sender_id`, title `"Nova mensagem"`, body `"Você recebeu uma nova mensagem."`, `data = {"type":"message","conversationId":...}`. Task 4 lê `sent_at is null` e marca `sent_at = now()`.

- [ ] **Step 1: Write the failing pgTAP test** (`notification_queue.test.sql` — asserções: tabela existe; criar um match (via inserts em `user_cards` + `wishlist` de dois usuários) enfileira 2 notificações (uma por participante, com `data->>'type' = 'match'`); enviar uma mensagem enfileira 1 notificação para o outro participante (não para o remetente, `type = 'message'`, body sem o conteúdo da mensagem); `authenticated` não consegue ler a fila.)
- [ ] **Step 2: Run to verify it fails** — `sg docker -c "npx supabase test db"` → FAIL.
- [ ] **Step 3: Write the migration** (`0018_notification_queue.sql`): tabela + índice parcial `(sent_at) where sent_at is null` + as duas funções/triggers security definer.
- [ ] **Step 4: Apply and verify** — reset + test db → novos testes PASS + suite completa verde.
- [ ] **Step 5: Commit** — `feat: enqueue push notifications on new match and new message`

---

### Task 3: send-push transform helpers

**Files:** Create `supabase/functions/send-push/transform.ts` (+ `transform.test.ts`).

**Interfaces:**
- Produces: `QueueRow { id: string; user_id: string; title: string; body: string; data: Record<string, unknown> }`; `PushTokenRow { user_id: string; token: string }`; `buildPushMessages(rows: QueueRow[], tokens: PushTokenRow[]): { messages: ExpoPushMessage[]; deliveredIds: string[]; skippedIds: string[] }` — agrupa tokens por usuário; cada linha da fila vira uma mensagem `{ to, title, body, data }` por token do destinatário; linhas de usuários sem token vão para `skippedIds` (marcadas como enviadas para não acumular); `chunk<T>(items: T[], size: number): T[][]` — Expo aceita no máx. 100 mensagens por request. Task 4 usa exatamente esses nomes.

- [ ] **Step 1: Write the failing Deno test** (`transform.test.ts` — casos: linha vira uma mensagem por token do destinatário (usuário com 2 dispositivos → 2 mensagens); usuário sem token → linha em `skippedIds` e nenhuma mensagem; `data` preservado no payload; `chunk` divide em blocos de 100.)
- [ ] **Step 2: Run to verify it fails** — `deno test supabase/functions/send-push/` → FAIL (módulo não existe).
- [ ] **Step 3: Implement `transform.ts`** → GREEN.
- [ ] **Step 4: Commit** — `feat: add expo push message builder for send-push function`

---

### Task 4: send-push entrypoint + agendamento

**Files:** Create `supabase/functions/send-push/index.ts`; Create `supabase/migrations/0019_send_push_schedule.sql`.

**Interfaces:**
- Consumes: Task 3. `index.ts` (padrão do `sync-prices/index.ts`): service role client → select `notification_queue` where `sent_at is null` (limit 500, ordem `created_at`) → select `push_tokens` dos destinatários → `buildPushMessages` → POST `https://exp.host/--/api/v2/push/send` por chunk de 100 (header `Content-Type: application/json`) → update `sent_at = now()` para `deliveredIds` + `skippedIds`; fila vazia responde 200 `"0 notificações pendentes"`. Agendamento: mesmo padrão do 0015 (pg_cron + pg_net + Vault), job `send-push-every-minute`, cron `* * * * *`.

- [ ] **Step 1: Implement `index.ts`** e verificar com `deno check supabase/functions/send-push/index.ts` (sem teste de rede — a lógica testável está toda no transform, igual às Fases 7/12).
- [ ] **Step 2: Write `0019_send_push_schedule.sql`** (copiar padrão do 0015 trocando nome/URL/cron).
- [ ] **Step 3: Apply and verify** — reset; `select jobname from cron.job` inclui `send-push-every-minute`; suite pgTAP completa verde.
- [ ] **Step 4: Commit** — `feat: add send-push edge function scheduled via pg_cron`

---

### Task 5: pushTokensRepository

**Files:** Create `src/features/notifications/pushTokensRepository.ts` (+ test).

**Interfaces:**
- Produces: `registerPushToken(token: string, platform: string): Promise<void>` — usuário autenticado via `supabase.auth.getUser()`; upsert em `push_tokens` `{ user_id, token, platform }` com `{ onConflict: "user_id,token" }`; erro vira `throw new Error(message)`. Padrão idêntico ao `priceAlertsRepository`.

- [ ] Teste `pushTokensRepository` (2 casos: upsert chamado com `{ user_id, token, platform }` e `onConflict`; erro do supabase propagado) → red → implementação → green (`npx jest pushTokensRepository`).
- [ ] Commit `feat: add push tokens repository`

---

### Task 6: Registro do token no app

**Files:** Modify `app/(tabs)/home.tsx` (+ `home.test.tsx`).

**Interfaces:** Consumes Task 5 + `expo-notifications` (instalar com `npx expo install expo-notifications` — conferir docs v57 antes; fallback `npm install expo-notifications --legacy-peer-deps`).

- [ ] Teste de componente (RNTL, mockando `expo-notifications` e `pushTokensRepository` nos mocks já existentes do `home.test.tsx`): ao montar a Home com permissão concedida, `getExpoPushTokenAsync` é chamado e `registerPushToken` recebe o token; com permissão negada, `registerPushToken` não é chamado (e a Home renderiza normalmente — registro nunca quebra a tela). → red
- [ ] Implementar: helper `registerForPushNotifications()` em `src/features/notifications/registerForPush.ts`: `getPermissionsAsync` → se não concedida, `requestPermissionsAsync` → se concedida, `getExpoPushTokenAsync()` → `registerPushToken(token, Platform.OS)`; qualquer erro é engolido com `console.warn` (push é best-effort); chamado em `useEffect` na Home. → green
- [ ] Full suite verde (`npx jest && npx tsc --noEmit`) → Commit `feat: register device push token on app home`

---

## Self-Review Notes

- **Cobertura do spec:** fecha "dispara notificação para os dois" (`matches`) e "notifica os dois lados" (Fluxos, Wishlist → Match → Chat) para usuários fora do app; complementa o Realtime da Fase 3 (que só cobre o app aberto).
- **Privacidade:** corpo da mensagem de chat nunca sai do banco via push; fila inacessível ao cliente; tokens com RLS dono-somente; bloqueios respeitados na origem (nenhum match/mensagem entre bloqueados existe para ser notificado).
- **YAGNI:** sem preferências de notificação por tipo (liga/desliga é a permissão do SO), sem retry/receipts da Expo Push API (fila marca enviado e segue — perda rara é aceitável para push social), sem deep-link handler novo (payload `data` já carrega os ids para quando isso for construído).
- **Consistência:** fila + Edge Function + pg_cron igual às Fases 7 (fetch-news) e 12 (sync-prices); triggers security definer iguais à Fase 3; repository + upsert igual à Fase 9.
