# BrDex Fase 5 — Crescimento — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dois recursos do spec que não dependem de infra externa: **progresso de coleção por set** (premium — "você tem 87 de 102 cartas dessa edição") e **compartilhamento social** (grátis — motor de crescimento, texto compartilhável da coleção).

**Architecture:** O progresso por set é calculado no Postgres (função `set_progress` security definer, mesmo padrão de `is_premium`) — o app só chama a RPC e gateia a exibição com o `isPremium()` da Fase 4. O compartilhamento usa a API nativa `Share` do React Native com uma função pura que monta a mensagem — zero infraestrutura, zero dependência nova.

**Tech Stack:** Supabase (Postgres + pgTAP), Expo/React Native, Jest (preset jest-expo).

## Global Constraints

- Progresso por set é recurso **premium** (spec, lista Premium); grátis vê upsell (`testID="progress-upsell"`).
- Compartilhamento é **grátis** (spec: "não faz sentido travar isso atrás de assinatura"). Nesta fase é texto via `Share.share` — imagem da coleção fica para depois (exige captura de view/asset pipeline).
- Recursos que continuam fora: scanner por foto, PDF, selo verificado, alertas de preço, feed RSS, calendário (infra/serviços externos ou push).
- npm com `--legacy-peer-deps`; testes JS `npx jest <pattern>`; banco `sg docker -c "npx supabase db reset"` / `sg docker -c "npx supabase test db"`.
- UI em pt-BR.

## File Structure

- `supabase/migrations/0007_set_progress.sql` — função `set_progress(uid)`.
- `supabase/tests/database/set_progress.test.sql` — pgTAP.
- `src/features/collection/setProgressRepository.ts` (+ test) — `fetchSetProgress()`.
- `src/features/collection/shareMessage.ts` (+ test) — `buildCollectionShareMessage()`.
- `app/(tabs)/album.tsx` (modificar: seção de progresso premium + botão Compartilhar).

---

### Task 1: Função set_progress no banco

**Files:**
- Create: `supabase/migrations/0007_set_progress.sql`
- Test: `supabase/tests/database/set_progress.test.sql`

**Interfaces:**
- Produces: `public.set_progress(uid uuid): table(set_id text, set_name text, total_cards bigint, owned_cards bigint)` — security definer; uma linha por set em que o usuário possui ≥ 1 carta; `owned_cards` conta cartas **distintas** do catálogo (duplicata não conta duas vezes); `total_cards` é o total do set em `cards_catalog`. Grant execute para authenticated.

- [ ] **Step 1: Write the failing pgTAP test** (`set_progress.test.sql` — 3 asserções: usuário com 2 cartas distintas + 1 duplicata num set de 3 → `owned_cards = 2` e `total_cards = 3`; set sem carta do usuário não aparece; usuário sem cartas → 0 linhas.)
- [ ] **Step 2: Run to verify it fails** — `sg docker -c "npx supabase test db"` → FAIL `function public.set_progress(uuid) does not exist`.
- [ ] **Step 3: Write the migration** (`0007_set_progress.sql`).
- [ ] **Step 4: Apply and verify** — reset + test db → PASS 3/3 novos + 27 anteriores.
- [ ] **Step 5: Commit** — `feat: add set progress function`

---

### Task 2: setProgressRepository + seção premium no álbum

**Files:** Create `src/features/collection/setProgressRepository.ts` (+ test); Modify `app/(tabs)/album.tsx`.

**Interfaces:** Produces `SetProgress { setId, setName, totalCards, ownedCards }` e `fetchSetProgress(): Promise<SetProgress[]>` — chama `client.rpc("set_progress", { uid: user.id })` e mapeia snake_case → camelCase; erro vira `throw new Error(message)`; sem usuário retorna `[]`. `album.tsx`: se `isPremium()`, mostra por set `Text` `testID="set-progress-<setId>"` com "«set_name»: «owned» de «total»"; senão `Text` `testID="progress-upsell"`: "Assine o premium para ver seu progresso por set."

- [ ] Teste (3 casos: mapeia linhas; erro propagado; sem usuário → lista vazia sem RPC) → red → implementação → green.
- [ ] Wire em `album.tsx` + full suite verde (`npx jest && npx tsc --noEmit`).
- [ ] Commit `feat: add per-set collection progress for premium users`.

---

### Task 3: Compartilhamento da coleção

**Files:** Create `src/features/collection/shareMessage.ts` (+ test); Modify `app/(tabs)/album.tsx`.

**Interfaces:** Produces `buildCollectionShareMessage(cards: UserCard[]): string` — puro, formato exato: `Minha coleção no BrDex: ${total} cartas (${distintas} diferentes). Baixe o BrDex e monte a sua!` (total = `cards.length`, distintas = `catalogCardId` únicos). `album.tsx`: `Pressable` `testID="share-collection"` → `Share.share({ message: buildCollectionShareMessage(cards) })`.

- [ ] Teste (2 casos: mensagem com contagens corretas incluindo duplicata; coleção vazia → "0 cartas (0 diferentes)") → red → implementação → green.
- [ ] Wire em `album.tsx` + verificação completa: `npx jest && npx tsc --noEmit` e `sg docker -c "npx supabase test db"` — tudo verde.
- [ ] Commit `feat: add collection share message on album`.

---

## Self-Review Notes

- **Cobertura do spec:** progresso por set (lista Premium) → Tasks 1–2 com gating real via `is_premium` da Fase 4; compartilhamento social (lista Grátis) → Task 3 em versão texto (imagem fica para iteração futura, registrado em Global Constraints).
- **YAGNI:** sem view materializada (a RPC agrega on-demand — volume por usuário é pequeno), sem geração de imagem, sem push.
- **Padrões:** função security definer + RPC + repository fino idênticos às Fases 3–4.
