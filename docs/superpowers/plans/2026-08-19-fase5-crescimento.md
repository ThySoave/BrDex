# BrDex Fase 5 — Crescimento — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dois recursos do spec ainda não construídos e que não dependem de serviço externo: **progresso de coleção por set** (premium — "você tem 87 de 102 cartas dessa edição") e **compartilhamento social** (grátis — motor de crescimento).

**Architecture:** O progresso por set é calculado no Postgres (função `set_progress(uid)` security definer, mesmo padrão de `is_premium`) — o app só exibe; gating premium no app via `isPremium()` já existente. O compartilhamento usa a `Share` API nativa do React Native (zero infra): função pura monta o texto, a tela de álbum dispara o share sheet do sistema.

**Tech Stack:** Supabase (Postgres + pgTAP), Expo/React Native, Jest (preset jest-expo).

## Global Constraints

- Progresso por set é recurso **premium** (spec, seção Recursos adicionais); grátis vê upsell.
- Compartilhamento é **grátis** (spec: travar motor de crescimento atrás de paywall não faz sentido). Versão texto via `Share.share` — imagem gerada fica para depois (exige view-shot/asset pipeline).
- Scanner por foto, PDF, selo verificado, notícias RSS, push de set novo e calendário ficam fora — dependem de infra/serviços externos.
- npm com `--legacy-peer-deps`; testes JS `npx jest <pattern>`; banco `sg docker -c "npx supabase db reset"` / `sg docker -c "npx supabase test db"`.
- UI em pt-BR.

## File Structure

- `supabase/migrations/0007_set_progress.sql` — função `set_progress(uid)`.
- `supabase/tests/database/set_progress.test.sql` — pgTAP da função.
- `src/features/collection/setProgressRepository.ts` (+ test) — `fetchSetProgress()`.
- `src/features/collection/shareCollection.ts` (+ test) — `buildCollectionShareMessage()`.
- `app/(tabs)/album.tsx` (modificar: seção de progresso premium + botão Compartilhar).

---

### Task 1: Função set_progress no banco

**Files:**
- Create: `supabase/migrations/0007_set_progress.sql`
- Test: `supabase/tests/database/set_progress.test.sql`

**Interfaces:**
- Produces: função `public.set_progress(uid uuid)` returns table(`set_id text, set_name text, owned bigint, total bigint`) — security definer, `owned` = count(distinct catalog_card_id) das `user_cards` do usuário naquele set; `total` = count(*) de `cards_catalog` do set; retorna só sets onde o usuário tem ao menos 1 carta, ordenado por `set_name`.

- [x] **Step 1: Write the failing pgTAP test** (`set_progress.test.sql` — 3 asserções: usuário com 2 de 3 cartas do set vê owned=2/total=3; duplicata da mesma carta não infla owned; set sem carta do usuário não aparece).
- [x] **Step 2: Run to verify it fails** — `sg docker -c "npx supabase test db"` → FAIL `function public.set_progress(uuid) does not exist`.
- [x] **Step 3: Write the migration** (`0007_set_progress.sql`).
- [x] **Step 4: Apply and verify** — reset + test db → PASS novos + 27 anteriores.
- [x] **Step 5: Commit** — `feat: add set_progress function for per-set collection progress`

---

### Task 2: Progresso por set no álbum (premium)

**Files:** Create `src/features/collection/setProgressRepository.ts` (+ test); Modify `app/(tabs)/album.tsx`.

**Interfaces:** Produces `fetchSetProgress(): Promise<SetProgress[]>` (`SetProgress { setId, setName, owned, total }`) — `client.rpc("set_progress", { uid: user.id })`, mapeia snake_case → camelCase; erro vira `throw new Error(message)`; sem usuário retorna `[]`. No `album.tsx`: se `isPremium()`, mostra por set `Text` `testID="set-progress-<setId>"` com "`<setName>`: `<owned>` de `<total>`"; senão `Text` `testID="set-progress-upsell"`: "Assine o premium para ver o progresso por edição."

- [ ] Teste do repository (3 casos: mapeia linhas; erro propagado; sem usuário → `[]` sem RPC) → red → implementação → green.
- [ ] Wire em `album.tsx` + full suite verde (`npx jest && npx tsc --noEmit`).
- [ ] Commit `feat: show per-set collection progress for premium users`.

---

### Task 3: Compartilhamento da coleção

**Files:** Create `src/features/collection/shareCollection.ts` (+ test); Modify `app/(tabs)/album.tsx`.

**Interfaces:** Produces `buildCollectionShareMessage(cardCount: number, totalValue: number | null): string` — com valor: "Minha coleção no BrDex: X cartas, avaliada em R$ Y! 🎴"; sem valor (null): "Minha coleção no BrDex: X cartas! 🎴" (Y formatado com vírgula decimal, 2 casas). No `album.tsx`: `Pressable` "Compartilhar" (`testID="share-collection"`) → `Share.share({ message })` com o total de cartas carregado (valor `null` — a tela de álbum não carrega valor).

- [ ] Teste (2 casos: com valor; sem valor) → red → implementação → green.
- [ ] Wire em `album.tsx` + verificação completa: `npx jest && npx tsc --noEmit` e `sg docker -c "npx supabase test db"` — tudo verde.
- [ ] Commit `feat: add collection share button on album`.

---

## Self-Review Notes

- **Cobertura do spec:** progresso por set (premium) e compartilhamento (grátis) — os dois únicos recursos restantes do spec sem dependência externa. Reputação básica exige fluxo de "negociação concluída" que ainda não existe (chat não tem estado de transação) — fica para quando esse fluxo for definido.
- **YAGNI:** share de imagem (view-shot) e deep links ficam para depois; texto já cumpre o motor de crescimento. `set_progress` não pagina — número de sets com cartas do usuário é pequeno.
- **Padrões:** função security definer + rpc + repository fino idênticos aos padrões das Fases 2–4.
