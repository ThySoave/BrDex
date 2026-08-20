# BrDex Fase 17 — Registrar Venda de Carta — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O spec define `user_cards` com "preço **pago/vendido**" e o preço colaborativo como "calculado a partir das **transações** que os próprios usuários registram" — mas a coluna `price_sold` existe desde a migration 0001 e está morta: não há fluxo para registrar uma venda, e a view `price_community` só agrega `price_paid`. A Fase 17 fecha o ciclo da transação: o usuário marca uma carta como vendida (com o preço de venda) direto do álbum; a carta sai da coleção ativa (álbum, contagem do limite grátis, valor da coleção) mas fica no banco como registro histórico, e o preço de venda passa a alimentar o preço colaborativo junto com o preço de compra — venda é o sinal de mercado mais forte que o app pode coletar.

**Architecture:** Migration nova (`0020_card_sales.sql`): adiciona `vendida` ao enum `card_status`, recria a view `price_community` agregando compras (`price_paid`) e vendas (`price_sold`) como transações, e recria `snapshot_collection_values` excluindo cartas vendidas do valor da coleção (comparações via `status::text` para não usar o valor novo do enum na mesma transação). A busca de mercado (0013) já filtra só `a_venda`/`disponivel_troca` — cartas vendidas nunca apareceram lá, nada muda. No cliente: `markCardAsSold` no `collectionRepository` (update via RLS existente "users can update their own cards"); `listUserCards` e `countUserCards` passam a excluir `vendida` (carta vendida não ocupa o limite grátis nem aparece no álbum); no álbum, botão "Vender" por carta abre input de preço + confirmação.

**Tech Stack:** Expo/React Native (`expo-router`), Supabase (Postgres + RLS, migration SQL), Jest (preset jest-expo) + RNTL.

## Global Constraints

- Carta vendida é **registro histórico**: nunca deletar a linha — ela sai do álbum/limite/valor, mas continua alimentando `price_community` (compra e venda).
- Preço de venda é obrigatório para confirmar a venda (sem preço não há transação para o dado colaborativo); valor inválido/vazio → não chama o repositório.
- Erros de rede/banco → `Alert.alert("Erro", message)`, padrão das fases anteriores.
- Nenhuma migration existente é alterada — view e função são recriadas em migration nova (`create or replace`), padrão aditivo das fases anteriores.
- npm com `--legacy-peer-deps`; testes `npx jest <pattern>`; verificação final `npx jest && npx tsc --noEmit`.
- UI/textos em pt-BR.

## File Structure

- `supabase/migrations/0020_card_sales.sql` — enum `vendida`, `price_community` v2 (compra+venda), snapshot sem vendidas.
- `src/features/collection/types.ts` — `CardStatus` ganha `"vendida"`.
- `src/features/collection/collectionRepository.ts` (+ test) — `markCardAsSold`; `listUserCards`/`countUserCards` excluem vendidas.
- `app/(tabs)/album.tsx` (+ test) — fluxo "Vender" por carta.

---

### Task 1: Schema de venda (migration + tipo)

**Files:** Create `supabase/migrations/0020_card_sales.sql`; modify `src/features/collection/types.ts`.

**Interfaces:**
- Produces: enum `card_status` com valor `vendida`; view `price_community` agregando `price_paid` **e** `price_sold` como transações (union), mantendo colunas/outlier-filter idênticos; `snapshot_collection_values` ignorando cartas com `status::text = 'vendida'`. `CardStatus` = `"guardada" | "a_venda" | "disponivel_troca" | "vendida"`.

- [x] **Step 1: Write the migration** (`0020_card_sales.sql` — `alter type ... add value 'vendida'`; `create or replace view price_community` com CTE `priced` unindo compras e vendas; `create or replace function snapshot_collection_values` com `where uc.status::text <> 'vendida'`; comparações por `::text` para não referenciar o valor novo do enum na mesma transação.)
- [x] **Step 2: Update `CardStatus`** em `types.ts` com `"vendida"`.
- [x] **Step 3: Verify** — `npx jest && npx tsc --noEmit` verdes (147/147 testes, tsc limpo).
- [x] **Step 4: Commit** — `feat: add card sale schema and sale prices in community price`

---

### Task 2: Repositório de venda

**Files:** Modify `src/features/collection/collectionRepository.ts` (+ `collectionRepository.test.ts`).

**Interfaces:**
- Produces: `markCardAsSold(cardId: string, priceSold: number): Promise<void>` — exige usuário autenticado; `client.from("user_cards").update({ price_sold: priceSold, status: "vendida" }).eq("id", cardId).eq("user_id", user.id)`; `error` → `throw new Error(error.message)`. `listUserCards` e `countUserCards` ganham `.neq("status", "vendida")` — testes existentes atualizados para a nova cadeia de mocks (nenhum teste removido).

- [x] **Step 1: Write the failing Jest tests** (estender `collectionRepository.test.ts` — casos: `markCardAsSold` faz update com `price_sold`/`status: "vendida"` filtrando por `id` e `user_id`; erro vira throw; `listUserCards` exclui vendidas via `.neq("status", "vendida")`; `countUserCards` idem.)
- [x] **Step 2: Run to verify it fails** — `npx jest collectionRepository` → FAIL (5 falhas esperadas).
- [x] **Step 3: Implement** → GREEN (7/7 testes).
- [x] **Step 4: Commit** — `feat: add mark card as sold to collection repository`

---

### Task 3: Fluxo de venda no álbum

**Files:** Modify `app/(tabs)/album.tsx` (+ `album.test.tsx`).

**Interfaces:**
- Consumes: Task 2. Cada item do álbum ganha botão `sell-card-<id>`; tocar abre painel com `TextInput` `sale-price-input` (teclado numérico) + botão `confirm-sale`; confirmar com preço válido chama `markCardAsSold(id, preço)` e remove a carta da lista local; preço vazio/inválido → não chama o repositório; erro → `Alert.alert("Erro", message)`; botão `cancel-sale` fecha o painel sem vender.

- [ ] **Step 1: Write the failing RNTL test** (estender `album.test.tsx` — casos: botão `sell-card-<id>` abre o painel; confirmar com preço chama `markCardAsSold` e a carta some da lista; preço vazio não chama o repositório; erro do repositório vira `Alert.alert`; cancelar fecha o painel sem chamar o repositório.)
- [ ] **Step 2: Run to verify it fails** — `npx jest album` → FAIL.
- [ ] **Step 3: Implement o fluxo em `album.tsx`** → GREEN.
- [ ] **Step 4: Full suite** — `npx jest && npx tsc --noEmit` verdes.
- [ ] **Step 5: Commit** — `feat: register card sales from the album`

---

## Self-Review Notes

- **Cobertura do spec:** ativa o "preço pago/**vendido**" de `user_cards` e faz `price_community` refletir de fato "as transações que os próprios usuários registram" — antes só compras, agora compras e vendas. Fecha o último pedaço do modelo de dados do spec sem uso.
- **YAGNI:** sem histórico de vendas na UI, sem tela de "cartas vendidas", sem desfazer venda, sem comprovante — a venda é um update de status + preço; se precisar de vitrine de histórico depois, o dado já está lá.
- **Consistência:** migration aditiva recriando view/função como 0014 (upsert de referência); repositório fino com throw de `error.message`; UI com testIDs e `Alert.alert` no padrão das fases anteriores; RLS existente já cobre o update.
- **Decisão consciente:** carta vendida sai do limite grátis (ela não está mais na coleção física) — coerente com o espírito do limite (inventário atual, não histórico).
