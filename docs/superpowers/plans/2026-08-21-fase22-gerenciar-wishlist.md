# BrDex Fase 22 — Gerenciar Lista de Desejos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O loop social do spec nasce na wishlist ("Usuário marca carta desejada → sistema cruza automaticamente → notifica os dois lados → chat"), mas hoje a wishlist é **write-only**: só existe `addToWishlist`, chamado pelo botão "Quero" do catálogo. O usuário nunca vê a própria lista de desejos, não consegue remover um item (uma carta já conseguida continua gerando matches e notificações push para sempre — ruído que degrada exatamente o loop que sustenta o produto), e o "idioma opcional" do modelo de dados (`wishlist — por (carta, idioma opcional)`) nunca é usado: o "Quero" sempre grava `language = null`. A Fase 22 fecha a gestão da wishlist: ver a lista, remover itens e escolher o idioma ao adicionar.

**Architecture:** Sem migration — a RLS existente já dá select/insert/delete ao dono (`0004_social_schema.sql`), e `matches.wishlist_id` tem `on delete cascade`: remover o item da wishlist derruba os matches dele automaticamente, sem trigger novo. No cliente: `listWishlist()` (join com `cards_catalog`, mesmo shape de `listUserCards`) e `removeFromWishlist(wishlistId)` no `wishlistRepository`. Nova tela `app/wishlist/index.tsx` (rota stack, mesmo padrão de `app/user/[userId].tsx`) com a lista, rótulo de idioma e remoção por item. Ponto de entrada na aba Trocas (a wishlist é a origem dos matches). No catálogo, o "Quero" passa a abrir um painel de idioma ("Qualquer idioma" + idiomas fixos) antes de gravar.

**Tech Stack:** Expo/React Native (`expo-router`), Supabase (RLS existente), Jest (preset jest-expo) + RNTL.

## Global Constraints

- Sem migration nova; nenhum teste existente removido.
- Remoção de item da wishlist é direta (sem confirmação) — baixo risco, re-adicionar custa um toque; diferente da exclusão de carta (Fase 20), que apaga dado de inventário.
- Rótulos de idioma: `null` → "Qualquer idioma"; `en`/`pt`/`jp`/`other` → "Inglês"/"Português"/"Japonês"/"Outro" (mesmos rótulos do cadastro de carta).
- Erros de rede/banco → `Alert.alert("Erro", message)`, padrão das fases anteriores.
- Press assíncrono em RNTL exige `await act(...)` (padrão das Fases 20–21).
- npm com `--legacy-peer-deps`; testes `npx jest <pattern>`; verificação final `npx jest --maxWorkers=2 && npx tsc --noEmit`.
- UI/textos em pt-BR.

## File Structure

- `src/features/social/wishlistRepository.ts` (+ test) — `WishlistItem`, `listWishlist`, `removeFromWishlist`.
- `app/wishlist/index.tsx` (+ `app/wishlist/wishlist.test.tsx`) — tela da lista de desejos.
- `app/(tabs)/matches.tsx` (+ test) — link "Minha lista de desejos".
- `app/(tabs)/catalog.tsx` (+ test) — painel de idioma no "Quero".

---

### Task 1: Repositório — listar e remover

**Files:** Modify `src/features/social/wishlistRepository.ts` (+ `wishlistRepository.test.ts`).

**Interfaces:**
- Produces: `WishlistItem = { id: string; catalogCardId: string; cardName: string; cardImageUrl: string; language: CardLanguage | null }`.
- Produces: `listWishlist(): Promise<WishlistItem[]>` — exige usuário autenticado; `client.from("wishlist").select("id, catalog_card_id, language, cards_catalog(name, image_url)").eq("user_id", user.id).order("created_at", { ascending: false })`; `error` → `throw new Error(error.message)`; mapeia linhas para `WishlistItem`.
- Produces: `removeFromWishlist(wishlistId: string): Promise<void>` — exige usuário autenticado; `client.from("wishlist").delete().eq("id", wishlistId).eq("user_id", user.id)`; `error` → `throw new Error(error.message)`.

- [x] **Step 1: Write the failing Jest tests** (estender `wishlistRepository.test.ts` — casos: `listWishlist` consulta `wishlist` com join no catálogo filtrando por `user_id` e mapeia para `WishlistItem`; erro do select vira throw; `removeFromWishlist` deleta filtrando por `id` e `user_id`; erro do delete vira throw.)
- [x] **Step 2: Run to verify it fails** — `npx jest wishlistRepository` → FAIL (4 falhas).
- [x] **Step 3: Implement** — tipo + duas funções no shape de `listUserCards`/`deleteUserCard` → GREEN.
- [x] **Step 4: Commit** — `feat: add list and remove to wishlist repository`

---

### Task 2: Tela da lista de desejos

**Files:** Create `app/wishlist/index.tsx` + `app/wishlist/wishlist.test.tsx`.

**Interfaces:**
- Consumes: Task 1 (`listWishlist`, `removeFromWishlist`). Tela carrega a lista no foco (`useFocusEffect`, padrão da aba Trocas); cada item (`wishlist-item-<id>`) mostra nome da carta e rótulo de idioma; botão `wishlist-remove-<id>` chama `removeFromWishlist(id)` e remove o item da lista local; erro (do load ou da remoção) → `Alert.alert("Erro", message)` e, no caso da remoção, o item permanece na lista; lista vazia mostra `wishlist-empty` apontando para o botão "Quero" do catálogo.

- [x] **Step 1: Write the failing RNTL tests** (novo `wishlist.test.tsx` — casos: itens renderizam com nome e rótulo de idioma ("Qualquer idioma" para `null`); remover chama `removeFromWishlist` e tira o item da lista; erro na remoção vira `Alert.alert` e o item continua; lista vazia mostra o empty state.)
- [x] **Step 2: Run to verify it fails** — `npx jest app/wishlist` → FAIL (module not found).
- [x] **Step 3: Implement** — tela no padrão das listas existentes (FlatList + estado local) → GREEN.
- [x] **Step 4: Commit** — `feat: add wishlist screen with item removal` (GREEN 5/5)

---

### Task 3: Ponto de entrada na aba Trocas

**Files:** Modify `app/(tabs)/matches.tsx` (+ `matches.test.tsx`).

**Interfaces:**
- Consumes: Task 2 (rota `/wishlist`). A aba Trocas ganha link fixo `open-wishlist` ("Minha lista de desejos") acima da lista de matches; tocar navega para `/wishlist` via `router.push`.

- [x] **Step 1: Write the failing RNTL test** (estender `matches.test.tsx` — caso: o link aparece e tocar navega para `/wishlist`.)
- [x] **Step 2: Run to verify it fails** — `npx jest matches` → FAIL (1 falha).
- [x] **Step 3: Implement** — `Pressable` acima da FlatList → GREEN (5/5).
- [x] **Step 4: Commit** — `feat: link to wishlist from matches tab`

---

### Task 4: Idioma opcional no "Quero" do catálogo

**Files:** Modify `app/(tabs)/catalog.tsx` (+ `catalog.test.tsx`).

**Interfaces:**
- Consumes: `addToWishlist` (existente). Tocar `wishlist-add-<id>` deixa de gravar direto: abre painel de idioma para aquela carta com opções `wishlist-language-any` ("Qualquer idioma") e `wishlist-language-<value>` (en/pt/jp/other, mesmos rótulos do cadastro); escolher chama `addToWishlist(cardId, value | null)`, fecha o painel e mostra a confirmação existente ("Adicionado à lista de desejos"); erro → `Alert.alert("Erro", message)`; botão `wishlist-language-cancel` fecha sem gravar.

- [x] **Step 1: Write the failing RNTL tests** (estender `catalog.test.tsx` — casos: "Quero" abre o painel em vez de gravar; "Qualquer idioma" chama `addToWishlist(id, null)`; um idioma específico chama `addToWishlist(id, "pt")`; cancelar fecha sem chamar o repositório.)
- [x] **Step 2: Run to verify it fails** — `npx jest catalog` → FAIL (4 falhas).
- [x] **Step 3: Implement** — estado `wishlistCardId` + painel no padrão do painel de alerta de preço → GREEN.
- [x] **Step 4: Full suite** — `npx jest --maxWorkers=2 && npx tsc --noEmit` verdes (213/213, tsc limpo).
- [x] **Step 5: Commit** — `feat: choose wishlist language when adding from catalog`

---

## Self-Review Notes

- **Cobertura do spec:** fecha o ciclo de vida da wishlist ("cartas que o usuário quer, por (carta, idioma opcional)") e protege o loop Wishlist → Match → Chat de ruído: item removido derruba os matches via `on delete cascade`, sem push obsoleto.
- **YAGNI:** sem edição de idioma de item existente (remover + re-adicionar cobre), sem confirmação na remoção, sem contagem/badge — nada disso está no spec.
- **Consistência:** repositório no shape de `listUserCards`/`deleteUserCard`; tela no padrão de lista das abas; painel de idioma no padrão do painel de alerta de preço do próprio catálogo; rótulos de idioma idênticos ao cadastro.
- **Decisão consciente:** o ponto de entrada fica na aba Trocas (origem conceitual dos matches e onde o empty state já menciona a lista de desejos) — sem criar nona aba.
