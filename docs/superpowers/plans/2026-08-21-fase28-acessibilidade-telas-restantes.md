# BrDex Fase 28 — Acessibilidade nas Telas Restantes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Fase 27 anotou os fluxos críticos (álbum, chat, matches, wishlist). Escopo restante confirmado por grep nesta sessão: **11 telas com zero `accessibilityRole`** (28 `Pressable`) + 2 sobras no próprio chat (estrelas de avaliação e "Confirmar troca", que ficaram fora do recorte da 27): `login` (2), `signup` (1), `home` (2), `catalog` (8), `market` (3), `meetups` (1), `value` (1), `profile` (1), `user/[userId]` (2), `card/add` (5), `card/scan` (2). Mesmo padrão da Fase 27: `accessibilityRole="button"` em todo `Pressable` interativo, `accessibilityLabel` quando o texto filho não descreve a ação sozinho (botões por item com o nome do item; estrelas com "Avaliar com N estrelas"). O container de long-press do álbum permanece sem role (decisão documentada na Fase 27).

**Architecture:** Só props de acessibilidade — zero mudança de comportamento/visual. TDD por grupo de telas: testes RNTL por role estendendo os arquivos de teste existentes (todas as 11 telas já têm suite), RED antes (nenhum role hoje), GREEN depois.

**Tech Stack:** Expo/React Native (`expo-router`), Jest (preset jest-expo) + RNTL (queries por role).

## Global Constraints

- Nenhum teste existente editado ou removido — apenas casos novos.
- Rótulos em pt-BR coerentes com o texto visível; seleções por item (idioma/condição/status no add, opções no catálogo) recebem role sem label extra (o texto filho já descreve).
- Testes `npx jest <pattern>`; verificação final `npx jest --maxWorkers=2 && npx tsc --noEmit`.
- Se alguma tela se mostrar de alto risco/baixo valor durante o trabalho, parar e documentar aqui (instrução do usuário).

## File Structure

- Task 1 (conta e perfis): `app/(auth)/login.tsx`, `app/(auth)/signup.tsx`, `app/(tabs)/profile.tsx`, `app/user/[userId].tsx` (+ testes respectivos).
- Task 2 (catálogo e cartas): `app/(tabs)/catalog.tsx`, `app/card/add.tsx`, `app/card/scan.tsx` (+ testes).
- Task 3 (demais abas + sobras do chat): `app/(tabs)/home.tsx`, `app/(tabs)/market.tsx`, `app/(tabs)/meetups.tsx`, `app/(tabs)/value.tsx`, `app/chat/[conversationId].tsx` (+ testes).

---

### Task 1: Conta e perfis (login, signup, profile, user)

- [x] **Step 1: Write the failing RNTL tests** (um caso por tela via `getByRole`/`findByRole` — entrar/entrar com Google; criar conta; sair da conta; denunciar/bloquear no perfil público.)
- [x] **Step 2: Run to verify it fails** — `npx jest login.test signup profile.test user-profile` → FAIL (4 falhas, uma por suite).
- [x] **Step 3: Implement** as props (6 Pressables) → GREEN (28/28) sem editar testes existentes.
- [x] **Step 4: Commit** — `feat: add accessibility roles to account screens`

---

### Task 2: Catálogo e cartas (catalog, add, scan)

- [ ] **Step 1: Write the failing RNTL tests** (casos: quero/comprar/alerta por carta no catálogo (labels com o nome da carta), painel de idioma como botões; seleções e salvar no add; escanear/confirmar no scan.)
- [ ] **Step 2: Run to verify it fails** — `npx jest catalog add.test scan` → FAIL.
- [ ] **Step 3: Implement** as props → GREEN sem editar testes existentes.
- [ ] **Step 4: Commit** — `feat: add accessibility roles to catalog and card screens`

---

### Task 3: Demais abas e sobras do chat (home, market, meetups, value, chat)

- [ ] **Step 1: Write the failing RNTL tests** (um caso por tela; chat: estrelas como botões "Avaliar com N estrelas" e "Confirmar troca".)
- [ ] **Step 2: Run to verify it fails** — `npx jest home market meetups.test value chat.test` → FAIL.
- [ ] **Step 3: Implement** as props → GREEN sem editar testes existentes.
- [ ] **Step 4: Full suite** — `npx jest --maxWorkers=2 && npx tsc --noEmit` verdes.
- [ ] **Step 5: Commit** — `feat: add accessibility roles to remaining screens`

---

## Self-Review Notes

- **Continuidade:** extensão direta da Fase 27, pedida explicitamente; escopo confirmado por grep (não estimado).
- **Risco:** baixíssimo — só props; rede de proteção são as 54 suites existentes intactas.
- **Coordenação:** `git status` e `ls docs/superpowers/plans/` conferidos na hora — sem colisão.
- **YAGNI:** sem varredura WCAG formal, sem refactor; imagens de catálogo/market recebem label apenas onde já há nome da carta disponível no item.
