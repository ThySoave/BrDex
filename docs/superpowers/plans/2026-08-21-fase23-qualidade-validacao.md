# BrDex Fase 23 — Qualidade e Robustez (validação e cobertura) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O MVP do spec está completo (Fases 1–22, suite 213/213 verde, tsc limpo). A revisão de qualidade encontrou três pontos de débito: (1) a tela de **cadastro** (`app/(auth)/signup.tsx`) não tem teste nenhum e não valida nada localmente — email vazio ou senha curta vão direto ao Supabase e voltam como erro técnico em inglês; (2) a tela de **encontros** (`app/(tabs)/meetups.tsx`) não tem teste e aceita data no passado: o encontro é gravado mas nunca aparece na lista (que filtra `gte(now)`) — o usuário publica e "some", sem explicação; (3) `registerForPushNotifications` (caminho crítico do loop social: sem token, sem push de match) não tem cobertura alguma. A Fase 23 fecha esses três pontos sem mudar nenhum recurso do spec.

**Architecture:** Sem migration, sem tela nova, sem dependência nova. Validações locais nas telas existentes (padrão já usado no próprio `meetups.tsx` para campos vazios) e testes no padrão RNTL das fases anteriores (`login.test.tsx` para auth, `matches.test.tsx` para abas). Para push, mock de `expo-notifications` no padrão dos mocks de módulo Expo já usados na suite.

**Tech Stack:** Expo/React Native (`expo-router`), Jest (preset jest-expo) + RNTL.

## Global Constraints

- Sem migration nova; nenhum teste existente removido ou alterado além de extensões.
- Mensagens de validação em pt-BR, exibidas no padrão de cada tela (signup usa `<Text>` de erro inline já existente; meetups usa `Alert.alert` já existente).
- Regra de senha: mínimo 6 caracteres (mínimo padrão do Supabase Auth — validar localmente evita o round-trip e o erro em inglês).
- Regra de data em meetups: rejeitar `startsAt < agora` — exatamente o mesmo corte de `listUpcomingMeetups` (`gte(now)`), para que todo encontro aceito seja visível na lista.
- Task 3 é cobertura de caracterização (comportamento existente e correto): os testes nascem GREEN por definição — exceção consciente ao RED, registrada aqui; as Tasks 1 e 2 seguem RED→GREEN estrito.
- Press assíncrono em RNTL exige `await act(...)` quando o handler é async (padrão das Fases 20–22).
- Testes `npx jest <pattern>`; verificação final `npx jest --maxWorkers=2 && npx tsc --noEmit`.
- UI/textos em pt-BR.

## File Structure

- `app/(auth)/signup.tsx` (+ novo `app/(auth)/signup.test.tsx`) — validação local + cobertura da tela.
- `app/(tabs)/meetups.tsx` (+ novo `app/(tabs)/meetups.test.tsx`) — validação de data futura + cobertura da tela.
- `src/features/notifications/registerForPush.test.ts` (novo) — cobertura de caracterização do registro de push.

---

### Task 1: Validação e cobertura da tela de cadastro

**Files:** Modify `app/(auth)/signup.tsx`; create `app/(auth)/signup.test.tsx`.

**Interfaces:**
- `handleSubmit` valida antes de chamar `signUp`: email vazio ou sem `@` → erro "Informe um email válido."; senha com menos de 6 caracteres → erro "A senha precisa de pelo menos 6 caracteres."; em ambos os casos `signUp` NÃO é chamado e a mensagem aparece no `<Text>` de erro existente (`testID="signup-error"` a adicionar).
- Fluxo feliz inalterado: `signUp(email, password)` e `router.replace("/(tabs)/album")`; erro do repositório continua indo para o mesmo `<Text>` de erro.

- [x] **Step 1: Write the failing RNTL tests** (novo `signup.test.tsx`, mocks no padrão de `login.test.tsx` — casos: submit com email inválido mostra a mensagem e não chama `signUp`; senha curta mostra a mensagem e não chama `signUp`; dados válidos chamam `signUp` e navegam; erro do `signUp` aparece na tela.)
- [x] **Step 2: Run to verify it fails** — `npx jest signup` → FAIL (2 falhas de validação; 2 casos de caracterização já verdes).
- [x] **Step 3: Implement** — validação no topo do `handleSubmit` + `testID="signup-error"` → GREEN (4/4).
- [x] **Step 4: Commit** — `feat: validate signup fields before submitting`

---

### Task 2: Data futura e cobertura da tela de encontros

**Files:** Modify `app/(tabs)/meetups.tsx`; create `app/(tabs)/meetups.test.tsx`.

**Interfaces:**
- `handleCreate` passa a rejeitar data no passado: `startsAt.getTime() < Date.now()` → `Alert.alert("A data do encontro precisa ser futura")` e `createMeetup` NÃO é chamado (mesmo corte de visibilidade de `listUpcomingMeetups`).
- Comportamento existente coberto por caracterização: lista renderiza itens de `listUpcomingMeetups`; criação válida chama `createMeetup`, limpa os campos e recarrega a lista; campos vazios/data inválida mantêm o `Alert` atual.

- [x] **Step 1: Write the failing RNTL tests** (novo `meetups.test.tsx` — casos: data no passado dispara o `Alert` de data futura e não chama `createMeetup`; lista renderiza os encontros; criação válida chama `createMeetup` e recarrega; campos vazios disparam o `Alert` existente.)
- [x] **Step 2: Run to verify it fails** — `npx jest meetups.test` → FAIL (1 falha: data no passado; 3 casos de caracterização verdes).
- [x] **Step 3: Implement** — checagem de data passada no `handleCreate` → GREEN (4/4).
- [x] **Step 4: Commit** — `feat: reject past dates when creating meetups`

---

### Task 3: Cobertura de caracterização do registro de push

**Files:** Create `src/features/notifications/registerForPush.test.ts`.

**Interfaces:**
- Cobre `registerForPushNotifications` (comportamento existente, sem mudança): permissão negada (get e request) → `registerPushToken` não é chamado; permissão já concedida → registra token com o `Platform.OS`; permissão concedida após request → registra; erro de qualquer etapa é engolido (não propaga).

- [ ] **Step 1: Write the characterization tests** (novo `registerForPush.test.ts`, mock de `expo-notifications` e de `pushTokensRepository` — 4 casos acima; caracterização: nascem GREEN, ver Global Constraints.)
- [ ] **Step 2: Run to verify they pass against current code** — `npx jest registerForPush` → GREEN (4/4).
- [ ] **Step 3: Full suite** — `npx jest --maxWorkers=2 && npx tsc --noEmit` verdes.
- [ ] **Step 4: Commit** — `test: cover push registration flows`

---

## Self-Review Notes

- **Escopo:** nenhum recurso novo do spec — só validação local e cobertura de código já em produção; MVP do spec já estava completo (verificado contra `2026-08-16-brdex-design.md` nesta sessão).
- **Consistência:** signup valida no padrão inline da própria tela; meetups valida no padrão `Alert` da própria tela; a regra de data espelha exatamente o filtro da listagem, eliminando o estado "publicado mas invisível".
- **YAGNI:** sem confirmação de senha, sem date-picker, sem retry de push — nada disso está no spec.
- **Transparência de TDD:** Task 3 é caracterização (sem RED possível porque não há mudança de comportamento) — declarado nas Global Constraints em vez de simular um RED artificial.
