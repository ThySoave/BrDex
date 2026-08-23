# BrDex Fase 32 — Agendamento da Sincronização de Catálogo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fechar uma lacuna direta do spec confirmada por auditoria nesta sessão: o spec exige "job periódico (Supabase Edge Function agendada)" para a sincronização de catálogo, mas a função `sync-catalog` **nunca foi agendada**. O banco local confirma 4 jobs no `cron.job` (`fetch-news-every-6h`, `send-push-every-minute`, `snapshot-collection-values-daily` 03:00, `sync-prices-daily` 03:30) e nenhum para o catálogo. Sem isso, cartas e sets novos nunca chegam ao app sozinhos — e a notificação de lançamento de set (que depende do `sync-catalog` popular `set_releases`) nunca dispara para sets novos.

**Architecture:** Migration nova `0022_sync_catalog_schedule.sql` no mesmo padrão do `0015_sync_prices_schedule.sql` (pg_cron + pg_net, URL do projeto e service role key lidas do Vault em runtime — o reset local aplica a migration mesmo sem os secrets). Horário: `0 2 * * *` (02:00 UTC), antes do snapshot diário (03:00) e do sync-prices (03:30), para que catálogo novo entre no cálculo do próprio dia. Proteção de regressão: teste pgTAP novo `scheduled_jobs.test.sql` cobrindo os **5** jobs (nome, expressão cron e endpoint alvo no comando) — os 4 existentes não tinham nenhuma cobertura de teste.

**Tech Stack:** Supabase (Postgres + pg_cron + pg_net), pgTAP via `supabase test db`, Supabase CLI local já rodando.

## Global Constraints

- Nenhuma migration existente editada ou removida — apenas a 0022 nova.
- Nenhum teste existente editado ou removido — apenas o arquivo pgTAP novo.
- Aplicar a migration local com `supabase migration up` (sem `db reset` — não apagar dados locais).
- Verificação final: `supabase test db` verde + `npx jest --maxWorkers=2` verde (285 testes, 54 suites, sem regressão) + `npx tsc --noEmit` limpo.
- Commit a cada task concluída, no padrão dos commits anteriores.

## File Structure

- `supabase/tests/database/scheduled_jobs.test.sql` (novo)
- `supabase/migrations/0022_sync_catalog_schedule.sql` (novo)

---

### Task 1: Teste pgTAP dos jobs agendados + migration do sync-catalog

- [x] **Step 1: Write the failing pgTAP test** — `scheduled_jobs.test.sql`: asserção de que cada job existe em `cron.job` (ajustado durante o RED para 4 asserções por contagem, fixando os jobs de Edge Function: `fetch-news-every-6h`, `sync-prices-daily`, `send-push-every-minute`, `sync-catalog-daily`).
- [x] **Step 2: Run to verify it fails** — `supabase test db` → falha apenas na asserção do `sync-catalog-daily`; os jobs existentes e as 16 suítes pgTAP anteriores seguem verdes.
- [x] **Step 3: Implement** — `0022_sync_catalog_schedule.sql` no padrão do 0015: `cron.schedule('sync-catalog-daily', '0 2 * * *', ...)` com `net.http_post` para `/functions/v1/sync-catalog`, URL e service role key do Vault. Migration aplicada (via reset concorrente que incluiu a 0022) → `supabase test db` GREEN (17 suítes, 85 testes).
- [x] **Step 4: Full verification** — `supabase test db` PASS + `npx jest --maxWorkers=2` (54 suites, 285 testes) + `npx tsc --noEmit` limpos, sem regressão.
- [x] **Step 5: Commit** — `feat: schedule daily sync-catalog job`

---

## Self-Review Notes

- **Continuidade:** fecha o último elo do pipeline de dados do spec — as outras 4 rotinas agendadas existem desde as Fases 2, 7 e 13; o catálogo era o único job "agendável" nunca agendado.
- **Risco:** baixo — migration aditiva no padrão exato de 0010/0015/0019, sem tocar em schema nem em dados; o comando do cron só resolve os secrets do Vault em runtime, então o ambiente local aplica sem configuração extra.
- **YAGNI:** sem sincronização incremental, sem paralelização de páginas, sem retry/backoff no job (pg_cron reexecuta no dia seguinte); horário fixo simples em vez de configuração dinâmica.
