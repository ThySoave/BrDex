# BrDex Fase 9 — Alertas de Preço (Premium) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Usuário premium cria alerta "avise quando essa carta passar de X" a partir do catálogo; quando a mediana comunitária (`price_community.median_price`) atinge/ultrapassa o valor, o alerta aparece disparado na aba Valor (in-app, sem push — mesmo padrão das fases anteriores). Recurso premium conforme o spec.

**Architecture:** Tabela `price_alerts` (dono via RLS) + função SQL `triggered_price_alerts()` (security invoker — RLS de `price_alerts` limita ao dono; `price_community` e `cards_catalog` já são legíveis por autenticados) que retorna os alertas do usuário cuja mediana atual >= threshold, com nome da carta e preço atual. App consome via RPC em `priceAlertsRepository`. Criação na tela de catálogo (gate `isPremium()` com upsell, mesmo padrão do progresso por set no álbum — Fase 5); exibição/remoção na aba Valor.

**Tech Stack:** Supabase (Postgres + pgTAP), Expo/React Native, Jest (preset jest-expo).

## Global Constraints

- **Premium**: criação de alerta checa `isPremium()` na UI e mostra upsell quando falso (padrão `set-progress-upsell` do álbum). A tabela em si fica protegida por RLS de dono (o servidor não valida premium — consistente com as Fases 4/5, onde o gate é de UX, não de segurança).
- Disparo = `median_price >= threshold_brl` para o mesmo `(catalog_card_id, language)`; sem direção "abaixo de" (YAGNI — spec só pede "passar de X").
- In-app apenas; sem push notification.
- npm com `--legacy-peer-deps`; testes JS `npx jest <pattern>`; banco `sg docker -c "npx supabase db reset"` / `sg docker -c "npx supabase test db"`.
- UI em pt-BR.

## File Structure

- `supabase/migrations/0012_price_alerts.sql` — tabela `price_alerts`, RLS dono, função `triggered_price_alerts()`.
- `supabase/tests/database/price_alerts.test.sql` — pgTAP.
- `src/features/premium/priceAlertsRepository.ts` (+ test) — `createPriceAlert(catalogCardId, language, thresholdBrl)`, `listTriggeredPriceAlerts()`, `removePriceAlert(alertId)`.
- `app/(tabs)/catalog.tsx` — modificar: botão "Alerta" por carta (premium) com input de valor.
- `app/(tabs)/value.tsx` — modificar: seção de alertas disparados com botão de remover.

---

### Task 1: Schema — price_alerts + triggered_price_alerts

**Files:**
- Create: `supabase/migrations/0012_price_alerts.sql`
- Test: `supabase/tests/database/price_alerts.test.sql`

**Interfaces:**
- Produces: `price_alerts(id, user_id, catalog_card_id, language, threshold_brl, created_at)` com unique `(user_id, catalog_card_id, language)`; `triggered_price_alerts() returns table(alert_id uuid, catalog_card_id uuid, card_name text, language card_language, threshold_brl numeric, current_price numeric)`. Task 2 usa exatamente esses nomes.

- [x] **Step 1: Write the failing pgTAP test** (`price_alerts.test.sql` — 5 asserções: dono cria alerta; outro usuário não vê alertas alheios; outro usuário não insere alerta em nome do dono (RLS); `triggered_price_alerts()` retorna o alerta quando a mediana comunitária >= threshold (seed: carta no catálogo + user_card com `price_paid` formando mediana); alerta com threshold acima da mediana não é retornado.)
- [x] **Step 2: Run to verify it fails** — `sg docker -c "npx supabase test db"` → FAIL `relation "public.price_alerts" does not exist`.
- [x] **Step 3: Write the migration** (`0012_price_alerts.sql`): tabela + RLS dono (select/insert/delete `user_id = auth.uid()`) + função `language sql stable` (security invoker) juntando `price_alerts` × `price_community` × `cards_catalog`, grants para `authenticated`.
- [x] **Step 4: Apply and verify** — reset + test db → PASS 5/5 novos + suite anterior completa (52 pgTAP total).
- [x] **Step 5: Commit** — `feat: add price alerts table and trigger query function`

---

### Task 2: priceAlertsRepository

**Files:** Create `src/features/premium/priceAlertsRepository.ts` (+ test).

**Interfaces:**
- Produces: `TriggeredPriceAlert { alertId; catalogCardId; cardName; language; thresholdBrl; currentPrice }`; `createPriceAlert(catalogCardId: string, language: string, thresholdBrl: number): Promise<void>` (insert com usuário atual); `listTriggeredPriceAlerts(): Promise<TriggeredPriceAlert[]>` (RPC `triggered_price_alerts`); `removePriceAlert(alertId: string): Promise<void>` (delete por id); erros viram `throw new Error(message)`.

- [ ] Teste `priceAlertsRepository` (4 casos: createPriceAlert insere com usuário atual; listTriggeredPriceAlerts mapeia o retorno do RPC; removePriceAlert deleta pelo id; erro propagado) → red → implementação → green.
- [ ] Commit `feat: add price alerts repository`

---

### Task 3: UI — criar alerta no catálogo (premium) + alertas disparados na aba Valor

**Files:** Modify `app/(tabs)/catalog.tsx`, `app/(tabs)/value.tsx`.

**Interfaces:** Consumes Task 2 + `isPremium()` (Fase 4).

- [ ] Teste de componente do catálogo (RNTL, arquivo `app/(tabs)/catalog.test.tsx`): premium — tocar "Alerta" (testID `price-alert-add-<id>`) abre input de valor (testID `price-alert-threshold`) e confirmar (testID `price-alert-confirm`) chama `createPriceAlert(cardId, "en", valor)`; não-premium — tocar "Alerta" mostra upsell (testID `price-alert-upsell`) e não chama `createPriceAlert`. → red → implementação → green.
- [ ] Teste de componente da aba Valor (estender/criar `app/(tabs)/value.test.tsx`): lista alertas disparados ("<carta> passou de R$ X — atual R$ Y", testID `triggered-alert-<alertId>`); botão remover (testID `triggered-alert-remove-<alertId>`) chama `removePriceAlert` e some da lista. → red → implementação → green.
- [ ] Full suite verde (`npx jest && npx tsc --noEmit`) → Commit `feat: add price alert creation and triggered alerts display`

---

## Self-Review Notes

- **Cobertura do spec:** "Alertas de preço ('avise quando essa carta passar de X')" do bloco premium — criação, disparo por mediana comunitária e exibição in-app.
- **YAGNI:** sem direção "abaixo de", sem histórico de disparos, sem edição de alerta (remover + recriar cobre), sem push.
- **Consistência:** gate premium de UX igual ao progresso por set (Fase 5); RLS dono igual a `user_dismissed_set_releases` (Fase 7); função SQL consultável via RPC igual a `completed_trades_count` (Fase 8); idioma fixo "en" na criação porque o catálogo não expõe seleção de idioma na listagem (mesma simplificação do botão de compra afiliado da Fase 4) — refinável depois.
