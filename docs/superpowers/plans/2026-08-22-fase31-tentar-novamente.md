# BrDex Fase 31 — Recuperação de Erros (Tentar Novamente) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O spec está 100% coberto (Fases 1–30); esta fase fecha a lacuna de UX confirmada por auditoria de código nesta sessão: **todo estado de erro de carga é um beco sem saída**. As 6 telas com erro inline (`catalog`, `album`, `market`, `meetups`, `home`, `matches`) fazem early return com só o texto do erro — o usuário que abre o app sem rede não tem como tentar de novo sem fechar a tela (e em abas sem recarga por foco, nem isso resolve). A wishlist fica fora de escopo: o erro de carga dela é via `Alert` (comportamento fixado por teste existente) e ela já recarrega por foco.

**Architecture:** Sem módulo novo — um botão `Tentar novamente` (`Pressable` com `accessibilityRole="button"`, `testID="<tela>-retry"`) dentro do bloco de erro existente de cada tela. O press limpa o erro, reativa `loading` e re-executa o fetch primário. Onde o fetch está inline no `useEffect`/`useFocusEffect` (catalog, home, matches), extrair para um `loadX = useCallback(...)` no mesmo padrão de `loadCards` (album) / `loadMeetups` (meetups) / `runSearch` (market), que já existem e são reusados como estão. Telas cujo bloco de erro não tem `testID` ganham `<tela>-error` (aditivo — testes existentes consultam por texto).

**Tech Stack:** Expo/React Native (`expo-router`), Jest (preset jest-expo) + RNTL.

## Global Constraints

- Nenhum teste existente editado ou removido — apenas casos novos.
- Rótulo "Tentar novamente" em pt-BR, consistente nas 6 telas; `testID` no padrão `<tela>-retry` (e `<tela>-error` no bloco de erro onde faltar).
- Retry re-executa **só o fetch primário** da tela (o que alimenta o estado de erro); fetches secundários (premium, releases) seguem intocados.
- Testes: fetch primário com `mockRejectedValueOnce` → depois `mockResolvedValueOnce`; press com `await act` (RNTL + React 19).
- Testes `npx jest <pattern>`; verificação final `npx jest --maxWorkers=2 && npx tsc --noEmit`.
- Commit a cada task concluída, no padrão dos commits anteriores.

## File Structure

- Task 1 (abas principais): `app/(tabs)/catalog.tsx`, `app/(tabs)/album.tsx`, `app/(tabs)/market.tsx`, `app/(tabs)/meetups.tsx` (+ testes respectivos).
- Task 2 (listas restantes): `app/(tabs)/home.tsx`, `app/(tabs)/matches.tsx` (+ testes respectivos).

---

### Task 1: Tentar novamente nas abas principais (catalog, album, market, meetups)

- [x] **Step 1: Write the failing RNTL tests** — um caso por tela: fetch primário (`fetchCatalogPage` / `listUserCards` / `searchMarketListings` / `listUpcomingMeetups`) rejeita na 1ª chamada e resolve com dados na 2ª → erro visível com `<tela>-retry`; press no retry → dado renderizado e erro ausente.
- [x] **Step 2: Run to verify it fails** — `npx jest catalog.test album.test market.test meetups.test` → 4 falhas novas, existentes verdes.
- [x] **Step 3: Implement** — botão `Tentar novamente` no bloco de erro das 4 telas (+ `testID` de erro onde faltar; extrair `loadCatalog` no catalog) → GREEN sem editar testes existentes.
- [x] **Step 4: Commit** — `feat: add retry to main tab error states`

---

### Task 2: Tentar novamente nas listas restantes (home, matches)

- [ ] **Step 1: Write the failing RNTL tests** — mesmo padrão: `listNews` / `listMatches` rejeitam e depois resolvem → `home-retry` / `matches-retry` recarregam a tela.
- [ ] **Step 2: Run to verify it fails** — `npx jest home.test matches.test` → 2 falhas novas, existentes verdes.
- [ ] **Step 3: Implement** — extrair `loadNews` / `loadMatches` em `useCallback` e botão de retry no bloco de erro (no home, retry recarrega só as notícias; banners de set seguem independentes) → GREEN.
- [ ] **Step 4: Full suite** — `npx jest --maxWorkers=2 && npx tsc --noEmit` verdes.
- [ ] **Step 5: Commit** — `feat: add retry to remaining error states`

---

## Self-Review Notes

- **Continuidade:** fecha o ciclo iniciado nas Fases 29–30 (empty → error → loading → recuperação); o estado de erro deixa de ser terminal.
- **Risco:** baixo — botão aditivo dentro de bloco já existente; re-fetch reusa funções já testadas. Rede de proteção: suítes existentes garantem que erro aparece na falha e que a lista renderiza no sucesso.
- **YAGNI:** sem retry automático/backoff, sem contagem de tentativas, sem alteração da wishlist (Alert fixado por teste + recarga por foco já cobre), chat fora de escopo como nas fases anteriores.
