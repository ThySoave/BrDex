# BrDex Fase 8 — Reputação Básica (Histórico de Negociações) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Registrar negociações concluídas entre dois usuários (um participante da conversa propõe "troca concluída", o outro confirma) e exibir a contagem pública de negociações concluídas de um usuário (reputação básica) na tela de chat. 100% grátis — o spec é explícito: "travar isso atrás de paywall prejudicaria a segurança de todos, não só de quem paga".

**Architecture:** Uma tabela `trades` ligada a `conversations` (o par de usuários já existe lá; não duplicar participantes). Propor = insert pelo participante; confirmar = função SQL `confirm_trade(trade_id)` security definer que só permite o **outro** participante confirmar (RLS não restringe colunas em update, então a confirmação vai por função — mesmo padrão de `set_progress`/`snapshot_collection_values` que já usam funções SQL). Reputação = função `completed_trades_count(target_user)` security definer que conta trades confirmadas das conversas em que o usuário participa — legível por qualquer autenticado (é pública por design, é isso que gera segurança). O app consome via RPC num `tradesRepository`, e o chat mostra a reputação do outro usuário + botões de propor/confirmar (in-app, mesmo padrão das fases anteriores).

**Tech Stack:** Supabase (Postgres + pgTAP), Expo/React Native, Jest (preset jest-expo).

## Global Constraints

- **Sem paywall** — nenhuma checagem de `isPremium()`.
- Confirmação só pelo outro participante da conversa (nunca quem propôs) e só uma vez — idempotência: confirmar trade já confirmada é erro; propor nova trade com uma pendente na mesma conversa é permitido mas a UI só mostra a mais recente pendente.
- Contagem de reputação é pública para qualquer usuário autenticado.
- npm com `--legacy-peer-deps`; testes JS `npx jest <pattern>`; banco `sg docker -c "npx supabase db reset"` / `sg docker -c "npx supabase test db"`.
- UI em pt-BR.

## File Structure

- `supabase/migrations/0011_trades.sql` — tabela `trades`, RLS, `confirm_trade(uuid)`, `completed_trades_count(uuid)`.
- `supabase/tests/database/trades.test.sql` — pgTAP.
- `src/features/social/tradesRepository.ts` (+ test) — `listTrades(conversationId)`, `proposeTrade(conversationId)`, `confirmTrade(tradeId)`, `completedTradesCount(userId)`.
- `app/chat/[conversationId].tsx` — modificar: linha de reputação do outro usuário + fluxo propor/confirmar.
- `app/chat/chat.test.tsx` — teste de componente (RNTL) do fluxo novo.

---

### Task 1: Schema — trades + confirm_trade + completed_trades_count

**Files:**
- Create: `supabase/migrations/0011_trades.sql`
- Test: `supabase/tests/database/trades.test.sql`

**Interfaces:**
- Produces: `trades(id, conversation_id, proposed_by, created_at, confirmed_at)`; `confirm_trade(trade_id uuid) returns void` (security definer; erro se chamador não é o outro participante ou se já confirmada); `completed_trades_count(target_user uuid) returns int` (security definer, conta trades com `confirmed_at not null` de conversas onde `target_user` é participante). Task 2 usa exatamente esses nomes.

- [ ] **Step 1: Write the failing pgTAP test** (`trades.test.sql` — 6 asserções: participante propõe trade na própria conversa; não-participante não insere (RLS); outro participante confirma via `confirm_trade`; quem propôs não consegue confirmar a própria trade (erro); trade já confirmada não confirma de novo (erro); `completed_trades_count` retorna 1 para ambos os participantes após a confirmação.)
- [ ] **Step 2: Run to verify it fails** — `sg docker -c "npx supabase test db"` → FAIL `relation "public.trades" does not exist`.
- [ ] **Step 3: Write the migration** (`0011_trades.sql`): tabela + RLS (select/insert para participantes da conversa, `proposed_by = auth.uid()`; sem update/delete direto) + `confirm_trade` + `completed_trades_count`, grants para `authenticated`.
- [ ] **Step 4: Apply and verify** — reset + test db → PASS 6/6 novos + suite anterior completa (41 pgTAP).
- [ ] **Step 5: Commit** — `feat: add trades table with confirm flow and reputation count function`

---

### Task 2: tradesRepository

**Files:** Create `src/features/social/tradesRepository.ts` (+ test).

**Interfaces:**
- Produces: `Trade { id; conversationId; proposedBy; createdAt; confirmedAt: string | null }`; `listTrades(conversationId): Promise<Trade[]>` (order `created_at desc`); `proposeTrade(conversationId): Promise<void>` (insert com usuário atual como `proposed_by`); `confirmTrade(tradeId): Promise<void>` (RPC `confirm_trade`); `completedTradesCount(userId): Promise<number>` (RPC `completed_trades_count`); erros viram `throw new Error(message)`.

- [ ] Teste `tradesRepository` (4 casos: listTrades mapeado; proposeTrade insere com usuário atual; confirmTrade chama RPC com o id; completedTradesCount retorna o número do RPC; + erro propagado em pelo menos um deles) → red → implementação → green.
- [ ] Commit `feat: add trades repository`

---

### Task 3: Chat — reputação + propor/confirmar troca

**Files:** Modify `app/chat/[conversationId].tsx`; Create `app/chat/chat.test.tsx`.

**Interfaces:** Consumes Task 2. A tela já recebe `other` (id do outro usuário) via `useLocalSearchParams`.

- [ ] Teste de componente (RNTL, mesmo padrão de `home.test.tsx`, mockando repositórios e `expo-router`): mostra "N negociações concluídas" do outro usuário (testID `chat-reputation`); botão "Troca concluída" (testID `chat-propose-trade`) chama `proposeTrade`; quando há trade pendente proposta **pelo outro**, botão "Confirmar troca" (testID `chat-confirm-trade`) chama `confirmTrade`. → red
- [ ] Implementar na tela: carregar `completedTradesCount(other)` + `listTrades(conversationId)` no mount; linha de reputação; botão propor (sempre visível, some se já existe pendente própria); botão confirmar visível só para pendente proposta pelo outro; após confirmar/propor, recarregar trades e reputação. → green
- [ ] Full suite verde (`npx jest && npx tsc --noEmit`) → Commit `feat: show trade reputation and confirmation flow in chat`

---

## Self-Review Notes

- **Cobertura do spec:** "Reputação básica (histórico de negociações visível)" — recurso grátis do bloco "motor de crescimento"; contagem pública + registro bilateral (propôs/confirmou) cobre o mínimo viável sem sistema de avaliação por estrelas (YAGNI).
- **Segurança/anti-fraude mínima:** confirmação exige o outro participante — ninguém infla a própria reputação sozinho; RLS impede inserir trade em conversa alheia.
- **YAGNI:** sem avaliações qualitativas, sem disputa/cancelamento de trade, sem histórico detalhado visível para terceiros (só a contagem), sem notificação push.
- **Consistência:** funções SQL security definer seguem `set_progress` (Fase 5); repositório segue `meetupsRepository`; teste de componente segue `home.test.tsx` (Fase 7).
