# BrDex Fase 11 — Selo de Verificado nos Matches (Premium) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Assinantes premium ganham "selo de verificado" visível para os outros e prioridade na listagem de matches (spec bloco premium: "Selo de verificado / prioridade nos resultados de busca"). Quem vê um match com usuário verificado ganha confiança extra — complementa a reputação da Fase 8.

**Architecture:** Nenhuma migration: a função `is_premium(uid)` (Fase 4, security definer, execute default para PUBLIC) já é chamável via RPC por qualquer autenticado — verificado = assinatura premium ativa. Cliente: `isUserVerified(userId)` em `entitlementsRepository`; `matches.tsx` consulta o selo dos usuários dos matches, exibe badge e ordena verificados primeiro.

**Tech Stack:** Expo/React Native, Jest (preset jest-expo). Sem mudanças de banco.

## Global Constraints

- Verificado = premium ativo (`is_premium`) — sem tabela nova, sem processo manual de verificação (YAGNI; se um processo de KYC vier depois, troca-se a fonte da flag num único lugar).
- Prioridade: matches de usuários verificados aparecem primeiro, ordem original preservada entre iguais.
- npm com `--legacy-peer-deps`; testes JS `npx jest <pattern>`.
- UI em pt-BR.

## File Structure

- `src/features/premium/entitlementsRepository.ts` — adicionar `isUserVerified(userId: string): Promise<boolean>` (+ estender test).
- `app/(tabs)/matches.tsx` — modificar: badge "Verificado" + ordenação.
- `app/(tabs)/matches.test.tsx` — teste de componente (RNTL) novo.

---

### Task 1: isUserVerified no entitlementsRepository

**Files:** Modify `src/features/premium/entitlementsRepository.ts` (+ estender `entitlementsRepository.test.ts`).

**Interfaces:**
- Produces: `isUserVerified(userId: string): Promise<boolean>` — RPC `is_premium` com `{ uid: userId }`; erro → `false` (selo é informativo, nunca deve quebrar a listagem).

- [x] Teste (2 casos: retorna o boolean do RPC chamado com `{ uid }`; erro do RPC vira `false`) → red → implementação → green.
- [x] Commit `feat: add user verification check via is_premium rpc`

---

### Task 2: Badge e prioridade nos matches

**Files:** Modify `app/(tabs)/matches.tsx`; Create `app/(tabs)/matches.test.tsx`.

**Interfaces:** Consumes Task 1.

- [x] Teste de componente (RNTL, mockando `matchesRepository`, `chatRepository`, `entitlementsRepository` e `expo-router`): match de usuário verificado mostra badge (testID `verified-badge-<matchId>`); match de usuário não verificado não mostra; com dois matches (não-verificado primeiro na resposta), o verificado aparece primeiro na lista renderizada. → red
- [x] Implementar: após `listMatches()`, resolver `isUserVerified` por `otherUserId` único (`Promise.all`), guardar mapa `userId -> boolean`, ordenar verificados primeiro (estável) e renderizar badge "Verificado". → green
- [x] Full suite verde (`npx jest && npx tsc --noEmit` — 90 testes, 33 suites) → Commit `feat: show verified badge and prioritize verified users in matches`

---

## Self-Review Notes

- **Cobertura do spec:** "Selo de verificado / prioridade nos resultados de busca" — aplicado à superfície de busca/descoberta que existe hoje (lista de matches).
- **YAGNI:** sem tabela de verificação manual, sem selo em outras telas (chat já mostra reputação real da Fase 8), sem cache além do estado da tela.
- **Consistência:** RPC de função SQL existente igual às Fases 8/9; teste de componente igual a `matches`-adjacentes (`home.test.tsx`, `catalog.test.tsx`).
- **Fim do escopo local:** após esta fase, o que resta do spec exige infraestrutura externa (scanner por foto com ML, push notifications, pagamento real da assinatura, API B2B de preços) — fora do alcance de implementação local.
