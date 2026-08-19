# BrDex Fase 7 — Feed de Notícias + Notificação de Set Novo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tela inicial (Home) com feed de notícias do mundo Pokémon (agregador RSS de fontes públicas — título, resumo e link para a fonte original, nunca conteúdo completo) e notificação in-app quando um set novo entra no catálogo sincronizado. Ambos gratuitos (motor de crescimento, spec explicitamente proíbe travar atrás de paywall).

**Architecture:** O feed de notícias busca e faz parse de fontes RSS/Atom públicas numa Supabase Edge Function agendada (mesmo padrão de `sync-catalog`), grava título/resumo/link/data/fonte numa tabela `news_items`, e o app só lê essa tabela (nunca faz fetch de RSS no cliente — evita CORS, rate limit e mantém consistência). A notificação de set novo reaproveita a sincronização de catálogo já existente: quando o job de sync insere linhas de `cards_catalog` com um `set_id` que ainda não existia, grava um registro em `set_releases` (idempotente); o app mostra um banner/badge in-app na Home para sets lançados nos últimos N dias que o usuário ainda não "dispensou" (tabela de leitura por usuário, sem push notification — está fora de escopo, é in-app apenas, mesmo padrão da Fase 3 para matches).

**Tech Stack:** Supabase (Postgres + pgTAP + Edge Functions + Deno), Expo/React Native, Jest (preset jest-expo).

## Global Constraints

- **Sem paywall**: feed de notícias e notificação de set novo são 100% grátis — não checar `isPremium()` em nenhum dos dois.
- **Nunca reproduzir conteúdo completo das notícias** — só título, resumo curto (max ~300 chars) e link para a fonte original. Isso é requisito do spec, não flexível.
- **Push notification está fora de escopo** — tudo é in-app (badge/banner na Home), igual ao padrão já usado nos matches da Fase 3.
- **Idempotência**: rodar o job de RSS ou o de sync-catalog múltiplas vezes não deve duplicar `news_items` nem `set_releases` — usar unique constraint + upsert/`on conflict do nothing`.
- npm com `--legacy-peer-deps`; testes JS `npx jest <pattern>`; banco `sg docker -c "npx supabase db reset"` / `sg docker -c "npx supabase test db"`; Edge Functions testadas com Deno test (ver padrão em `supabase/functions/sync-catalog/transform.test.ts`).
- UI em pt-BR.

## File Structure

- `supabase/migrations/0009_news_and_set_releases.sql` — tabelas `news_items`, `set_releases`, `user_dismissed_set_releases`, RLS (leitura pública para news_items e set_releases; dismissed é por dono).
- `supabase/tests/database/news_and_set_releases.test.sql` — pgTAP.
- `supabase/functions/fetch-news/index.ts` + `parse.ts` (+ `parse.test.ts`) — busca RSS/Atom das fontes configuradas, faz parse, upsert em `news_items`.
- `supabase/functions/sync-catalog/index.ts` — modificar: ao terminar o upsert, detectar `set_id` novos (que não existiam antes desta run) e gravar em `set_releases`.
- `src/features/news/newsRepository.ts` (+ test) — `listNews(limit)`.
- `src/features/news/setReleasesRepository.ts` (+ test) — `listUndismissedSetReleases()`, `dismissSetRelease(setReleaseId)`.
- `app/(tabs)/home.tsx` — nova aba Home: banner de sets novos (dispensável) + lista de notícias.
- `app/(tabs)/_layout.tsx` (modificar: registrar aba `home`, primeira posição).

---

### Task 1: Schema — news_items, set_releases, user_dismissed_set_releases

**Files:**
- Create: `supabase/migrations/0009_news_and_set_releases.sql`
- Test: `supabase/tests/database/news_and_set_releases.test.sql`

**Interfaces:**
- Produces: `news_items(id, title, summary, url, source, published_at, created_at)` com unique em `url`; `set_releases(id, set_id, set_name, released_detected_at)` com unique em `set_id`; `user_dismissed_set_releases(user_id, set_release_id, dismissed_at)` com PK composta. Tasks 2–5 usam exatamente esses nomes.

- [x] **Step 1: Write the failing pgTAP test** (`news_and_set_releases.test.sql` — 6 asserções: qualquer usuário autenticado lê `news_items`; insert direto por `authenticated` é bloqueado — só service role escreve; qualquer usuário autenticado lê `set_releases`; usuário só vê/insere seus próprios `user_dismissed_set_releases`; unique em `news_items.url` impede duplicata; unique em `set_releases.set_id` impede duplicata.)
- [x] **Step 2: Run to verify it fails** — `sg docker -c "npx supabase test db"` → FAIL `relation "public.news_items" does not exist`.
- [x] **Step 3: Write the migration** (`0009_news_and_set_releases.sql`): as três tabelas acima; RLS: `news_items` e `set_releases` — select para `authenticated`, nenhum insert/update/delete para `authenticated` (só service role, usado pelas Edge Functions); `user_dismissed_set_releases` — RLS dono (select/insert `user_id = auth.uid()`).
- [x] **Step 4: Apply and verify** — reset + test db → PASS 7/7 novos + suite completa anterior (41 pgTAP total).
- [x] **Step 5: Commit** — `feat: add news_items, set_releases and dismissal tracking tables`

---

### Task 2: Edge Function fetch-news (RSS/Atom → news_items)

**Files:**
- Create: `supabase/functions/fetch-news/index.ts`, `supabase/functions/fetch-news/parse.ts` (+ `parse.test.ts`)

**Interfaces:**
- Consumes: `news_items` (Task 1).
- Produces: função pura `parseFeed(xml: string, sourceName: string): NewsItemInput[]` — `NewsItemInput { title; summary; url; source; publishedAt }`; `summary` truncado a 300 chars (com reticências se cortado), extraído do `<description>`/`<summary>` do feed, tags HTML removidas.

- [x] **Step 1: Write the failing Deno test** (`parse.test.ts` — casos: parse de um RSS 2.0 válido de exemplo (fixture inline); parse de um Atom válido de exemplo; item sem `<description>` usa string vazia; descrição maior que 300 chars é truncada com reticências; tags HTML na descrição são removidas.) Rodar com `deno test supabase/functions/fetch-news/parse.test.ts`.
- [x] **Step 2: Run to verify it fails.**
- [x] **Step 3: Write `parse.ts`** — parser simples de RSS 2.0 e Atom via regex/DOMParser (Deno tem `DOMParser` via `deno_dom` ou parsing manual leve — escolher a opção mais simples sem dependência pesada; se precisar de import externo, usar `esm.sh` como já feito em `sync-catalog`).
- [x] **Step 4: Write `index.ts`** — lista fixa de 3-5 fontes RSS públicas do universo Pokémon TCG em `const FEEDS = [{name, url}, ...]` no topo do arquivo (ex: site oficial Pokémon notícias, blogs de TCG conhecidos — usar fontes que realmente publiquem RSS público; se alguma fonte não tiver RSS público válido, documentar no código e pular); para cada fonte, fetch → parseFeed → upsert em `news_items` com `onConflict: "url", ignoreDuplicates: true`.
- [x] **Step 5: Apply and verify** — `deno test` verde (5/5) + `deno check index.ts` sem erros; invocação local da function não disponível no ambiente, lógica de parse validada isoladamente.
- [x] **Step 6: Commit** — `feat: add fetch-news edge function to populate news feed from RSS sources`

---

### Task 3: sync-catalog — detectar sets novos

**Files:**
- Modify: `supabase/functions/sync-catalog/index.ts`
- Modify/Create: `supabase/functions/sync-catalog/transform.test.ts` (ou novo arquivo de teste dedicado a essa lógica)

**Interfaces:**
- Consumes: `set_releases` (Task 1).
- Produces: dentro do loop de sync, após upsert de `cards_catalog`, extrai `set_id`/`set_name` únicos dos cards da página e faz upsert em `set_releases` com `onConflict: "set_id", ignoreDuplicates: true` — sets já existentes não são reinseridos (idempotente), sets novos aparecem automaticamente na próxima leitura do app.

- [x] **Step 1: Write the failing test** para a função pura que extrai `{set_id, set_name}` únicos de uma lista de cards (mesmo padrão de `mapPokemonTcgCardToRow` em `transform.ts` — adicionar `extractUniqueSets(cards): {setId, setName}[]`).
- [x] **Step 2: Run to verify it fails.**
- [x] **Step 3: Implement `extractUniqueSets` em `transform.ts`**, chamar em `index.ts` após cada upsert de página, fazer upsert em `set_releases` (ignora duplicata).
- [x] **Step 4: Apply and verify** — `deno test` verde (4/4); paginação e upsert de cards inalterados, upsert de set_releases adicionado após o upsert de cada página.
- [x] **Step 5: Commit** — `feat: detect and record new set releases during catalog sync`

---

### Task 4: newsRepository + setReleasesRepository

**Files:** Create `src/features/news/newsRepository.ts` (+ test), `src/features/news/setReleasesRepository.ts` (+ test).

**Interfaces:**
- Produces: `NewsItem { id; title; summary; url; source; publishedAt }`; `listNews(limit = 30): Promise<NewsItem[]>` — select `news_items` order `published_at desc` limit; erro vira `throw new Error(message)`.
- Produces: `SetRelease { id; setId; setName; releasedDetectedAt }`; `listUndismissedSetReleases(): Promise<SetRelease[]>` — select `set_releases` que não têm linha correspondente em `user_dismissed_set_releases` para o usuário atual (join/`not in` subquery), order `released_detected_at desc`, limit razoável (ex: 10); `dismissSetRelease(setReleaseId: string): Promise<void>` — insert em `user_dismissed_set_releases` com o usuário atual.

- [x] Teste `newsRepository` (2 casos: listNews mapeado corretamente; erro propagado) → red → implementação → green.
- [x] Teste `setReleasesRepository` (3 casos: listUndismissedSetReleases mapeado; dismissSetRelease insere corretamente; erro propagado) → red → implementação → green.
- [x] Commit `feat: add news and set releases repositories`

---

### Task 5: Aba Home — feed de notícias + banner de sets novos

**Files:** Create `app/(tabs)/home.tsx`; Modify `app/(tabs)/_layout.tsx`.

**Interfaces:** Consumes Task 4.

- [ ] Tela `home.tsx`: `useFocusEffect` recarrega `listNews()` e `listUndismissedSetReleases()`; topo mostra banner/card por set novo não dispensado ("Novo set: <nome>!" + botão "Ok, entendi" que chama `dismissSetRelease` e remove da lista local); abaixo, `FlatList` das notícias (`title`, `summary`, fonte, e ao tocar abre `url` externo via `Linking.openURL`); empty state para quando não há notícias ainda (ex: antes da primeira execução do `fetch-news`); testID `home-news-list` e `home-set-release-banner-<id>` para testabilidade.
- [ ] Registrar `<Tabs.Screen name="home" options={{ title: "Início" }} />` como **primeira** aba (antes de `album`), já que é a tela inicial pós-login.
- [ ] Teste de componente (RNTL) cobrindo: renderiza lista de notícias; renderiza banner de set novo e some ao tocar "Ok, entendi"; abre link externo ao tocar num item.
- [ ] Full suite verde (`npx jest && npx tsc --noEmit`) → Commit `feat: add home tab with news feed and new set release banner`

---

### Task 6: Configurar agendamento do fetch-news (pg_cron / Supabase schedule)

**Files:** Modify: `supabase/migrations/0009_news_and_set_releases.sql` (ou nova migration `0010_fetch_news_schedule.sql`, seguir o padrão já usado para o schedule de `sync-catalog`/snapshots na Fase 2 — ver `0003_collection_value_snapshots.sql` como referência de como esse projeto já agenda jobs via `pg_cron`).

**Interfaces:** Consumes Task 2.

- [ ] Verificar como o agendamento de `sync-catalog` foi feito (documentação/migration existente) e replicar o mesmo padrão para `fetch-news`, com frequência razoável (ex: a cada 6h — notícias não mudam a cada minuto).
- [ ] Apply and verify — `sg docker -c "npx supabase db reset"` sem erros, job aparece listado em `cron.job` (se aplicável ao ambiente local).
- [ ] Commit `feat: schedule fetch-news edge function via pg_cron`

---

## Self-Review Notes

- **Cobertura do spec:** feed de notícias (RSS, título+resumo+link, nunca conteúdo completo) → Tasks 2/4/5; notificação de lançamento de set novo (usa sync de catálogo existente, in-app não push) → Tasks 3/4/5; ambos gratuitos, sem checagem de `isPremium()` em nenhum lugar → Global Constraints.
- **Idempotência:** `news_items.url` unique + `ignoreDuplicates`; `set_releases.set_id` unique + `ignoreDuplicates` — rodar os jobs várias vezes não duplica nem notifica de novo quem já dispensou.
- **YAGNI:** sem push notification (fora de escopo, in-app apenas); sem categorização/tags de notícia; sem paginação infinita no feed (limit fixo de 30 é suficiente por ora); sem edição/curadoria manual de fontes RSS pela UI (lista fixa no código, ajustável depois se necessário).
- **Consistência com padrões existentes:** Edge Function agendada segue o mesmo modelo de `sync-catalog` (Fase 1) e do cron de snapshots (Fase 2); banner dispensável segue o mesmo padrão de "estado por usuário" já usado em `blocks`/`matches` (Fase 3).
