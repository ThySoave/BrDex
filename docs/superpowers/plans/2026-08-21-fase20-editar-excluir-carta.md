# BrDex Fase 20 — Editar e Excluir Carta do Álbum — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O inventário pessoal é o pilar 1 do spec, mas hoje o cadastro de carta é imutável: idioma, estado de conservação e preço pago só são definidos **no cadastro** e nunca podem ser corrigidos — e não existe como excluir uma carta cadastrada por engano. Isso fere o pilar do inventário (o álbum deixa de refletir a coleção física real) e, pior, polui o coração do produto: um `price_paid` digitado errado entra para sempre no cálculo do `price_community` (a marcação de outliers mitiga, mas não substitui o dono do dado poder corrigi-lo). A Fase 20 fecha o CRUD do inventário: editar idioma/estado/preço pago e excluir carta, direto do álbum.

**Architecture:** Sem migration — a RLS existente ("users can update/delete their own cards") já cobre update e delete em `user_cards`. No cliente: `updateUserCard(cardId, updates)` e `deleteUserCard(cardId)` no `collectionRepository` (mesmo shape de `updateCardStatus`: filtro por `id` + `user_id`, `error` → throw). No álbum: botão "Editar" por carta abre painel com as opções de idioma (`LANGUAGES`), estado (`CARD_CONDITIONS`) e input de preço pago; salvar chama o repositório e atualiza a carta na lista local. Botão "Excluir" abre painel de confirmação; confirmar chama `deleteUserCard` e remove a carta da lista. Status **não** entra no painel de edição — já tem fluxo próprio (Fase 19), assim como venda (Fase 17).

**Tech Stack:** Expo/React Native (`expo-router`), Supabase (RLS existente), Jest (preset jest-expo) + RNTL.

## Global Constraints

- Painel de edição cobre só `language` / `condition` / `price_paid` — status (Fase 19), venda (Fase 17) e foto (Fase 18) têm fluxos próprios.
- Preço pago vazio → `null` (mesma semântica do cadastro); vírgula aceita como separador decimal (padrão da Fase 17).
- Exclusão sempre com confirmação — nunca deletar no primeiro toque.
- Erros de rede/banco → `Alert.alert("Erro", message)`, padrão das fases anteriores.
- Sem migration nova; nenhum teste existente removido.
- npm com `--legacy-peer-deps`; testes `npx jest <pattern>`; verificação final `npx jest --maxWorkers=2 && npx tsc --noEmit`.
- UI/textos em pt-BR.

## File Structure

- `src/features/collection/types.ts` — `UpdateUserCardInput`.
- `src/features/collection/collectionRepository.ts` (+ test) — `updateUserCard`, `deleteUserCard`.
- `app/(tabs)/album.tsx` (+ test) — painel de edição e confirmação de exclusão por carta.

---

### Task 1: Repositório de edição e exclusão

**Files:** Modify `src/features/collection/types.ts`, `src/features/collection/collectionRepository.ts` (+ `collectionRepository.test.ts`).

**Interfaces:**
- Produces: `UpdateUserCardInput = { language: CardLanguage; condition: CardCondition; pricePaid: number | null }`.
- Produces: `updateUserCard(cardId: string, updates: UpdateUserCardInput): Promise<void>` — exige usuário autenticado; `client.from("user_cards").update({ language, condition, price_paid }).eq("id", cardId).eq("user_id", user.id)`; `error` → `throw new Error(error.message)`.
- Produces: `deleteUserCard(cardId: string): Promise<void>` — exige usuário autenticado; `client.from("user_cards").delete().eq("id", cardId).eq("user_id", user.id)`; `error` → `throw new Error(error.message)`.

- [ ] **Step 1: Write the failing Jest tests** (estender `collectionRepository.test.ts` — casos: `updateUserCard` faz update de `language`/`condition`/`price_paid` filtrando por `id` e `user_id`; erro do update vira throw; `deleteUserCard` deleta filtrando por `id` e `user_id`; erro do delete vira throw.)
- [ ] **Step 2: Run to verify it fails** — `npx jest collectionRepository` → FAIL (falhas esperadas nas funções novas).
- [ ] **Step 3: Implement** — tipo + duas funções no shape de `updateCardStatus` → GREEN.
- [ ] **Step 4: Commit** — `feat: add update and delete card to collection repository`

---

### Task 2: Painel de edição no álbum

**Files:** Modify `app/(tabs)/album.tsx` (+ `album.test.tsx`).

**Interfaces:**
- Consumes: Task 1 (`updateUserCard`). Cada item do álbum ganha botão `edit-card-<id>`; tocar abre painel pré-preenchido com os valores atuais da carta: opções `edit-language-<value>` (LANGUAGES), `edit-condition-<value>` (CARD_CONDITIONS), input `edit-price-input` (aceita vírgula; vazio → `null`); botão `save-edit` chama `updateUserCard(id, updates)`, atualiza a carta na lista local e fecha o painel; erro → `Alert.alert("Erro", message)`; botão `cancel-edit` fecha sem chamar o repositório.

- [ ] **Step 1: Write the failing RNTL tests** (estender `album.test.tsx` — casos: botão abre o painel; salvar com novos valores chama `updateUserCard` com `updates` corretos, atualiza a lista e fecha o painel; preço vazio vira `null`; erro vira `Alert.alert`; cancelar fecha sem chamar o repositório.)
- [ ] **Step 2: Run to verify it fails** — `npx jest album` → FAIL (falhas esperadas do painel novo).
- [ ] **Step 3: Implement** — estado `editingCard` + painel no padrão dos painéis de venda/status → GREEN (com `act` assíncrono no press).
- [ ] **Step 4: Commit** — `feat: edit card details from the album`

---

### Task 3: Exclusão com confirmação no álbum

**Files:** Modify `app/(tabs)/album.tsx` (+ `album.test.tsx`).

**Interfaces:**
- Consumes: Task 1 (`deleteUserCard`). Cada item do álbum ganha botão `delete-card-<id>`; tocar abre painel de confirmação com o nome da carta; botão `confirm-delete` chama `deleteUserCard(id)`, remove a carta da lista local e fecha o painel; erro → `Alert.alert("Erro", message)` (carta permanece na lista); botão `cancel-delete` fecha sem chamar o repositório.

- [ ] **Step 1: Write the failing RNTL tests** (estender `album.test.tsx` — casos: botão abre a confirmação; confirmar chama `deleteUserCard`, remove a carta da lista e fecha o painel; erro vira `Alert.alert` e a carta continua na lista; cancelar fecha sem chamar o repositório.)
- [ ] **Step 2: Run to verify it fails** — `npx jest album` → FAIL (falhas esperadas da confirmação nova).
- [ ] **Step 3: Implement** — estado `deletingCard` + painel de confirmação → GREEN.
- [ ] **Step 4: Full suite** — `npx jest --maxWorkers=2 && npx tsc --noEmit` verdes.
- [ ] **Step 5: Commit** — `feat: delete card from the album with confirmation`

---

## Self-Review Notes

- **Cobertura do spec:** fecha o pilar "inventário pessoal" — o álbum passa a refletir a coleção física real (correções e baixas), e protege a integridade do `price_community` permitindo corrigir `price_paid` errado na fonte.
- **YAGNI:** sem edição de status/foto (fluxos próprios das Fases 17–19), sem histórico de alterações, sem undo de exclusão — nada disso está no spec.
- **Consistência:** repositório no shape exato de `updateCardStatus`; painéis no padrão venda/status da Fase 17/19 (testIDs, cancelar, `Alert.alert`); opções de idioma/estado reutilizam `LANGUAGES`/`CARD_CONDITIONS` do cadastro.
- **Decisão consciente:** exclusão é hard delete (RLS restringe ao dono) — carta vendida já tem preservação própria via status `vendida`; excluir é para erro de cadastro, não para baixa de venda.
