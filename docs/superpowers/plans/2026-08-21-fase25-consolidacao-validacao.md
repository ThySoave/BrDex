# BrDex Fase 25 — Consolidação de Parse e Validação — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O spec segue 100% coberto (verificado duas vezes nesta sessão) e as Fases 23–24 fecharam validação e feedback — mas espalharam duplicação real: o parse de preço com vírgula (`Number.parseFloat(v.replace(",", "."))` + checagem de finito) existe em **4 pontos** (`app/card/add.tsx`, `app/(tabs)/album.tsx` venda e edição, `app/(tabs)/catalog.tsx` alerta de preço — este ainda com `Number()` em vez de `parseFloat`), e as regras de credenciais (email com `@`, senha ≥ 6, mesmos textos pt-BR) estão copiadas entre `login.tsx` e `signup.tsx`. Duplicação de regra de negócio diverge com o tempo — o `catalog.tsx` já diverge hoje. A Fase 25 extrai dois helpers puros, cobertos por testes unitários, e refatora as telas para usá-los, sem mudar comportamento visível (exceto uma unificação consciente, ver Constraints).

**Architecture:** Dois módulos puros novos, sem dependência de React/Supabase: `src/lib/parsePrice.ts` (`parseBrlPrice(input: string): number | null` — vírgula ou ponto; não finito → `null`) e `src/features/auth/validateCredentials.ts` (`validateCredentials(email, password): string | null` — retorna a primeira mensagem de erro ou `null`). As telas passam a consumi-los; os testes de tela existentes (Fases 16–24) agem como rede de segurança do REFACTOR.

**Tech Stack:** TypeScript puro nos helpers; Jest (preset jest-expo); RNTL só como rede de segurança.

## Global Constraints

- Comportamento das telas preservado; os testes de tela existentes não são alterados e devem permanecer verdes.
- **Unificação consciente:** o alerta de preço do catálogo usa `Number()` hoje (`"12abc"` → rejeitado) e passará ao mesmo `parseFloat` das demais telas (`"12abc"` → `12`). Alinha as 4 entradas de preço numa semântica única — registrado aqui como decisão, não acidente.
- Políticas locais ficam nas telas (ex.: venda/alerta exigem `> 0`; edição/cadastro aceitam `null`); o helper só converte.
- Textos de validação de credenciais inalterados: "Informe um email válido." / "A senha precisa de pelo menos 6 caracteres.".
- Sem migration; nenhum teste existente removido ou alterado.
- Testes `npx jest <pattern>`; verificação final `npx jest --maxWorkers=2 && npx tsc --noEmit`.

## File Structure

- `src/lib/parsePrice.ts` (+ `parsePrice.test.ts`) — helper de conversão de preço pt-BR.
- `src/features/auth/validateCredentials.ts` (+ `validateCredentials.test.ts`) — regra única de credenciais.
- Refactor: `app/card/add.tsx`, `app/(tabs)/album.tsx`, `app/(tabs)/catalog.tsx`, `app/(auth)/login.tsx`, `app/(auth)/signup.tsx`.

---

### Task 1: Helper de preço + refactor das 4 entradas

**Files:** Create `src/lib/parsePrice.ts` + `src/lib/parsePrice.test.ts`; modify `app/card/add.tsx`, `app/(tabs)/album.tsx` (venda e edição), `app/(tabs)/catalog.tsx`.

**Interfaces:**
- Produces: `parseBrlPrice(input: string): number | null` — `"12,50"` → `12.5`; `"30.5"` → `30.5`; `""`/`"abc"` → `null`; `"12abc"` → `12` (semântica `parseFloat`); preserva sinal (quem exige positivo checa na tela).
- Consumers: cadastro (`pricePaid: parseBrlPrice(pricePaid)`); venda (`price === null || price <= 0` → alerta existente); edição (`pricePaid` direto, `null` permitido); alerta do catálogo (`value === null || value <= 0` → alerta existente).

- [x] **Step 1: Write the failing unit tests** (novo `parsePrice.test.ts` — casos finais: vírgula, ponto, vazio, não numérico, zero (política de valor é da tela), espaços ao redor.)
- [x] **Step 2: Run to verify it fails** — `npx jest parsePrice` → FAIL (module not found).
- [x] **Step 3: Implement + refactor** — helper criado e 4 pontos de parse trocados; `npx jest parsePrice add.test album.test catalog` → GREEN (55/55 em 6 suites) sem tocar nos testes de tela.
- [x] **Step 4: Commit** — `refactor: extract shared BRL price parser`

---

### Task 2: Regra única de credenciais + refactor de login/signup

**Files:** Create `src/features/auth/validateCredentials.ts` + `validateCredentials.test.ts`; modify `app/(auth)/login.tsx`, `app/(auth)/signup.tsx`.

**Interfaces:**
- Produces: `validateCredentials(email: string, password: string): string | null` — email vazio/sem `@` → "Informe um email válido."; senha < 6 → "A senha precisa de pelo menos 6 caracteres."; ok → `null`.
- Consumers: `handleSubmit` de login e signup — `const validationError = validateCredentials(email, password); if (validationError) { setError(validationError); return; }`.

- [ ] **Step 1: Write the failing unit tests** (novo `validateCredentials.test.ts` — casos: email vazio, sem `@`, senha curta, credenciais válidas, precedência email antes de senha.)
- [ ] **Step 2: Run to verify it fails** — `npx jest validateCredentials` → FAIL (module not found).
- [ ] **Step 3: Implement + refactor** — criar o helper e trocar a validação inline das duas telas; `npx jest validateCredentials login.test signup` → GREEN sem tocar nos testes de tela.
- [ ] **Step 4: Full suite** — `npx jest --maxWorkers=2 && npx tsc --noEmit` verdes.
- [ ] **Step 5: Commit** — `refactor: extract shared credential validation`

---

## Self-Review Notes

- **Escopo:** zero recurso novo — consolidação do que as Fases 23–24 introduziram, exatamente o "refatorar duplicação" pedido; telas protegidas pelos testes RNTL existentes durante o REFACTOR.
- **TDD real:** os helpers são módulos novos — RED natural (module not found) antes de qualquer implementação.
- **Decisão consciente:** unificar o catálogo na semântica `parseFloat` (divergência atual documentada em Constraints) em vez de manter duas semânticas de parse no mesmo app.
- **YAGNI:** sem i18n, sem máscara de moeda, sem validação de força de senha — nada disso está no spec.
