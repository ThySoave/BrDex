# BrDex Fase 24 — Robustez de Entradas (login e preço) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nova varredura spec × código confirmou o spec 100% coberto (aviso fixo no chat, bloqueio aplicado em busca/matches/chat via `users_blocked`, outliers IQR no preço comunitário, premium gating em scanner/progresso/PDF/histórico, RLS presente em toda migration que cria tabela). A revisão de robustez encontrou dois débitos reais, ambos paralelos ao que a Fase 23 corrigiu: (1) o **login** (`app/(auth)/login.tsx`) ficou sem a validação local que o cadastro ganhou — campos vazios vão ao Supabase e voltam como erro técnico em inglês, e o teste existente só cobre o caminho feliz; (2) o **cadastro de carta** (`app/card/add.tsx`) faz `Number(pricePaid)`: usuário brasileiro digita `12,50` → `NaN` → o preço é perdido silenciosamente — dado que alimenta o preço colaborativo, coração do produto — enquanto o álbum (edição/venda, Fase 17/20) já trata vírgula com `Number.parseFloat(v.replace(",", "."))`. A Fase 24 alinha os dois pontos, sem recurso novo fora do spec.

**Architecture:** Sem migration, sem tela nova, sem dependência nova. Task 1 espelha a validação da Fase 23 no login (mensagens inline em pt-BR, mesmos textos onde couber). Task 2 usa exatamente o parse já padronizado no álbum (`album.tsx` linhas 74 e 95), eliminando a inconsistência entre cadastro e edição.

**Tech Stack:** Expo/React Native (`expo-router`), Jest (preset jest-expo) + RNTL.

## Global Constraints

- Sem migration nova; nenhum teste existente removido — apenas extensões e arquivos novos.
- Mensagens em pt-BR no padrão de cada tela (login usa `<Text>` de erro inline existente).
- Regra de email/senha no login idêntica à do cadastro (Fase 23): email com `@`, senha ≥ 6 — mesmos textos "Informe um email válido." / "A senha precisa de pelo menos 6 caracteres.".
- Parse de preço: `Number.parseFloat(valor.replace(",", "."))`; não finito → `null` — comportamento idêntico ao da edição no álbum (consistência > rigidez; campo é opcional).
- Press assíncrono em RNTL exige `await act(...)`/`waitFor` (padrão das Fases 20–23).
- Testes `npx jest <pattern>`; verificação final `npx jest --maxWorkers=2 && npx tsc --noEmit`.
- UI/textos em pt-BR.

## File Structure

- `app/(auth)/login.tsx` (+ estender `app/(auth)/login.test.tsx`) — validação local + cobertura de erro.
- `app/card/add.tsx` (+ estender `app/card/add.test.tsx`) — preço com vírgula decimal.

---

### Task 1: Validação local no login

**Files:** Modify `app/(auth)/login.tsx`; extend `app/(auth)/login.test.tsx`.

**Interfaces:**
- `handleSubmit` valida antes de chamar `signIn`: email vazio/sem `@` → "Informe um email válido."; senha < 6 caracteres → "A senha precisa de pelo menos 6 caracteres."; nos dois casos `signIn` NÃO é chamado e a mensagem vai para o `<Text>` de erro existente (adicionar `testID="login-error"`).
- Fluxo feliz inalterado (`signIn` + `router.replace("/(tabs)/album")`); erro do `signIn` continua indo para o mesmo `<Text>`.

- [x] **Step 1: Write the failing RNTL tests** (estender `login.test.tsx` — casos: email inválido mostra a mensagem e não chama `signIn`; senha curta mostra a mensagem e não chama `signIn`; erro do `signIn` ("Credenciais inválidas") aparece na tela; + `beforeEach(clearAllMocks)` para isolar os casos.)
- [x] **Step 2: Run to verify it fails** — `npx jest login.test` → FAIL (2 falhas de validação; caracterização verde).
- [x] **Step 3: Implement** — validação no topo do `handleSubmit` + `testID="login-error"` → GREEN (4/4).
- [x] **Step 4: Commit** — `feat: validate login fields before submitting`

---

### Task 2: Preço com vírgula no cadastro de carta

**Files:** Modify `app/card/add.tsx`; extend `app/card/add.test.tsx`.

**Interfaces:**
- `handleSubmit` passa a converter o preço com o parse do álbum: `const parsed = Number.parseFloat(pricePaid.replace(",", ".")); pricePaid: Number.isFinite(parsed) ? parsed : null` — `"12,50"` → `12.5`; `"abc"`/vazio → `null` (hoje `"12,50"` vira `NaN` e o preço se perde).

- [x] **Step 1: Write the failing RNTL tests** (estender `add.test.tsx` — casos: preço `"12,50"` chama `addUserCard` com `pricePaid: 12.5`; preço não numérico chama com `pricePaid: null`.)
- [x] **Step 2: Run to verify it fails** — `npx jest add.test` → FAIL (2 falhas: `"12,50"` e `"abc"` viravam `NaN`).
- [x] **Step 3: Implement** — parse idêntico ao de `album.tsx` → GREEN (9/9).
- [x] **Step 4: Full suite** — `npx jest --maxWorkers=2 && npx tsc --noEmit` verdes (230/230 em 51 suites, tsc limpo).
- [x] **Step 5: Commit** — `fix: parse decimal comma in card price input`

---

## Self-Review Notes

- **Escopo:** nenhum recurso fora do spec — só robustez de entrada em fluxos já existentes; a varredura desta sessão confirmou o spec coberto (bloqueio, aviso de chat, outliers, RLS, premium gating).
- **Consistência:** login herda exatamente as regras/textos do cadastro (Fase 23); preço do cadastro herda exatamente o parse do álbum (Fases 17/20) — nenhum padrão novo inventado.
- **Impacto real:** `Number("12,50") → NaN` perde dado que alimenta `price_community` — o recurso central do produto; validar login evita round-trip e erro em inglês na porta de entrada do app.
- **YAGNI:** sem máscara de moeda, sem i18n de formatação, sem "esqueci minha senha" — nada disso está no spec.
