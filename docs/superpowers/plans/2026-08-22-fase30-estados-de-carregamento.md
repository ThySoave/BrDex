# BrDex Fase 30 — Estados de Carregamento nas Listas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O spec está 100% coberto (Fases 1–29); esta fase fecha a lacuna de UX confirmada por auditoria de código nesta sessão: **nenhuma tela de lista tem estado de carregamento**. Todas as 7 telas com fetch primário (`catalog`, `album`, `market`, `meetups`, `home`, `matches`, `wishlist`) inicializam a lista com `[]` e renderizam o `ListEmptyComponent` ("Nenhuma carta encontrada...") **enquanto a busca inicial ainda está em andamento** — o usuário vê uma mensagem de vazio enganosa por alguns instantes a cada abertura. O chat fica fora de escopo: conversa nova começa legitimamente vazia e a tela tem múltiplos fetches paralelos (mensagens, trocas, reputação).

**Architecture:** Sem módulo novo — só um estado `loading` por tela, mesmo padrão do estado `error` já existente. `useState(true)` + `.finally(() => setLoading(false))` no fetch primário de cada tela (só a primeira carga mostra o indicador; recargas por foco/pull-to-refresh já têm o spinner nativo de `refreshing` ou são silenciosas, e o `finally` subsequente é no-op). Indicador `<Text testID="<tela>-loading">Carregando...</Text>` renderizado **no lugar da FlatList** (não early return de tela inteira — formulários e campos de busca continuam visíveis, e testes existentes que os consultam de forma síncrona seguem verdes). Nos testes, fetch primário mockado com `new Promise(() => {})` (promessa pendente) → indicador visível e estado vazio ausente; os testes existentes já garantem que o indicador some quando o fetch resolve (falhariam se `loading` ficasse preso em `true`).

**Tech Stack:** Expo/React Native (`expo-router`), Jest (preset jest-expo) + RNTL.

## Global Constraints

- Nenhum teste existente editado ou removido — apenas casos novos.
- Mensagem "Carregando..." em pt-BR, consistente nas 7 telas; `testID` no padrão `<tela>-loading`.
- Testes `npx jest <pattern>`; verificação final `npx jest --maxWorkers=2 && npx tsc --noEmit`.
- Commit a cada task concluída, no padrão dos commits anteriores.

## File Structure

- Task 1 (abas principais): `app/(tabs)/catalog.tsx`, `app/(tabs)/album.tsx`, `app/(tabs)/market.tsx`, `app/(tabs)/meetups.tsx` (+ testes respectivos).
- Task 2 (listas restantes): `app/(tabs)/home.tsx`, `app/(tabs)/matches.tsx`, `app/wishlist/index.tsx` (+ testes respectivos).

---

### Task 1: Estado de carregamento nas abas principais (catalog, album, market, meetups)

- [x] **Step 1: Write the failing RNTL tests** — um caso por tela: com o fetch primário (`fetchCatalogPage` / `listUserCards` / `searchMarketListings` / `listUpcomingMeetups`) retornando promessa pendente (`new Promise(() => {})`), a tela mostra `catalog-loading` / `album-loading` / `market-loading` / `meetups-loading` e **não** mostra o estado vazio correspondente.
- [x] **Step 2: Run to verify it fails** — `npx jest catalog.test album.test market.test meetups.test` → 4 falhas novas (53 existentes verdes).
- [x] **Step 3: Implement** — estado `loading` + `.finally(() => setLoading(false))` no fetch primário + indicador `Carregando...` no lugar da FlatList nas 4 telas → GREEN (57/57, tsc limpo) sem editar testes existentes.
- [x] **Step 4: Commit** — `feat: add loading states to main tab lists`

---

### Task 2: Estado de carregamento nas listas restantes (home, matches, wishlist)

- [x] **Step 1: Write the failing RNTL tests** — mesmo padrão: `listNews` / `listMatches` / `listWishlist` pendentes → `home-loading` / `matches-loading` / `wishlist-loading` visíveis, estado vazio ausente.
- [x] **Step 2: Run to verify it fails** — `npx jest home.test matches.test wishlist.test` → 3 falhas novas (17 existentes verdes).
- [x] **Step 3: Implement** — mesmo padrão da Task 1 nas 3 telas (no home, gate só em `listNews`; banners de set continuam independentes) → GREEN (20/20).
- [x] **Step 4: Full suite** — `npx jest --maxWorkers=2 && npx tsc --noEmit` verdes (279/279 em 54 suítes, tsc limpo).
- [x] **Step 5: Commit** — `feat: add loading states to remaining lists`

---

## Self-Review Notes

- **Continuidade:** spec coberto; polish de UX na mesma linha da Fase 29 (estados de lista), fechando a tríade loading/empty/error.
- **Risco:** baixo — padrão idêntico ao estado `error` já presente em 6 das 7 telas; rede de proteção são as 54 suítes intactas, que também garantem que o loading some quando o fetch resolve.
- **YAGNI:** sem spinner/ActivityIndicator custom (Text simples, consistente com o estilo minimalista das telas), sem skeleton screens, sem loading em recargas por foco (o pull-to-refresh já tem `refreshing` nativo), chat fora de escopo.
