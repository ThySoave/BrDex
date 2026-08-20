# BrDex Fase 19 — Alterar Status da Carta no Álbum — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O motor social do spec depende do status da carta: "só cartas com status diferente de `guardada` aparecem na busca de outros usuários" e o match nasce quando uma carta à venda/troca cruza com a wishlist de alguém. Mas hoje o status só é definido **no cadastro** — uma carta guardada nunca pode ser colocada à venda ou para troca depois, o que estrangula o mercado e os matches. O backend já está pronto: o trigger `user_cards_generate_matches` (migration 0004) dispara em `after insert or update of status`. A Fase 19 fecha o fluxo no cliente: mudar o status de qualquer carta direto do álbum.

**Architecture:** Sem migration — o trigger de matches e a RLS de update ("users can update their own cards") já cobrem tudo. No cliente: `updateCardStatus(cardId, status)` no `collectionRepository` (update de `status` filtrando `id` + `user_id`, mesmo shape do `markCardAsSold`); no álbum, botão "Status" por carta abre painel com as 3 opções (`guardada` / `à venda` / `disponível para troca`) — escolher chama o repositório e atualiza a carta na lista local. Venda continua no fluxo próprio da Fase 17 (`vendida` não é opção aqui).

**Tech Stack:** Expo/React Native (`expo-router`), Supabase (RLS existente), Jest (preset jest-expo) + RNTL.

## Global Constraints

- `vendida` **não** é opção deste painel — venda é transação com preço (Fase 17), não troca de status.
- Erros de rede/banco → `Alert.alert("Erro", message)`, padrão das fases anteriores.
- Sem migration nova; nenhum teste existente removido.
- npm com `--legacy-peer-deps`; testes `npx jest <pattern>`; verificação final `npx jest && npx tsc --noEmit`.
- UI/textos em pt-BR.

## File Structure

- `src/features/collection/collectionRepository.ts` (+ test) — `updateCardStatus`.
- `app/(tabs)/album.tsx` (+ test) — painel de status por carta.

---

### Task 1: Repositório de status

**Files:** Modify `src/features/collection/collectionRepository.ts` (+ `collectionRepository.test.ts`).

**Interfaces:**
- Produces: `updateCardStatus(cardId: string, status: CardStatus): Promise<void>` — exige usuário autenticado; `client.from("user_cards").update({ status }).eq("id", cardId).eq("user_id", user.id)`; `error` → `throw new Error(error.message)`.

- [x] **Step 1: Write the failing Jest tests** (estender `collectionRepository.test.ts` — casos: update de `status` filtrando por `id` e `user_id`; erro vira throw.)
- [x] **Step 2: Run to verify it fails** — `npx jest collectionRepository` → FAIL (2 falhas esperadas).
- [x] **Step 3: Implement** → GREEN (9/9).
- [x] **Step 4: Commit** — `feat: add update card status to collection repository`

---

### Task 2: Painel de status no álbum

**Files:** Modify `app/(tabs)/album.tsx` (+ `album.test.tsx`).

**Interfaces:**
- Consumes: Task 1. Cada item do álbum ganha botão `card-status-<id>`; tocar abre painel com opções `status-option-guardada` / `status-option-a_venda` / `status-option-disponivel_troca`; escolher chama `updateCardStatus(id, status)`, atualiza o status da carta na lista local e fecha o painel; erro → `Alert.alert("Erro", message)`; botão `cancel-status` fecha sem chamar o repositório.

- [ ] **Step 1: Write the failing RNTL tests** (estender `album.test.tsx` — casos: botão abre o painel; escolher opção chama `updateCardStatus` e fecha o painel; erro vira `Alert.alert`; cancelar fecha sem chamar o repositório.)
- [ ] **Step 2: Run to verify it fails** — `npx jest album` → FAIL.
- [ ] **Step 3: Implement** → GREEN (lembrar do `act` assíncrono no press, como na Fase 17).
- [ ] **Step 4: Full suite** — `npx jest && npx tsc --noEmit` verdes.
- [ ] **Step 5: Commit** — `feat: change card status from the album`

---

## Self-Review Notes

- **Cobertura do spec:** destrava o fluxo "carta guardada → à venda/troca → busca de mercado + match + chat" que o spec descreve e que estava inacessível depois do cadastro. Zero backend novo — só liga o que a migration 0004 já suporta.
- **YAGNI:** sem edição de idioma/condição/preço pago, sem deletar carta, sem histórico de mudanças — nada disso está no spec; status é o único campo com efeito de rede.
- **Consistência:** repositório no shape exato de `markCardAsSold`; painel no padrão do painel de venda da Fase 17 (testIDs, cancelar, `Alert.alert`).
- **Decisão consciente:** atualização otimista só após sucesso do repositório (mesma semântica da venda) — a lista local reflete o banco, não a intenção.
