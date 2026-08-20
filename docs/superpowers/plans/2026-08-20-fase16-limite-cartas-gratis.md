# BrDex Fase 16 — Limite de Cartas do Plano Grátis — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O spec lista "Cartas ilimitadas no inventário (grátis tem limite, número a definir)" como recurso **premium** — é o único item da lista Premium ainda sem implementação (scanner, progresso por set, PDF, selo, alertas de preço e recorte do histórico já existem). A Fase 16 entrega: usuário grátis com a coleção no limite vê upsell na tela de cadastro (`/card/add`) em vez do formulário; premium segue ilimitado. Número definido: **50 cartas** (generoso para colecionador casual, aperta para quem usa a sério — mesmo espírito do recorte de 30 dias do histórico).

**Architecture:** Mesmo padrão de gating das fases anteriores (histórico de valor da Fase 4, scanner da Fase 15): checagem no cliente via `isPremium()` + contagem de cartas via repositório fino sobre o client Supabase. Lógica de decisão em função pura testável (`canAddCard`) em `src/features/premium/cardLimit.ts`; `countUserCards` entra no `collectionRepository` existente usando `select` com `{ count: "exact", head: true }` (não baixa as linhas). A tela `/card/add` checa no mount: grátis + no limite → texto `card-limit-upsell` no lugar do formulário. Nenhuma migration — `user_cards` já existe e a contagem é derivada.

**Tech Stack:** Expo/React Native (`expo-router`), Supabase JS client, Jest (preset jest-expo) + RNTL.

## Global Constraints

- Limite vale só para **grátis**: `FREE_CARD_LIMIT = 50`; premium nunca é bloqueado.
- **Fail-open**: se `isPremium()` ou `countUserCards()` falhar (rede, etc.), a tela mostra o formulário normalmente — checagem de limite jamais impede um cadastro por erro de infraestrutura (o mesmo espírito do `catch(() => setPremium(false))` do scanner, mas aqui a falha libera em vez de travar, porque o custo de um falso-negativo é só uma carta a mais no grátis).
- Enforcement server-side (RLS/trigger) fica como melhoria futura, igual à decisão registrada na Fase 15 para o gating do scanner — MVP no cliente.
- Sem contagem regressiva, banner de "faltam N cartas" ou tela de pricing — YAGNI; só o upsell no limite.
- npm com `--legacy-peer-deps`; testes `npx jest <pattern>`; verificação final `npx jest && npx tsc --noEmit`.
- UI/textos em pt-BR.

## File Structure

- `src/features/premium/cardLimit.ts` (+ `cardLimit.test.ts`) — `FREE_CARD_LIMIT` e `canAddCard` puro.
- `src/features/collection/collectionRepository.ts` (+ test) — nova `countUserCards`.
- `app/card/add.tsx` (+ **novo** `add.test.tsx`) — gating no mount da tela de cadastro.

---

### Task 1: Regra pura do limite

**Files:** Create `src/features/premium/cardLimit.ts` (+ `cardLimit.test.ts`).

**Interfaces:**
- Produces: `FREE_CARD_LIMIT = 50` e `canAddCard(cardCount: number, premium: boolean): boolean` — premium → sempre `true`; grátis → `true` enquanto `cardCount < FREE_CARD_LIMIT`, `false` a partir de 50.

- [x] **Step 1: Write the failing Jest test** (`cardLimit.test.ts` — casos: premium no limite e acima do limite → `true`; grátis abaixo do limite → `true`; grátis exatamente em `FREE_CARD_LIMIT` → `false`; grátis acima → `false`; grátis com 0 cartas → `true`.)
- [x] **Step 2: Run to verify it fails** — `npx jest cardLimit` → FAIL (módulo não existe).
- [x] **Step 3: Implement `cardLimit.ts`** → GREEN (7/7).
- [x] **Step 4: Commit** — `feat: add free plan card limit rule`

---

### Task 2: Contagem de cartas no repositório

**Files:** Modify `src/features/collection/collectionRepository.ts` (+ `collectionRepository.test.ts`).

**Interfaces:**
- Produces: `countUserCards(): Promise<number>` — exige usuário autenticado (throw "Usuário não autenticado" como as demais); `client.from("user_cards").select("id", { count: "exact", head: true }).eq("user_id", user.id)`; `error` → `throw new Error(error.message)`; retorna `count ?? 0`.

- [ ] **Step 1: Write the failing Jest tests** (estender `collectionRepository.test.ts` — casos: usa `select` com `{ count: "exact", head: true }` e `eq("user_id", ...)` e retorna o `count`; `count: null` → 0; erro vira throw.)
- [ ] **Step 2: Run to verify it fails** — `npx jest collectionRepository` → FAIL.
- [ ] **Step 3: Implement** → GREEN.
- [ ] **Step 4: Commit** — `feat: add user card count to collection repository`

---

### Task 3: Gating na tela de cadastro

**Files:** Modify `app/card/add.tsx`; create `app/card/add.test.tsx`.

**Interfaces:**
- Consumes: Tasks 1 e 2, `isPremium`. No mount: `Promise.all([isPremium(), countUserCards()])`; qualquer rejeição → trata como liberado (fail-open). Enquanto checa → `ActivityIndicator` (testID `add-card-loading`). `canAddCard(count, premium)` `false` → tela mostra só o texto `card-limit-upsell` ("Você chegou ao limite de 50 cartas do plano grátis. Assine o premium para cadastrar cartas ilimitadas.") — sem formulário nem botão salvar. Caso liberado → formulário atual intacto (idioma, estado, status, preço, salvar).

- [ ] **Step 1: Write the failing RNTL test** (**novo** `add.test.tsx`, mockando `expo-router`, `isPremium`, `countUserCards`, `addUserCard`, `CardPrices` — casos: grátis no limite mostra `card-limit-upsell` e não mostra `add-card-submit`; grátis abaixo do limite mostra o formulário e salvar chama `addUserCard`; premium no limite mostra o formulário; `countUserCards` rejeitando mostra o formulário (fail-open).)
- [ ] **Step 2: Run to verify it fails** — `npx jest add` (pattern `app/card/add`) → FAIL.
- [ ] **Step 3: Implement o gating em `add.tsx`** → GREEN.
- [ ] **Step 4: Full suite** — `npx jest && npx tsc --noEmit` verdes.
- [ ] **Step 5: Commit** — `feat: gate card registration behind free plan limit`

---

## Self-Review Notes

- **Cobertura do spec:** fecha "Cartas ilimitadas no inventário (grátis tem limite, número a definir)" — último recurso da lista Premium sem implementação. Número definido em 50 no cliente, fácil de ajustar (constante única).
- **YAGNI:** sem banner de progresso rumo ao limite, sem bloqueio server-side, sem tela de checkout — o upsell aponta a assinatura, cuja compra real (IAP) segue como tarefa de negócio já registrada na Fase 15.
- **Consistência:** função pura + repositório fino + gating com testID de upsell, exatamente como histórico de valor (Fase 4) e scanner (Fase 15); mensagens de erro e throw de `error.message` no padrão de todos os repositórios.
- **Fail-open deliberado:** erro de rede na checagem nunca impede cadastro; o pior caso é um usuário grátis passar do limite numa falha — aceitável para MVP, enforcement server-side é a melhoria futura se necessário.
