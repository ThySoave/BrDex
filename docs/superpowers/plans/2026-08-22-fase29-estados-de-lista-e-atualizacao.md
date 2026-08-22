# BrDex Fase 29 — Estados de Lista e Atualização — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O spec está 100% coberto (Fases 1–28); esta fase é polish de UX/robustez confirmado por auditoria de código nesta sessão: (1) **4 listas sem estado vazio** — `catalog`, `album`, `meetups` e `chat` renderizam FlatList sem `ListEmptyComponent` (matches, home, market e wishlist já têm); (2) **erro silencioso no catálogo** — `fetchCatalogPage(0).catch(() => setCards([]))` engole falha de rede e mostra lista vazia sem explicação (album e meetups já exibem o erro); (3) **álbum não atualiza ao ganhar foco** — usa `useEffect([])`, então uma carta adicionada via `card/add` não aparece ao voltar para a aba (matches já usa `useFocusEffect`), e nenhuma lista tem pull-to-refresh.

**Architecture:** Sem módulo novo — só props/estados nas telas existentes. Estados vazios via `ListEmptyComponent` com `testID` e mensagem pt-BR orientando a próxima ação (padrão de `matches-empty`). Erro do catálogo via estado `error` + `Text`, mesmo padrão de album/meetups. Atualização via `useFocusEffect` (padrão de matches) + props nativas `onRefresh`/`refreshing` da FlatList no álbum e nos encontros (testável com `fireEvent(list, "refresh")`).

**Tech Stack:** Expo/React Native (`expo-router`), Jest (preset jest-expo) + RNTL.

## Global Constraints

- Nenhum teste existente editado ou removido — apenas casos novos.
- Mensagens em pt-BR coerentes com as existentes (ex.: matches-empty orienta a próxima ação).
- Testes `npx jest <pattern>`; verificação final `npx jest --maxWorkers=2 && npx tsc --noEmit`.
- Commit a cada task concluída, no padrão dos commits anteriores.

## File Structure

- Task 1 (estados vazios): `app/(tabs)/catalog.tsx`, `app/(tabs)/album.tsx`, `app/(tabs)/meetups.tsx`, `app/chat/[conversationId].tsx` (+ testes respectivos).
- Task 2 (erro do catálogo): `app/(tabs)/catalog.tsx` (+ teste).
- Task 3 (atualização): `app/(tabs)/album.tsx`, `app/(tabs)/meetups.tsx` (+ testes).

---

### Task 1: Estados vazios nas listas restantes (catalog, album, meetups, chat)

- [x] **Step 1: Write the failing RNTL tests** — um caso por tela: com repositório resolvendo `[]`, a tela mostra `catalog-empty` / `album-empty` / `meetups-empty` / `chat-empty` com mensagem orientando a próxima ação.
- [x] **Step 2: Run to verify it fails** — `npx jest catalog.test album.test meetups.test chat.test` → 4 falhas novas (exatamente os 4 casos novos; 50 existentes verdes).
- [x] **Step 3: Implement** — `ListEmptyComponent` nas 4 FlatLists → GREEN (54/54) sem editar testes existentes.
- [x] **Step 4: Commit** — `feat: add empty states to remaining lists`

---

### Task 2: Erro visível no carregamento do catálogo

- [x] **Step 1: Write the failing RNTL test** — `fetchCatalogPage` rejeitando → tela mostra `catalog-error` com a mensagem, em vez de lista vazia silenciosa.
- [x] **Step 2: Run to verify it fails** — `npx jest catalog.test` → 1 falha nova (9 existentes verdes).
- [x] **Step 3: Implement** — estado `error` no catálogo, mesmo padrão de album/meetups (early return) → GREEN (10/10).
- [x] **Step 4: Commit** — `feat: surface catalog load errors`

---

### Task 3: Álbum atualiza ao focar + pull-to-refresh (album, meetups)

- [x] **Step 1: Write the failing RNTL tests** — (a) álbum: `fireEvent(albumList, "refresh")` refaz `listUserCards` e mostra a carta nova; (b) meetups: idem com `listUpcomingMeetups`; (c) álbum recarrega ao ganhar foco (`useFocusEffect`), seguindo o mock de expo-router já usado em matches.test.
- [x] **Step 2: Run to verify it fails** — `npx jest album.test meetups.test` → 3 falhas novas (35 existentes verdes).
- [x] **Step 3: Implement** — extraído `loadCards` com `useCallback`, `useEffect` → `useFocusEffect` no álbum; `onRefresh`/`refreshing` nas duas FlatLists → GREEN (38/38).
- [x] **Step 4: Full suite** — `npx jest --maxWorkers=2 && npx tsc --noEmit` verdes (272/272 em 54 suites, tsc limpo).
- [x] **Step 5: Commit** — `feat: add focus reload and pull-to-refresh to album and meetups`

---

## Self-Review Notes

- **Continuidade:** spec coberto; fase de polish pedida explicitamente pelo usuário (performance/UX). Escopo confirmado por grep/leitura de código, não estimado.
- **Risco:** baixo — padrões já existentes no próprio código (matches/home como referência); rede de proteção são as 54 suites intactas.
- **YAGNI:** sem debounce (busca do catálogo é local; a do market é por botão), sem RefreshControl custom (props nativas da FlatList), sem loading spinners globais.
