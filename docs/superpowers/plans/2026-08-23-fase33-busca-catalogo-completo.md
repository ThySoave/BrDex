# BrDex Fase 33 — Busca no Catálogo Completo (server-side + debounce) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O spec está 100% coberto em recursos (Fases 1–32); esta fase fecha uma lacuna funcional confirmada por auditoria de código nesta sessão: **a busca da aba Catálogo só enxerga as primeiras 50 cartas**. A tela carrega `fetchCatalogPage(0)` (50 cartas em ordem alfabética) e filtra client-side com `filterCatalogCards` — qualquer carta fora dessa primeira página é inencontrável, o que quebra o fluxo central do spec ("Usuário busca no catálogo sincronizado → escolhe a carta"). Já existe `searchCatalogByName` (busca server-side com `ilike`, limite 25), testado e usado só pelo scanner — a fase liga a tela de catálogo a ele, com debounce para não disparar uma query Supabase por tecla (problema já observado em auditoria anterior).

**Architecture:** Um hook novo `useDebouncedValue<T>(value, delayMs)` em `src/lib/useDebouncedValue.ts` (padrão clássico: `useState` + `useEffect` com `setTimeout`/`clearTimeout`). No `catalog.tsx`, `loadCatalog` vira `loadCards(searchText)`: texto vazio (após trim) → `fetchCatalogPage(0)` (comportamento atual); texto não vazio → `searchCatalogByName(texto)`. Um `useEffect` sobre o valor debounced (300 ms) dispara `loadCards`; o retry re-executa com a query atual. O filtro client-side `filterCatalogCards(cards, query)` permanece como feedback instantâneo enquanto o debounce não vence (server `ilike` e filtro client usam a mesma semântica de substring no nome, então nunca divergem no resultado final).

**Tech Stack:** Expo/React Native (`expo-router`), Jest (preset jest-expo) + RNTL (`renderHook` para o hook, fake timers).

## Global Constraints

- Nenhum teste existente editado ou removido — apenas casos novos (a factory do `jest.mock` do `catalogRepository` no `catalog.test.tsx` ganha `searchCatalogByName: jest.fn()`, mudança aditiva de infra que não altera nenhum caso existente).
- Debounce de 300 ms; testes do hook e da tela usam `jest.useFakeTimers()` + `act(() => jest.advanceTimersByTime(...))`; press assíncrono com `await act` (RNTL + React 19).
- Query vazia ou só espaços nunca chama `searchCatalogByName` — cai no `fetchCatalogPage(0)`.
- Testes: `npx jest <pattern>`; verificação final `npx jest --maxWorkers=2 && npx tsc --noEmit`.
- Commit a cada task concluída, no padrão dos commits anteriores.

## File Structure

- Task 1: `src/lib/useDebouncedValue.ts` + `src/lib/useDebouncedValue.test.ts`
- Task 2: `app/(tabs)/catalog.tsx` + casos novos em `app/(tabs)/catalog.test.tsx`

---

### Task 1: Hook useDebouncedValue

- [x] **Step 1: Write the failing test** — `src/lib/useDebouncedValue.test.ts` com `renderHook` + fake timers: (a) valor inicial é retornado imediatamente; (b) após mudança, valor antigo persiste antes de 300 ms e o novo aparece depois de `advanceTimersByTime(300)`; (c) mudanças em sequência dentro da janela só aplicam a última (timer reiniciado).
- [x] **Step 2: Run to verify it fails** — `npx jest useDebouncedValue` → falha por módulo inexistente.
- [x] **Step 3: Implement** — `src/lib/useDebouncedValue.ts`: `useState(value)` + `useEffect` com `setTimeout(delayMs)` e cleanup `clearTimeout` → GREEN.
- [x] **Step 4: Commit** — `feat: add useDebouncedValue hook`

---

### Task 2: Busca server-side na aba Catálogo

- [ ] **Step 1: Write the failing RNTL tests** — casos novos em `catalog.test.tsx` (describe próprio, fake timers): (a) digitar no `catalog-search-input` e avançar 300 ms → `searchCatalogByName` chamado com o texto e resultados renderizados (carta que não estava na página 0 aparece); (b) antes de vencer o debounce, `searchCatalogByName` ainda não foi chamado; (c) limpar o campo e avançar 300 ms → volta a mostrar a página 0 (novo `fetchCatalogPage`), sem chamada extra de busca; (d) falha de `searchCatalogByName` → `catalog-error` com retry que re-executa a busca com a mesma query.
- [ ] **Step 2: Run to verify it fails** — `npx jest catalog.test` → casos novos falham, existentes verdes.
- [ ] **Step 3: Implement** — `catalog.tsx`: importar `searchCatalogByName` e `useDebouncedValue`; `loadCards(searchText)` em `useCallback` (vazio → `fetchCatalogPage(0)`, senão → `searchCatalogByName`); `useEffect` sobre o valor debounced; retry usa a query atual → GREEN sem editar casos existentes.
- [ ] **Step 4: Full suite** — `npx jest --maxWorkers=2 && npx tsc --noEmit` verdes.
- [ ] **Step 5: Commit** — `feat: search full catalog server-side with debounce`

---

## Self-Review Notes

- **Continuidade:** reusa `searchCatalogByName` (Fase 15/scanner) sem tocar no repositório; mantém empty/loading/error/retry das Fases 29–31 intactos.
- **Risco:** baixo — com o campo vazio o comportamento é idêntico ao atual (página 0 + filtro client), então nenhum fluxo existente muda; a busca server-side só entra quando o usuário digita.
- **YAGNI:** sem paginação infinita do catálogo, sem busca por set/número, sem debounce no mercado (lá já existe botão explícito de busca), sem cache de resultados.
