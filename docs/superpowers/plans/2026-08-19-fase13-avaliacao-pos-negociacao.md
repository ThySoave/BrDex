# BrDex Fase 13 — Avaliação Pós-Negociação — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Depois de uma troca confirmada (Fase 8), cada participante pode avaliar o outro com nota de 1 a 5 estrelas e comentário opcional. A média pública de avaliações aparece no chat junto da contagem de negociações — reputação qualitativa em cima da quantitativa que já existe. 100% grátis, mesmo racional da Fase 8: reputação atrás de paywall prejudicaria a segurança de todos.

**Architecture:** Tabela `trade_ratings` ligada a `trades`. A escrita vai por função SQL `rate_trade(trade_id, stars, comment)` security definer — as regras (só trade confirmada, só participante da conversa, avaliado é sempre o **outro** participante, uma avaliação por avaliador por trade) são idênticas em complexidade às de `confirm_trade`, então seguem o mesmo padrão de função em vez de RLS de insert. Leitura da própria avaliação via RLS de select (avaliador ou avaliado); média pública via `user_rating_summary(target_user)` security definer, mesmo padrão de `completed_trades_count`. O app consome via `ratingsRepository` e o chat ganha o fluxo de avaliar + exibição da média.

**Tech Stack:** Supabase (Postgres + pgTAP), Expo/React Native, Jest (preset jest-expo).

## Global Constraints

- **Sem paywall** — nenhuma checagem de `isPremium()`.
- Só trocas **confirmadas** podem ser avaliadas; uma avaliação por avaliador por trade (unique); nota inteira 1–5 (check constraint); comentário opcional com limite de 500 caracteres.
- O avaliado é derivado no servidor (o outro participante da conversa da trade) — o cliente nunca informa quem está sendo avaliado.
- Média de avaliações é pública para qualquer usuário autenticado (mesma política de `completed_trades_count`).
- npm com `--legacy-peer-deps`; testes JS `npx jest <pattern>`; banco `sg docker -c "npx supabase db reset"` / `sg docker -c "npx supabase test db"`.
- UI em pt-BR.

## File Structure

- `supabase/migrations/0016_trade_ratings.sql` — tabela `trade_ratings`, RLS de select, `rate_trade(uuid, int, text)`, `user_rating_summary(uuid)`.
- `supabase/tests/database/trade_ratings.test.sql` — pgTAP.
- `src/features/social/ratingsRepository.ts` (+ test) — `rateTrade(tradeId, stars, comment?)`, `myRatedTradeIds(tradeIds)`, `userRatingSummary(userId)`.
- `app/chat/[conversationId].tsx` — modificar: média do outro usuário na linha de reputação + fluxo de avaliar troca confirmada.
- `app/chat/chat.test.tsx` — modificar: casos do fluxo novo (RNTL).

---

### Task 1: Schema — trade_ratings + rate_trade + user_rating_summary

**Files:**
- Create: `supabase/migrations/0016_trade_ratings.sql`
- Test: `supabase/tests/database/trade_ratings.test.sql`

**Interfaces:**
- Produces: `trade_ratings(id, trade_id → trades, rater, rated_user, stars int check 1..5, comment text nullable check length <= 500, created_at)`, unique `(trade_id, rater)`; RLS select para `rater` ou `rated_user`; sem insert/update/delete direto (grant só de select). Função `rate_trade(trade_id uuid, stars int, comment text default null) returns void` security definer: erro se trade não existe, não confirmada, chamador não é participante, ou já avaliou; `rated_user` = o outro participante. Função `user_rating_summary(target_user uuid) returns table(avg_stars numeric, ratings_count int)` security definer, média arredondada a 1 casa. Task 2 usa exatamente esses nomes.

- [x] **Step 1: Write the failing pgTAP test** (`trade_ratings.test.sql` — 7 asserções: trade pendente não pode ser avaliada (erro "só trocas confirmadas podem ser avaliadas"); participante avalia trade confirmada e a linha grava `rated_user` = outro participante; nota fora de 1–5 falha; avaliar duas vezes a mesma trade falha (erro "troca já avaliada por você"); não-participante não avalia (erro "apenas participantes da conversa podem avaliar"); `user_rating_summary` retorna média e contagem corretas com duas avaliações; RLS: terceiro autenticado não lê a linha de avaliação.)
- [x] **Step 2: Run to verify it fails** — `sg docker -c "npx supabase test db"` → FAIL `relation "public.trade_ratings" does not exist`.
- [x] **Step 3: Write the migration** (`0016_trade_ratings.sql`): tabela + constraints + RLS select + `rate_trade` + `user_rating_summary`, grants para `authenticated`.
- [x] **Step 4: Apply and verify** — reset + test db → PASS 7/7 novos + suite pgTAP anterior completa.
- [x] **Step 5: Commit** — `feat: add trade ratings with rate_trade and rating summary functions`

---

### Task 2: ratingsRepository

**Files:** Create `src/features/social/ratingsRepository.ts` (+ test).

**Interfaces:**
- Produces: `RatingSummary { avgStars: number | null; ratingsCount: number }`; `rateTrade(tradeId: string, stars: number, comment?: string): Promise<void>` (RPC `rate_trade`); `myRatedTradeIds(tradeIds: string[]): Promise<string[]>` (select `trade_id` de `trade_ratings` com `rater` = usuário atual e `trade_id in tradeIds`; retorna `[]` se `tradeIds` vazio sem consultar); `userRatingSummary(userId: string): Promise<RatingSummary>` (RPC `user_rating_summary`); erros viram `throw new Error(message)`.

- [ ] Teste `ratingsRepository` (5 casos: rateTrade chama RPC com id/nota/comentário; erro de RPC propagado; myRatedTradeIds filtra por usuário atual e mapeia ids; myRatedTradeIds com lista vazia devolve [] sem consultar; userRatingSummary mapeia avg_stars/ratings_count) → red → implementação → green.
- [ ] Commit `feat: add ratings repository`

---

### Task 3: Chat — avaliar troca confirmada + média na reputação

**Files:** Modify `app/chat/[conversationId].tsx`; Modify `app/chat/chat.test.tsx`.

**Interfaces:** Consumes Task 2. A tela já carrega `trades` e `reputation` do outro usuário.

- [ ] Teste de componente (RNTL, mockando `ratingsRepository` junto dos mocks existentes): linha de média (testID `chat-rating-summary`) mostra "4.5 ★ (2 avaliações)" quando `userRatingSummary` retorna dados; quando há trade confirmada ainda não avaliada por mim, aparecem as estrelas (testIDs `chat-rate-1`..`chat-rate-5`) e tocar em `chat-rate-5` chama `rateTrade` com nota 5; quando a trade confirmada já foi avaliada, as estrelas não aparecem. → red
- [ ] Implementar na tela: carregar `userRatingSummary(other)` + `myRatedTradeIds` das trades confirmadas junto de `loadTrades()`; linha `chat-rating-summary` ao lado da reputação (some quando `ratingsCount` = 0); bloco "Avaliar negociação" com 5 estrelas para a trade confirmada mais recente sem avaliação minha; após avaliar, recarregar. → green
- [ ] Full suite verde (`npx jest && npx tsc --noEmit`) → Commit `feat: add post-trade rating flow and rating summary in chat`

---

## Self-Review Notes

- **Cobertura do spec:** estende "Reputação básica (histórico de negociações visível)" — a Fase 8 entregou a contagem (quantitativo); esta fase entrega a qualidade da negociação (1–5 estrelas), aumentando a segurança do módulo social sem paywall.
- **Segurança/anti-fraude mínima:** só participante avalia, só trade confirmada, uma avaliação por trade por avaliador, avaliado derivado no servidor — ninguém infla a própria média nem avalia sem negociação real.
- **YAGNI:** sem resposta à avaliação, sem edição/remoção, sem denúncia de avaliação (denúncia de usuário já existe), sem página de listagem de comentários — só média + contagem públicas e o fluxo de avaliar no chat.
- **Consistência:** função de escrita security definer segue `confirm_trade`; função de leitura pública segue `completed_trades_count`; repositório segue `tradesRepository`; teste de componente estende `chat.test.tsx`.
