# BrDex Fase 26 — Rótulos Compartilhados (idioma e status) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Fase 25 consolidou parse de preço e validação de credenciais, mas restou a última duplicação de regra de apresentação: as opções de **idioma** `{ value, label }` (Inglês/Português/Japonês/Outro) estão copiadas em `app/card/add.tsx`, `app/(tabs)/album.tsx` e `app/(tabs)/catalog.tsx`, a tela de wishlist mantém um quarto formato próprio (`LANGUAGE_LABELS` Record + fallback "Qualquer idioma"), e as opções de **status** (Guardada/À venda/Disponível para troca) estão copiadas em `add.tsx` e `album.tsx`. O spec exige esses rótulos consistentes (escala fixa e idiomas padronizados alimentam o preço por `(carta, idioma)`) — hoje uma mudança de texto exigiria caçar 4 arquivos. A Fase 26 extrai as constantes para um módulo único testado e refatora as telas, sem mudança visível.

**Architecture:** Novo módulo puro `src/features/collection/labels.ts` ao lado de `types.ts`/`conditionScale.ts` (que já é o precedente: `CARD_CONDITIONS` é exatamente esse padrão para condição): `LANGUAGE_OPTIONS`, `STATUS_OPTIONS` e `languageLabel(language | null)` (null → "Qualquer idioma"). Telas refatoradas sob a proteção dos testes de tela existentes, que não podem ser editados (mesma mecânica da Fase 25).

**Tech Stack:** Expo/React Native (`expo-router`), Jest (preset jest-expo) + RNTL.

## Global Constraints

- Sem migration; nenhum teste existente editado — os testes de tela (idiomas no add/álbum/catálogo/wishlist, status no add/álbum) são a rede de proteção do refactor.
- Textos idênticos aos atuais: "Inglês"/"Português"/"Japonês"/"Outro", "Guardada"/"À venda"/"Disponível para troca", "Qualquer idioma" — nenhum rótulo novo.
- `labels.ts` importa os tipos de `types.ts` (`CardLanguage`, `CardStatus`) — sem tipo novo.
- Testes `npx jest <pattern>`; verificação final `npx jest --maxWorkers=2 && npx tsc --noEmit`.
- UI/textos em pt-BR.

## File Structure

- `src/features/collection/labels.ts` (+ `labels.test.ts`) — constantes e `languageLabel`.
- Refactors: `app/card/add.tsx`, `app/(tabs)/album.tsx`, `app/(tabs)/catalog.tsx`, `app/wishlist/index.tsx`.

---

### Task 1: Módulo de rótulos + refactor das telas de idioma

**Files:** Create `src/features/collection/labels.ts` + `labels.test.ts`; modify `app/card/add.tsx`, `app/(tabs)/album.tsx`, `app/(tabs)/catalog.tsx`, `app/wishlist/index.tsx`.

**Interfaces:**
- Produces: `LANGUAGE_OPTIONS: { value: CardLanguage; label: string }[]` (en/pt/jp/other, rótulos atuais); `languageLabel(language: CardLanguage | null): string` (null → "Qualquer idioma").
- Consumers: `add.tsx` e `album.tsx` (substituem `LANGUAGES` local), `catalog.tsx` (substitui `WISHLIST_LANGUAGES`), `wishlist/index.tsx` (substitui `LANGUAGE_LABELS` + ternário por `languageLabel(item.language)`).

- [x] **Step 1: Write the failing unit tests** (novo `labels.test.ts` — casos: `LANGUAGE_OPTIONS` tem os 4 idiomas com os rótulos atuais; `languageLabel("pt")` → "Português"; `languageLabel(null)` → "Qualquer idioma".)
- [x] **Step 2: Run to verify it fails** — `npx jest labels` → FAIL (module not found).
- [x] **Step 3: Implement** o módulo (parte de idiomas) → GREEN (3/3).
- [x] **Step 4: Refactor** as 4 telas — `npx jest labels add.test album.test catalog wishlist` → 63/63 em 8 suites + tsc limpo, sem editar nenhum teste.
- [x] **Step 5: Commit** — `refactor: extract shared language labels`

---

### Task 2: Opções de status compartilhadas

**Files:** Modify `src/features/collection/labels.ts` (+ `labels.test.ts`); modify `app/card/add.tsx`, `app/(tabs)/album.tsx`.

**Interfaces:**
- Produces: `STATUS_OPTIONS: { value: CardStatus; label: string }[]` (guardada/a_venda/disponivel_troca, rótulos atuais).
- Consumers: `add.tsx` (substitui `STATUSES`), `album.tsx` (substitui `STATUS_OPTIONS` local).

- [ ] **Step 1: Write the failing unit test** (estender `labels.test.ts` — caso: `STATUS_OPTIONS` tem os 3 status com os rótulos atuais.)
- [ ] **Step 2: Run to verify it fails** — `npx jest labels` → FAIL (export inexistente).
- [ ] **Step 3: Implement + refactor** as 2 telas; `npx jest labels add.test album.test` verdes sem editar testes.
- [ ] **Step 4: Full suite** — `npx jest --maxWorkers=2 && npx tsc --noEmit` verdes.
- [ ] **Step 5: Commit** — `refactor: extract shared status labels`

---

## Self-Review Notes

- **Escopo:** zero recurso novo, zero texto novo — só mover constantes duplicadas para o padrão que `CARD_CONDITIONS` já estabeleceu no mesmo diretório.
- **Rede de proteção:** os testes de tela existentes verificam os rótulos renderizados (ex.: painel de idioma do catálogo na Fase 22, edição no álbum na Fase 20) — qualquer divergência de texto acusa.
- **Coordenação:** `ls docs/superpowers/plans/` e `git status` conferidos na hora antes deste plano (lição das sessões paralelas) — sem plano nem arquivos em voo sobre o tema.
- **YAGNI:** sem i18n, sem enum novo, sem mexer em `CARD_CONDITIONS` (já é compartilhado).
