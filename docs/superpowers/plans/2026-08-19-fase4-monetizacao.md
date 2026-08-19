# BrDex Fase 4 — Monetização — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Assinatura premium (entitlement no banco + gating de recursos no app) e links de afiliado para compra de cartas — os dois pilares de receita do spec.

**Architecture:** O entitlement mora no Postgres (`premium_subscriptions` + função `is_premium`), nunca no app — o gating de limite de cartas é trigger no servidor, igual ao padrão de triggers da Fase 3. O app só lê o entitlement via repository. A cobrança em si (IAP Apple/Google ou RevenueCat) exige contas de loja e credenciais externas — fica **fora deste plano**; a ativação é escrita direto na tabela (backoffice/manual) e o app já funciona com qualquer mecanismo que preencha a tabela. Links de afiliado são montados no cliente (URL builder puro + `Linking.openURL`), zero infraestrutura.

**Tech Stack:** Supabase (Postgres + pgTAP), Expo/React Native, Jest (preset jest-expo).

## Global Constraints

- Limite grátis de cartas no inventário: **100** (spec: "número a definir" — definido aqui); premium ilimitado. Enforcement por trigger, não por filtro de app.
- Gráfico de valor: grátis mostra os últimos **30 dias**; premium o histórico completo.
- Recursos grátis do spec (compartilhamento, notícias, reputação) não entram nesta fase — ver spec, são motor de crescimento, não monetização.
- Scanner por foto, PDF e selo verificado ficam para depois (dependem de infra/serviços externos).
- Código de afiliado TCGplayer via constante `TCGPLAYER_AFFILIATE_ID` (placeholder até o programa ser aprovado).
- npm com `--legacy-peer-deps`; testes JS `npx jest <pattern>`; banco `sg docker -c "npx supabase db reset"` / `sg docker -c "npx supabase test db"`.
- UI em pt-BR.

## File Structure

- `supabase/migrations/0006_premium.sql` — `premium_subscriptions`, `is_premium()`, trigger de limite de cartas.
- `supabase/tests/database/premium.test.sql` — pgTAP do entitlement e do limite.
- `src/features/premium/entitlementsRepository.ts` (+ test) — `isPremium()`.
- `src/features/premium/affiliateLinks.ts` (+ test) — URL builder TCGplayer.
- `app/(tabs)/value.tsx` (modificar: recorte de 30 dias para grátis), `app/(tabs)/catalog.tsx` (modificar: botão "Comprar").

---

### Task 1: Schema premium — premium_subscriptions, is_premium, limite de cartas

**Files:**
- Create: `supabase/migrations/0006_premium.sql`
- Test: `supabase/tests/database/premium.test.sql`

**Interfaces:**
- Produces: `premium_subscriptions(user_id pk → auth.users, activated_at, expires_at nullable)`; função `public.is_premium(uid uuid): boolean` security definer (ativa se existe linha com `expires_at` nulo ou futuro); trigger `user_cards_enforce_free_limit` (before insert: se não premium e count(user_cards do usuário) >= 100 → exception `P0001` com mensagem "Limite de 100 cartas no plano grátis"). RLS: usuário lê a própria assinatura; escrita só por service role (sem policy de insert para authenticated).

- [x] **Step 1: Write the failing pgTAP test** (`premium.test.sql` — 4 asserções: `is_premium` falso sem assinatura; verdadeiro com assinatura ativa; falso com assinatura expirada; inserção da carta 101 falha para usuário grátis — usar loop para inserir 100 cartas.)
- [x] **Step 2: Run to verify it fails** — `sg docker -c "npx supabase test db"` → FAIL `function public.is_premium(uuid) does not exist`.
- [x] **Step 3: Write the migration** (`0006_premium.sql`).
- [x] **Step 4: Apply and verify** — reset + test db → PASS 4/4 novos + 23 anteriores.
- [x] **Step 5: Commit** — `feat: add premium subscriptions with free-tier card limit`

---

### Task 2: entitlementsRepository

**Files:** Create `src/features/premium/entitlementsRepository.ts` (+ test).

**Interfaces:** Produces `isPremium(): Promise<boolean>` — chama `client.rpc("is_premium", { uid: user.id })`, retorna `data === true`; erro vira `throw new Error(message)`; sem usuário logado retorna `false` (não lança).

- [x] Teste (4 casos: premium true; false; erro propagado; sem usuário → false sem RPC) → red → implementação → green.
- [x] Commit `feat: add entitlements repository`.

---

### Task 3: Recorte do gráfico de valor para grátis

**Files:** Modify `src/features/collection/valueChart.ts` (+ test), `app/(tabs)/value.tsx`.

**Interfaces:** Produces `limitHistoryDays(points: ValuePoint[], days: number): ValuePoint[]` (puro: mantém só pontos com data >= max(data) - days). `value.tsx` chama `isPremium()` no load; se falso aplica `limitHistoryDays(points, 30)` e mostra `Text` com `testID="value-upsell"`: "Assine o premium para ver o histórico completo."

- [x] Teste de `limitHistoryDays` (2 casos: corta pontos antigos; lista vazia) → red → implementação → green.
- [x] Wire em `value.tsx` + full suite verde.
- [x] Commit `feat: limit value history to 30 days for free tier`.

---

### Task 4: Links de afiliado no catálogo

**Files:** Create `src/features/premium/affiliateLinks.ts` (+ test); Modify `app/(tabs)/catalog.tsx`.

**Interfaces:** Produces `buildTcgplayerSearchUrl(cardName: string): string` — `https://www.tcgplayer.com/search/pokemon/product?q=<nome url-encoded>&utm_campaign=affiliate&utm_source=<TCGPLAYER_AFFILIATE_ID>`; exporta `TCGPLAYER_AFFILIATE_ID = "brdex-placeholder"`.

- [ ] Teste (2 casos: URL com nome codificado; inclui o id de afiliado) → red → implementação → green.
- [ ] Wire: no item do catálogo, `Pressable` "Comprar" (`testID: buy-<id>`) → `Linking.openURL(buildTcgplayerSearchUrl(item.name))`.
- [ ] Verificação completa: `npx jest && npx tsc --noEmit` e `sg docker -c "npx supabase test db"` — tudo verde.
- [ ] Commit `feat: add TCGplayer affiliate buy links on catalog`.

---

## Self-Review Notes

- **Cobertura do spec (Fase 4):** assinatura premium → Tasks 1/2 (entitlement + leitura) com gating real nas Tasks 1 (limite de cartas, servidor) e 3 (histórico, app); links de afiliado → Task 4. Pilar de receita completo exceto a cobrança da loja, que exige contas externas (decisão registrada na Architecture).
- **YAGNI:** sem tela de paywall/checkout (não há o que cobrar sem IAP), sem scanner/PDF/selo (infra externa), sem API de preços (spec marca como futuro).
- **Padrões:** trigger security definer + RLS de leitura própria seguem exatamente o padrão das Fases 2–3; repositories finos idênticos aos de `src/features/social/`.
