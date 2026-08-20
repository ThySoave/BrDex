# BrDex Fase 12 — Job de Preço de Referência Internacional (TCGplayer/EN) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fechar a lacuna de arquitetura do spec ("Preços de referência internacional: job periódico separado, só para cartas em inglês, puxando da TCGplayer ... e convertendo para R$ na hora de gravar"): a tabela `price_reference` (Fase 2) é exibida no app (`pricingRepository`, rótulo "referência internacional", só EN) mas **nenhum job a popula hoje**. Esta fase cria a Edge Function `sync-prices` que grava esses preços.

**Architecture:** A Pokémon TCG API (pokemontcg.io, já usada pelo `sync-catalog`) embute `tcgplayer.prices` por carta — não é preciso integrar a API da TCGplayer diretamente (o aviso de licenciamento do spec segue valendo para produção; o dado chega pela mesma API já em uso). O job pagina `/v2/cards` pedindo só `id` e `tcgplayer` (`select=`), extrai o preço "market" USD (função pura em `transform.ts`), converte para BRL com a taxa da env `USD_BRL_RATE` e grava via função SQL `upsert_reference_price(external_id, language, price_brl, source)` — security definer, executável **só pelo service role**, que resolve `external_id → catalog_card_id` e faz upsert em `price_reference` (unique `(catalog_card_id, language)` já existe). Agendamento diário via pg_cron + pg_net (mesmo padrão do `fetch-news`, migration `0010`).

**Tech Stack:** Supabase (Postgres + pgTAP + Edge Functions + Deno), Jest não é tocado.

## Global Constraints

- Só `language = 'en'` — PT/JP ficam sem âncora externa (decisão consciente do spec).
- `upsert_reference_price` não pode ser executável por `authenticated` (preço de referência é escrito só pelo job) — revoke explícito.
- Carta desconhecida no catálogo (external_id sem match) é ignorada sem erro (catálogo pode estar uma sync atrás).
- Idempotência: rodar o job N vezes atualiza `price_brl`/`captured_at`, nunca duplica linha.
- Banco: `sg docker -c "npx supabase db reset"` / `sg docker -c "npx supabase test db"`; Deno: `deno test supabase/functions/sync-prices/transform.test.ts` e `deno check supabase/functions/sync-prices/index.ts`.

## File Structure

- `supabase/migrations/0014_upsert_reference_price.sql` — função SQL + grants.
- `supabase/tests/database/upsert_reference_price.test.sql` — pgTAP.
- `supabase/functions/sync-prices/transform.ts` (+ `transform.test.ts`) — extração/conversão puras.
- `supabase/functions/sync-prices/index.ts` — job (paginação + RPC).
- `supabase/migrations/0015_sync_prices_schedule.sql` — agendamento pg_cron.

---

### Task 1: Função SQL upsert_reference_price

**Files:**
- Create: `supabase/migrations/0014_upsert_reference_price.sql`
- Test: `supabase/tests/database/upsert_reference_price.test.sql`

**Interfaces:**
- Produces: `upsert_reference_price(p_external_id text, p_language public.card_language, p_price_brl numeric, p_source text) returns boolean` — `true` se gravou/atualizou, `false` se `external_id` desconhecido; security definer; execute só service role.

- [x] **Step 1: Write the failing pgTAP test** (`upsert_reference_price.test.sql` — 5 asserções: insere linha nova em `price_reference` com preço e fonte; chamada repetida atualiza `price_brl` sem duplicar (count continua 1); external_id desconhecido retorna `false` e não insere; `authenticated` não consegue executar a função (throws permission denied); linha gravada tem `language = 'en'` e `catalog_card_id` resolvido corretamente.)
- [x] **Step 2: Run to verify it fails** — `sg docker -c "npx supabase test db"` → FAIL `function ... does not exist`.
- [x] **Step 3: Write the migration** (`0014_upsert_reference_price.sql` — renomeada de 0013 para evitar colisão com `0013_market_search.sql`, trabalho paralelo não commitado encontrado no working tree).
- [x] **Step 4: Apply and verify** — reset + test db → PASS 6/6 novos + suite completa (64 pgTAP, incluindo market_search paralelo).
- [x] **Step 5: Commit** — `feat: add upsert_reference_price function for external price sync`

---

### Task 2: transform.ts (extração e conversão puras)

**Files:** Create `supabase/functions/sync-prices/transform.ts` (+ `transform.test.ts`).

**Interfaces:**
- Produces: `extractTcgplayerMarketUsd(card): number | null` — pega `card.tcgplayer.prices.<variant>.market` na ordem de preferência `normal` → `holofoil` → `reverseHolofoil` → primeira variante disponível; `null` se não houver tcgplayer/prices/market. `toBrl(usd: number, rate: number): number` — arredondado a 2 casas.

- [ ] **Step 1: Write the failing Deno test** (5 casos: usa `normal.market`; cai para `holofoil.market` quando não há normal; usa a primeira variante disponível quando não há normal/holofoil/reverse; retorna `null` sem bloco tcgplayer ou sem market; `toBrl(10, 5.25) === 52.5` e arredonda 2 casas.)
- [ ] **Step 2: Run to verify it fails.**
- [ ] **Step 3: Implement `transform.ts`** → `deno test` verde.
- [ ] **Step 4: Commit** — `feat: add tcgplayer price extraction and BRL conversion helpers`

---

### Task 3: Edge Function sync-prices (index.ts)

**Files:** Create `supabase/functions/sync-prices/index.ts`.

**Interfaces:** Consumes Tasks 1–2. Pagina `https://api.pokemontcg.io/v2/cards?select=id,tcgplayer&page=N&pageSize=250` (mesmo header de API key do `sync-catalog`); lê `USD_BRL_RATE` da env (sem valor → responde 500 explicando a config, não grava nada); para cada carta com preço extraível, chama `supabase.rpc("upsert_reference_price", { p_external_id, p_language: "en", p_price_brl, p_source: "tcgplayer" })`; responde `{ upserted, skipped }`.

- [ ] Implementar `index.ts` seguindo o padrão de `sync-catalog`; verificar com `deno check supabase/functions/sync-prices/index.ts` (sem teste de rede — a lógica testável está toda em `transform.ts`/Task 1).
- [ ] Commit `feat: add sync-prices edge function to populate reference prices`

---

### Task 4: Agendamento diário

**Files:** Create `supabase/migrations/0015_sync_prices_schedule.sql`.

- [ ] Migration com pg_cron + pg_net chamando `/functions/v1/sync-prices` 1×/dia (ex: `30 3 * * *`, após o snapshot diário), URL/service key via Vault — mesmo padrão de `0010_fetch_news_schedule.sql`.
- [ ] Apply and verify — reset sem erros; job `sync-prices-daily` listado em `cron.job`; suite pgTAP completa verde.
- [ ] Commit `feat: schedule sync-prices edge function via pg_cron`

---

## Self-Review Notes

- **Cobertura do spec:** seção Arquitetura ("job periódico separado" para preço de referência) + modelo de dados (`price_reference` "Populado hoje só para idioma = EN via TCGplayer") — era a única peça de backend do spec ainda sem implementação local viável.
- **Risco de licenciamento (spec):** segue documentado — o dado vem da Pokémon TCG API já usada; a confirmação formal com a TCGplayer continua sendo pré-requisito de produção, não de implementação.
- **YAGNI:** sem conversão cambial automática (env `USD_BRL_RATE` configurada no deploy; um job de câmbio seria outra dependência externa), sem preços PT/JP (sem fonte), sem histórico de referência (só o valor atual, como a tabela já modela).
- **Consistência:** função security definer com revoke igual a `confirm_trade` (Fase 8); Edge Function paginada igual a `sync-catalog` (Fase 1); agendamento igual a `0010` (Fase 7).
