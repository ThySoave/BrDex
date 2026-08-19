# BrDex Fase 6 — Calendário de Encontros — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Calendário de encontros/feiras de troca locais (spec, Recursos adicionais — grátis, motor de crescimento): qualquer usuário publica um encontro (título, cidade, data, descrição) e todos veem os encontros futuros.

**Architecture:** Tabela `meetups` no Postgres com RLS — leitura para qualquer autenticado (evento é público por natureza), escrita só do próprio registro (criador pode inserir/apagar o que criou), mesmo padrão de RLS das fases anteriores. Repository fino + tela nova no app. Sem push/geolocalização — a lista filtra por data futura no servidor e o usuário filtra cidade de vista.

**Tech Stack:** Supabase (Postgres + pgTAP), Expo/React Native, Jest (preset jest-expo).

## Global Constraints

- Encontros passados não aparecem na listagem (filtro `starts_at >= now()` na query do repository).
- Sem edição de encontro no lançamento (criar/apagar bastam; editar é YAGNI).
- Sem moderação prévia — denúncia/bloqueio da Fase 3 já cobrem abuso entre usuários.
- npm com `--legacy-peer-deps`; testes JS `npx jest <pattern>`; banco `sg docker -c "npx supabase db reset"` / `sg docker -c "npx supabase test db"`.
- UI em pt-BR.

## File Structure

- `supabase/migrations/0008_meetups.sql` — tabela `meetups` + RLS.
- `supabase/tests/database/meetups.test.sql` — pgTAP de RLS.
- `src/features/meetups/meetupsRepository.ts` (+ test) — `listUpcomingMeetups()`, `createMeetup()`.
- `app/(tabs)/meetups.tsx` — tela "Encontros" registrada em `app/(tabs)/_layout.tsx`.

---

### Task 1: Schema meetups com RLS

**Files:**
- Create: `supabase/migrations/0008_meetups.sql`
- Test: `supabase/tests/database/meetups.test.sql`

**Interfaces:**
- Produces: `meetups(id uuid pk default, created_by uuid not null → auth.users on delete cascade, title text not null, city text not null, starts_at timestamptz not null, description text, created_at timestamptz default now())`. RLS: select para authenticated (todos); insert para authenticated com `auth.uid() = created_by`; delete só do criador. Grants select/insert/delete para authenticated.

- [x] **Step 1: Write the failing pgTAP test** (`meetups.test.sql` — 4 asserções: criador insere o próprio encontro; outro usuário autenticado lê o encontro; insert com `created_by` de outro usuário falha (42501); delete por quem não criou não remove a linha).
- [x] **Step 2: Run to verify it fails** — `sg docker -c "npx supabase test db"` → FAIL `relation "meetups" does not exist`.
- [x] **Step 3: Write the migration** (`0008_meetups.sql`).
- [x] **Step 4: Apply and verify** — reset + test db → PASS novos + 30 anteriores.
- [x] **Step 5: Commit** — `feat: add meetups table with owner-write RLS`

---

### Task 2: meetupsRepository

**Files:** Create `src/features/meetups/meetupsRepository.ts` (+ test).

**Interfaces:** Produces `Meetup { id, title, city, startsAt, description }`; `listUpcomingMeetups(): Promise<Meetup[]>` — `client.from("meetups").select(...).gte("starts_at", <agora ISO>).order("starts_at")`, mapeia snake_case → camelCase, erro vira `throw new Error(message)`; `createMeetup(input: { title, city, startsAt, description }): Promise<void>` — insere com `created_by = user.id`, sem usuário lança `Error("Usuário não autenticado")`.

- [ ] Teste (3 casos: lista mapeada com filtro/ordenação; erro propagado; createMeetup insere com created_by do usuário logado) → red → implementação → green.
- [ ] Commit `feat: add meetups repository`.

---

### Task 3: Tela Encontros

**Files:** Create `app/(tabs)/meetups.tsx`; Modify `app/(tabs)/_layout.tsx`.

**Interfaces:** Tela com `FlatList` `testID="meetups-list"` dos encontros futuros (cada item `testID="meetup-<id>"`, mostra título, cidade e data em pt-BR) e formulário simples (inputs `meetup-title`, `meetup-city`, `meetup-date` + `Pressable` `testID="meetup-create"` "Publicar encontro") que chama `createMeetup` e recarrega a lista. Aba "Encontros" registrada no layout.

- [ ] Tela criada + aba registrada, seguindo o padrão das telas existentes.
- [ ] Verificação completa: `npx jest && npx tsc --noEmit` e `sg docker -c "npx supabase test db"` — tudo verde.
- [ ] Commit `feat: add meetups tab with upcoming events and creation form`.

---

## Self-Review Notes

- **Cobertura do spec:** calendário de encontros era o último recurso do spec sem dependência externa. Restam apenas: notícias RSS e push de set novo (fontes/infra externas), scanner/PDF/selo (serviços externos), reputação (exige fluxo de negociação concluída inexistente) e alertas de preço (exige mecanismo de notificação que o app ainda não tem).
- **YAGNI:** sem edição, sem geolocalização, sem RSVP/confirmação de presença — lista e formulário cumprem o recurso do spec.
- **Padrões:** RLS owner-write + repository fino + tela com testIDs idênticos aos padrões das Fases 1–5.
