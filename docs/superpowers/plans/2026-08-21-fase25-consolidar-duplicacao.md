# BrDex Fase 25 — Consolidar Duplicação (parse de preço e validação de credenciais) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O spec está 100% coberto e as Fases 23–24 fecharam os buracos de validação — mas deixaram lógica idêntica copiada em vários pontos: o parse de preço com vírgula decimal (`Number.parseFloat(v.replace(",", "."))` + checagem de finito) existe em **4 lugares** (`app/card/add.tsx`, `app/(tabs)/album.tsx` na venda e na edição, e `app/(tabs)/catalog.tsx` no limiar do alerta com a variação `Number(...)`), e a validação de email/senha da Fase 23/24 está duplicada literalmente entre `login.tsx` e `signup.tsx` (mesmas regras, mesmas mensagens). Duplicação de regra de negócio diverge com o tempo — o `catalog.tsx` já diverge hoje (`Number` em vez de `parseFloat`). A Fase 25 extrai dois helpers puros testados e refatora as telas para usá-los, sem mudança de comportamento visível (exceto uma unificação consciente, ver Global Constraints).

**Architecture:** Dois módulos puros novos: `src/lib/parsePrice.ts` (`parseBrlPrice(input: string): number | null` — vírgula → ponto, não finito → `null`) e `src/features/auth/validateCredentials.ts` (`validateCredentials(email, password): string | null` — retorna a mensagem de erro em pt-BR ou `null` se válido). Helpers nascem por TDD (RED natural: módulo não existe); as telas são refatoradas em seguida protegidas pelos testes de tela das Fases 16–24, que devem permanecer verdes sem alteração (é o R de RED-GREEN-REFACTOR das fases anteriores, agora entre telas).

**Tech Stack:** Expo/React Native (`expo-router`), Jest (preset jest-expo) + RNTL.

## Global Constraints

- Sem migration; nenhum teste existente removido ou enfraquecido — os testes de tela existentes são a rede de proteção do refactor e NÃO podem ser editados nesta fase.
- `parseBrlPrice` retorna `number | null`; políticas locais (ex.: `<= 0` rejeitado na venda/alerta, `null` aceito no preço pago opcional) ficam nas telas — o helper só normaliza a entrada.
- Unificação consciente: o limiar do alerta no catálogo passa de `Number(...)` para o mesmo `parseFloat` das demais telas — entrada como `"12abc"` passa a valer `12` em vez de ser rejeitada; alinhar as 4 telas numa única semântica é exatamente o objetivo da fase.
- Mensagens de `validateCredentials` idênticas às atuais: "Informe um email válido." / "A senha precisa de pelo menos 6 caracteres." — nenhum texto novo.
- Testes `npx jest <pattern>`; verificação final `npx jest --maxWorkers=2 && npx tsc --noEmit`.
- UI/textos em pt-BR.

## File Structure

- `src/lib/parsePrice.ts` (+ `parsePrice.test.ts`) — helper de preço.
- `src/features/auth/validateCredentials.ts` (+ `validateCredentials.test.ts`) — helper de credenciais.
- Refactors: `app/card/add.tsx`, `app/(tabs)/album.tsx`, `app/(tabs)/catalog.tsx`, `app/(auth)/login.tsx`, `app/(auth)/signup.tsx`.

---

### Task 1: Helper de parse de preço + refactor das 4 telas

**Files:** Create `src/lib/parsePrice.ts` + `src/lib/parsePrice.test.ts`; modify `app/card/add.tsx`, `app/(tabs)/album.tsx` (venda e edição), `app/(tabs)/catalog.tsx`.

**Interfaces:**
- Produces: `parseBrlPrice(input: string): number | null` — `"12,50"` → `12.5`; `"30.5"` → `30.5`; `""`/`"abc"` → `null`; `"0"` → `0` (política de `<= 0` fica no chamador); `" 12,50 "` → `12.5` (trim).
- Consumers: venda no álbum (`null` ou `<= 0` → alerta), edição no álbum (`null` → grava `null`), cadastro de carta (`null` → grava `null`), limiar de alerta no catálogo (`null` ou `<= 0` → alerta).

- [ ] **Step 1: Write the failing unit tests** (novo `parsePrice.test.ts` — casos: vírgula decimal, ponto decimal, vazio, não numérico, zero, espaços.)
- [ ] **Step 2: Run to verify it fails** — `npx jest parsePrice` → FAIL (module not found).
- [ ] **Step 3: Implement** o helper → GREEN.
- [ ] **Step 4: Refactor** as 4 telas para `parseBrlPrice` e rodar as suites delas (`npx jest add.test album.test catalog`) — verdes sem editar nenhum teste.
- [ ] **Step 5: Commit** — `refactor: extract shared BRL price parser`

---

### Task 2: Helper de validação de credenciais + refactor de login/signup

**Files:** Create `src/features/auth/validateCredentials.ts` + `validateCredentials.test.ts`; modify `app/(auth)/login.tsx`, `app/(auth)/signup.tsx`.

**Interfaces:**
- Produces: `validateCredentials(email: string, password: string): string | null` — email vazio/sem `@` → "Informe um email válido."; senha `< 6` → "A senha precisa de pelo menos 6 caracteres."; válido → `null`. Ordem: email primeiro (comportamento atual das telas).
- Consumers: `login.tsx` e `signup.tsx` — `const message = validateCredentials(email, password); if (message) { setError(message); return; }`.

- [ ] **Step 1: Write the failing unit tests** (novo `validateCredentials.test.ts` — casos: email vazio, sem `@`, senha curta, ambos inválidos (email vence), credenciais válidas.)
- [ ] **Step 2: Run to verify it fails** — `npx jest validateCredentials` → FAIL (module not found).
- [ ] **Step 3: Implement** o helper → GREEN.
- [ ] **Step 4: Refactor** login/signup para o helper e rodar `npx jest login.test signup` — verdes sem editar nenhum teste.
- [ ] **Step 5: Full suite** — `npx jest --maxWorkers=2 && npx tsc --noEmit` verdes.
- [ ] **Step 6: Commit** — `refactor: extract shared credential validation`

---

## Self-Review Notes

- **Escopo:** zero recurso novo — consolidação de lógica que as Fases 23–24 espalharam; o comportamento visível é idêntico, exceto a unificação declarada do catálogo.
- **Rede de proteção:** os testes de tela das Fases 16–24 cobrem exatamente os fluxos refatorados (vírgula no add, venda inválida no álbum, limiar no catálogo, validação em login/signup) e não são tocados — se o refactor quebrar comportamento, eles acusam.
- **YAGNI:** sem i18n, sem máscara de moeda, sem validação de força de senha — nada disso está no spec; helpers são funções puras de uma linha de responsabilidade.
