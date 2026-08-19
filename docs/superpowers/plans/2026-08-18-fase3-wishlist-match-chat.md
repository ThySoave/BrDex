# BrDex Fase 3 — Wishlist + Match + Chat — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lista de desejos com match automático contra cartas à venda/troca de outros usuários, chat interno em tempo real, e — pré-requisito de lançamento — denúncia e bloqueio de usuários.

**Architecture:** O match é gerado por triggers no Postgres (em `user_cards` e `wishlist`), nunca no app — o dado cruza no servidor. Bloqueio remove matches existentes (trigger em `blocks`) e impede novos matches e mensagens (checagem nos triggers e nas políticas RLS via função `users_blocked`). O chat usa uma conversa única por par de usuários (UUIDs ordenados) com mensagens via Supabase Realtime (`postgres_changes`). O app tem repositories finos e três UIs: botão "Quero" no catálogo, aba Trocas (matches) e tela de conversa com aviso fixo + denunciar/bloquear.

**Tech Stack:** Supabase (Postgres + pgTAP + Realtime), Expo/React Native, Jest (preset jest-expo).

## Global Constraints

- **Denúncia e bloqueio são obrigatórios**: nenhuma task de UI de chat é "concluída" sem os dois botões funcionando (spec: pré-requisito de lançamento da Fase 3).
- Aviso fixo na tela de chat, texto exato: "A negociação (pagamento, entrega) é por conta dos usuários — o BrDex não garante nem participa da transação."
- Usuário bloqueado: para de gerar/aparecer em matches do bloqueador e não consegue mais enviar mensagem no par (RLS, não filtro de app).
- Só cartas com status `a_venda` / `disponivel_troca` geram match — `guardada` nunca.
- Mercados por idioma: wishlist com `language` nulo casa com qualquer idioma; com `language` definido, só aquele idioma.
- npm com `--legacy-peer-deps`; testes JS `npx jest <pattern>`; banco `sg docker -c "npx supabase db reset"` / `sg docker -c "npx supabase test db"`.
- UI em pt-BR.

## File Structure

- `supabase/migrations/0004_social_schema.sql` — wishlist, matches, blocks, reports + triggers de match e de bloqueio.
- `supabase/migrations/0005_chat.sql` — conversations, messages, RLS com `users_blocked`, publicação Realtime.
- `supabase/tests/database/social_matching.test.sql` — pgTAP do match/bloqueio.
- `supabase/tests/database/chat.test.sql` — pgTAP do chat.
- `src/features/social/wishlistRepository.ts` (+ test), `matchesRepository.ts` (+ test), `chatRepository.ts` (+ test), `safetyRepository.ts` (+ test).
- `app/(tabs)/catalog.tsx` (modificar: botão "Quero"), `app/(tabs)/matches.tsx` + `_layout.tsx` (aba Trocas), `app/chat/[conversationId].tsx`.

---

### Task 1: Schema social — wishlist, matches, blocks, reports + triggers

**Files:**
- Create: `supabase/migrations/0004_social_schema.sql`
- Test: `supabase/tests/database/social_matching.test.sql`

**Interfaces:**
- Produces: `wishlist(id, user_id, catalog_card_id, language, created_at)`; `matches(id, wishlist_id, user_card_id, wanter_id, owner_id, created_at)` com unique `(wishlist_id, user_card_id)`; `blocks(blocker_id, blocked_id)`; `reports(id, reporter_id, reported_id, reason, context, created_at)`; função `public.users_blocked(a uuid, b uuid): boolean`. Tasks 2–7 usam exatamente esses nomes.

- [x] **Step 1: Write the failing pgTAP test** (`supabase/tests/database/social_matching.test.sql` — 7 asserções: match por carta à venda; guardada não gera; idioma específico não casa com outro idioma; wishlist sem idioma casa com qualquer; bloqueio apaga matches; par bloqueado não gera match novo; denúncia registrada. Código completo na execução — ver arquivo de teste no repositório.)
- [x] **Step 2: Run to verify it fails** — `sg docker -c "npx supabase test db"` → FAIL `relation "public.wishlist" does not exist`.
- [x] **Step 3: Write the migration** (`0004_social_schema.sql`): tabelas `wishlist` (unique nulls not distinct em user+carta+idioma, RLS dono), `blocks` (PK par, RLS blocker), função `users_blocked(a,b)` security definer, `reports` (RLS reporter), `matches` (unique wishlist+user_card, RLS select participantes, escrita só por trigger); triggers `user_cards_generate_matches` (after insert/update of status: cria matches para a_venda/troca respeitando idioma e bloqueio; deleta matches quando volta a guardada), `wishlist_generate_matches` (after insert), `blocks_remove_matches` (after insert).
- [x] **Step 4: Apply and verify** — reset + test db → PASS 7/7 novos + 12 anteriores.
- [x] **Step 5: Commit** — `feat: add wishlist, matches, blocks and reports with match triggers`

---

### Task 2: Chat — conversations, messages, RLS e Realtime

**Files:**
- Create: `supabase/migrations/0005_chat.sql`
- Test: `supabase/tests/database/chat.test.sql`

**Interfaces:**
- Consumes: `users_blocked` (Task 1).
- Produces: `conversations(id, participant_a, participant_b, created_at)` com `check (participant_a < participant_b)` e unique do par; `messages(id, conversation_id, sender_id, body, created_at)` com body 1–2000 chars. Realtime habilitado em `messages`.

- [x] **Step 1: Write the failing pgTAP test** (`chat.test.sql` — 4 asserções: participante envia mensagem; outro participante lê; não-participante não vê a conversa; após bloqueio o envio falha com 42501.)
- [x] **Step 2: Run to verify it fails** — FAIL `relation "public.conversations" does not exist`.
- [x] **Step 3: Write the migration** (`0005_chat.sql`): `conversations` (RLS: select participantes; insert participante e par não bloqueado), `messages` (RLS: select participante; insert sender = auth.uid() + participante + par não bloqueado), índice `(conversation_id, created_at)`, `alter publication supabase_realtime add table public.messages`.
- [x] **Step 4: Apply and verify** — PASS 4/4 novos, 23 total.
- [x] **Step 5: Commit** — `feat: add conversations and messages with block-aware RLS and realtime`

---

### Task 3: wishlistRepository + botão "Quero" no catálogo

**Files:** Create `src/features/social/wishlistRepository.ts` (+ test); Modify `app/(tabs)/catalog.tsx`.

**Interfaces:** Produces `addToWishlist(catalogCardId: string, language: CardLanguage | null): Promise<void>` — insert `{user_id, catalog_card_id, language}` com o usuário logado, erro vira `throw new Error(message)`.

- [x] Teste (2 casos: insert correto; erro propagado) → red → implementação → green.
- [x] Wire: no `renderItem` do catálogo, envolver `CardGridItem` num `View` com `Pressable` "Quero" (`testID: wishlist-add-<id>`) chamando `addToWishlist(item.id, null)`.
- [x] Full suite verde → Commit `feat: add wishlist repository and Quero button on catalog`.

---

### Task 4: matchesRepository + aba Trocas

**Files:** Create `src/features/social/matchesRepository.ts` (+ test), `app/(tabs)/matches.tsx`; Modify `app/(tabs)/_layout.tsx`.

**Interfaces:** Produces `listMatches(): Promise<MatchItem[]>`, `MatchItem { id; role: "quero"|"tenho"; otherUserId; cardName; cardImageUrl }` — select `id, wanter_id, owner_id, user_cards(cards_catalog(name, image_url))`; role comparando `wanter_id` com o usuário atual.

- [x] Teste (2 casos: mapeamento com role dos dois lados; erro) → red → implementação → green.
- [x] Tela `matches.tsx`: `useFocusEffect` recarrega `listMatches()`; item mostra "Você quer: <carta>" ou "Alguém quer sua: <carta>" + botão Conversar → `getOrCreateConversation(otherUserId)` → `router.push('/chat/<id>?other=<otherUserId>')`; empty state explicativo.
- [x] Registrar `<Tabs.Screen name="matches" options={{ title: "Trocas" }} />`.
- [x] Commit `feat: add matches repository and Trocas tab`.

---

### Task 5: chatRepository

**Files:** Create `src/features/social/chatRepository.ts` (+ test).

**Interfaces:** Produces `ChatMessage { id; senderId; body; createdAt }`; `getOrCreateConversation(otherUserId): Promise<string>` (par de UUIDs ordenado com `.sort()`, select maybeSingle → insert select single); `listMessages(conversationId)` (order created_at asc, snake→camel); `sendMessage(conversationId, body)` (insert com sender = usuário atual); `subscribeToMessages(conversationId, onMessage): () => void` (channel `messages-<id>`, `postgres_changes` INSERT com filter `conversation_id=eq.<id>`, retorna cleanup com `removeChannel`).

- [x] Teste (4 casos: conversa existente; criação; listMessages mapeado; sendMessage) → red → implementação → green.
- [x] Commit `feat: add chat repository with realtime subscription`. (Feito antes da Task 4 para a tela de matches compilar com `getOrCreateConversation`.)

---

### Task 6: safetyRepository (denúncia/bloqueio)

**Files:** Create `src/features/social/safetyRepository.ts` (+ test).

**Interfaces:** Produces `blockUser(blockedId): Promise<void>` (insert em `blocks` com blocker = usuário atual) e `reportUser(reportedId, reason, context): Promise<void>` (insert em `reports`), erros propagados.

- [x] Teste (3 casos: block; report; erro) → red → implementação → green.
- [x] Commit `feat: add safety repository for blocks and reports`.

---

### Task 7: Tela de chat com aviso fixo, denunciar e bloquear

**Files:** Create `app/chat/[conversationId].tsx`.

**Interfaces:** Consumes Tasks 5 e 6; params de rota `conversationId` + query `other`.

- [ ] Tela: aviso fixo (texto exato das Global Constraints, `testID chat-disclaimer`); botões Denunciar (`reportUser(other, "denúncia feita a partir do chat", "conversa <id>")` + Alert) e Bloquear (`blockUser(other)` + Alert + `router.back()`); FlatList de mensagens (`listMessages` no mount + `subscribeToMessages` com dedupe por id e cleanup no unmount); input + Enviar (`sendMessage` e recarrega).
- [ ] Verificação completa: `npx jest && npx tsc --noEmit` e `sg docker -c "npx supabase test db"` — tudo verde.
- [ ] Commit `feat: add chat screen with disclaimer, report and block actions`.

---

## Self-Review Notes

- **Cobertura do spec (Fase 3):** wishlist por (carta, idioma opcional) → Tasks 1/3; match automático nos dois sentidos com notificação in-app via aba Trocas → Tasks 1/4; chat interno com aviso fixo → Tasks 2/5/7; denúncia com motivo/contexto e bloqueio que remove matches, impede novos e impede mensagens **via RLS, não filtro de app** → Tasks 1/2/6/7.
- **Tipos consistentes:** `MatchItem.otherUserId` (Task 4) alimenta `getOrCreateConversation` (Task 5); `ChatMessage` idêntico entre Tasks 5 e 7; colunas SQL dos repositories batem com as migrations.
- **YAGNI:** sem push notifications (in-app pela aba Trocas), sem paginação de mensagens, sem tela dedicada de gerenciamento de wishlist; reputação/verificado ficam para a Fase 4.
- **Escrita em `matches` só via triggers security definer** — `authenticated` tem apenas select, mesmo padrão dos snapshots da Fase 2.
