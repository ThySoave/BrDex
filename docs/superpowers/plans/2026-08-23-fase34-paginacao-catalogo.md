# BrDex Fase 34 — Paginação Infinita do Catálogo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Fase 33 fechou a busca (server-side + debounce), mas deixou explicitamente de fora a paginação do catálogo (nota de YAGNI daquele plano). Hoje, navegar na aba Catálogo sem digitar nada mostra apenas as 50 primeiras cartas em ordem alfabética — `fetchCatalogPage(0)` — e o resto do catálogo só é alcançável via busca. O fluxo do spec ("Usuário busca no catálogo sincronizado → escolhe a carta") pressupõe um catálogo navegável; esta fase adiciona scroll infinito: ao chegar perto do fim da lista, a próxima página é carregada e anexada.

**Architecture:** `fetchCatalogPage(page)` já é paginado (range de 50); a mudança é quase toda em `app/(tabs)/catalog.tsx`. O repositório passa a exportar `CATALOG_PAGE_SIZE` (a constante `PAGE_SIZE` existente, agora exportada — mudança aditiva). Na tela: estados `page`, `hasMore` e `loadingMore`. `loadCards("")` reseta `page=0` e calcula `hasMore = items.length === CATALOG_PAGE_SIZE`; em modo busca, `hasMore=false`. `onEndReached` do FlatList: só em modo navegação (query vazia), se `hasMore && !loadingMore`, chama `fetchCatalogPage(page+1)`, anexa os resultados, incrementa `page` e recalcula `hasMore`. Falha no load-more não derruba a tela para o estado de erro (a lista já tem conteúdo): apenas encerra `loadingMore`, e o próximo `onEndReached` tenta de novo. Footer `catalog-loading-more` enquanto carrega a página seguinte.

**Tech Stack:** Expo/React Native (`expo-router`), Jest (preset jest-expo) + RNTL (`fireEvent(list, "onEndReached")`).

## Global Constraints

- Nenhum teste existente editado ou removido — apenas casos novos (describe próprio `CatalogScreen paginação`).
- Modo busca (query não vazia) nunca dispara load-more; limpar o campo volta ao fluxo paginado desde a página 0.
- Sem estado de erro de tela cheia em falha de load-more — a lista existente permanece visível.
- Testes: `npx jest <pattern>`; verificação final `npx jest --maxWorkers=2 && npx tsc --noEmit`.
- Commit a cada task concluída, no padrão dos commits anteriores.

## File Structure

- Task 1: `src/features/catalog/catalogRepository.ts` (exportar `CATALOG_PAGE_SIZE`) + `app/(tabs)/catalog.tsx` + casos novos em `app/(tabs)/catalog.test.tsx`

---

### Task 1: Scroll infinito na aba Catálogo

- [x] **Step 1: Write the failing RNTL tests** — describe novo `CatalogScreen paginação` em `catalog.test.tsx`, com página 0 mockada com 50 cartas (`hasMore` verdadeiro): (a) `fireEvent(catalog-list, "onEndReached")` → `fetchCatalogPage(1)` chamado e carta da página 1 renderizada junto com as da página 0; (b) quando a página retornada tem menos de 50 cartas, novo `onEndReached` não dispara fetch adicional; (c) com query ativa (após debounce), `onEndReached` não chama `fetchCatalogPage`; (d) falha em `fetchCatalogPage(1)` → lista da página 0 continua visível (sem `catalog-error`) e o próximo `onEndReached` tenta de novo.
- [x] **Step 2: Run to verify it fails** — `npx jest catalog.test` → casos novos falham, existentes verdes.
- [x] **Step 3: Implement** — exportar `CATALOG_PAGE_SIZE` no repositório; em `catalog.tsx` adicionar `page`/`hasMore`/`loadingMore`, `handleEndReached` e footer `catalog-loading-more`; `loadCards` reseta a paginação → GREEN sem editar casos existentes.
- [x] **Step 4: Full suite** — `npx jest --maxWorkers=2 && npx tsc --noEmit` verdes.
- [x] **Step 5: Commit** — `feat: infinite scroll pagination in catalog tab`

---

## Self-Review Notes

- **Continuidade:** reusa `fetchCatalogPage(page)` como já existe; busca da Fase 33 e estados empty/loading/error/retry (Fases 29–31) intactos — com menos de 50 cartas na página 0 o comportamento é idêntico ao atual.
- **Risco:** baixo — `onEndReached` é aditivo; o guard `hasMore && !loadingMore && query vazia` impede fetch duplicado e interação com o modo busca.
- **YAGNI:** sem `onEndReachedThreshold` custom além do default razoável, sem cache/persistência de páginas, sem pull-to-refresh novo, sem paginação da busca (limite 25 da Fase 33 permanece).
