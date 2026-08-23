# BrDex Fase 32 — Alertas Proativos e Catálogo Agendado — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auditoria spec × código nesta sessão confirmou duas lacunas reais no backend, ambas do tipo "o app só avisa se o usuário abrir a tela":

1. **`sync-catalog` não é agendado.** O spec exige "job periódico (Supabase Edge Function agendada) busca da Pokémon TCG API" — mas, diferente de `fetch-news` (0010), `sync-prices` (0015) e `send-push` (0019), não existe migration de `cron.schedule` para o `sync-catalog`. Sem ela, o catálogo nunca atualiza sozinho e a notificação de set novo (que depende do `set_releases` populado pelo sync) nunca dispara em produção.
2. **Alertas de preço são só pull.** O spec promete "avise quando essa carta passar de X", mas `triggered_price_alerts()` (0012) é apenas consultada quando o usuário abre a aba Valor. A infraestrutura de push (fila `notification_queue` 0018 + `send-push` agendada 0019) já existe e não é usada pelos alertas.

**Architecture:** Só banco — nenhuma mudança de app. Task 1: migration `0022` com `cron.schedule` do `sync-catalog`, espelhando o padrão de 0015 (pg_cron + pg_net, URL e service role key do Vault), + teste pgTAP novo cobrindo os jobs agendados via `cron.job`. Task 2: migration `0023` que adiciona `notified_at` em `price_alerts`, cria `process_price_alert_notifications()` (security definer) que (a) re-arma alertas cujo preço voltou abaixo do limiar e (b) enfileira em `notification_queue` (tipo `price_alert`) os alertas disparados ainda não notificados, marcando `notified_at` na mesma instrução (CTE `update ... returning` → `insert`), e agenda a função via pg_cron diário após o `sync-prices` — sem pg_net, é SQL puro. Dedupe por `notified_at`: um alerta só notifica de novo depois de re-armar (preço caiu abaixo do limiar e cruzou de novo).

**Tech Stack:** Supabase local (Postgres + pgTAP via `supabase test db`), migrations SQL, pg_cron.

## Global Constraints

- Nenhum teste nem migration existente é editado — só arquivos novos (`0022`, `0023`, testes pgTAP novos).
- Mensagem de push em pt-BR, corpo sem dado sensível (mesmo cuidado do 0018).
- `notification_queue` continua inacessível a clientes; escrita só via security definer.
- Paridade com `triggered_price_alerts()`: sem checagem extra de premium na função (o gate de premium é na criação do alerta, como hoje).
- Verificação de banco: `supabase db reset && supabase test db`. Verificação final da fase: suíte JS intocada (`npx jest --maxWorkers=2 && npx tsc --noEmit`) verde.
- Commit a cada task concluída, no padrão dos commits anteriores.

## File Structure

- Task 1: `supabase/migrations/0022_sync_catalog_schedule.sql`, `supabase/tests/database/scheduled_jobs.test.sql`.
- Task 2: `supabase/migrations/0023_price_alert_push.sql`, `supabase/tests/database/price_alert_push.test.sql`.

---

### Task 1: Agendar o sync-catalog (0022)

- [ ] **Step 1: Write the failing pgTAP test** — `scheduled_jobs.test.sql`: asserts de que `cron.job` contém os 4 jobs de function (`fetch-news`, `sync-prices`, `send-push` e o novo `sync-catalog-daily`) — documenta o conjunto completo e falha só no novo.
- [ ] **Step 2: Run to verify it fails** — `supabase db reset && supabase test db` → só o assert do `sync-catalog-daily` falha.
- [ ] **Step 3: Implement** — `0022_sync_catalog_schedule.sql` no padrão exato do 0015 (job `sync-catalog-daily`, diário antes do sync-prices, POST via pg_net com URL/key do Vault) → GREEN.
- [ ] **Step 4: Commit** — `feat: schedule daily sync-catalog job`

---

### Task 2: Push de alertas de preço (0023)

- [ ] **Step 1: Write the failing pgTAP test** — `price_alert_push.test.sql` (seed no estilo de `price_alerts.test.sql`): (a) `process_price_alert_notifications()` enfileira 1 notificação `type=price_alert` para o dono do alerta disparado; (b) alerta abaixo do limiar não enfileira; (c) segunda execução não duplica (`notified_at` marcado); (d) preço abaixo do limiar re-arma (`notified_at` volta a null) e novo cruzamento notifica de novo; (e) cliente autenticado continua sem ler a fila.
- [ ] **Step 2: Run to verify it fails** — `supabase db reset && supabase test db` → testes novos falham (função não existe), existentes verdes.
- [ ] **Step 3: Implement** — `0023_price_alert_push.sql`: coluna `notified_at`, função `process_price_alert_notifications()` (re-arme + CTE update/insert), `cron.schedule` diário após o sync-prices chamando a função direto (sem pg_net) → GREEN.
- [ ] **Step 4: Full verification** — `supabase db reset && supabase test db` verdes; `npx jest --maxWorkers=2 && npx tsc --noEmit` verdes (app intocado).
- [ ] **Step 5: Commit** — `feat: push notifications for triggered price alerts`

---

## Self-Review Notes

- **Prioridade:** fecha o requisito arquitetural explícito do spec (catálogo agendado) e transforma o recurso premium "alertas de preço" no que o spec promete ("avise quando…"), reusando a fila e o job de push já existentes — custo mínimo, valor direto.
- **Risco:** baixo — migrations aditivas; nenhum caminho de app muda. O teste de `cron.job` fixa o conjunto de jobs e pega regressão de agendamento no reset local.
- **YAGNI:** sem histerese configurável, sem frequência por alerta, sem checagem de premium na notificação (paridade com a função pull existente), sem UI nova — o push chega pelo canal já implementado na Fase 13.
