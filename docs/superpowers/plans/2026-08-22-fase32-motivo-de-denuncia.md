# BrDex Fase 32 — Motivo de Denúncia — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fechar uma lacuna direta do spec na parte **obrigatória** da Fase 3 (denúncia/bloqueio): o spec exige que a "denúncia registra **motivo** e contexto", mas hoje os dois pontos de denúncia (chat e perfil) gravam um motivo genérico hardcoded ("denúncia feita a partir do chat/perfil") — o usuário nunca informa o motivo real, o que esvazia o valor de moderação do registro. Esta fase adiciona a escolha de motivo (lista fixa, mesmo padrão da escala de conservação: opções pré-definidas, não texto livre) antes de enviar a denúncia, nas duas telas.

**Architecture:** Sem migration — a coluna `reports.reason` já existe e aceita o rótulo escolhido; o `context` continua identificando a origem (`perfil <id>` / `conversa <id>`). Novo módulo compartilhado `src/features/social/reportReasons.ts` com `REPORT_REASONS: { value, label }[]` (mesmo padrão de `LANGUAGE_OPTIONS`/`STATUS_OPTIONS` em `src/features/collection/labels.ts`, consolidado na Fase 26). Na UI, o press em "Denunciar" deixa de enviar direto e passa a exibir o seletor inline de motivos (`Pressable` por motivo, `testID="report-reason-<value>"` — mesmo padrão inline usado no alerta de preço do catálogo, sem modal novo); o press num motivo chama `reportUser(id, label, context)` e mantém os `Alert` de sucesso/erro atuais. `safetyRepository.reportUser` não muda.

**Tech Stack:** Expo/React Native (`expo-router`), Jest (preset jest-expo) + RNTL.

## Global Constraints

- Mudança de comportamento exigida pelo spec: as asserções existentes que fixam o motivo hardcoded e o envio direto no press de "Denunciar" (em `user-profile.test.tsx` e `chat.test.tsx`) são **atualizadas para o novo fluxo** — nenhum teste é removido, e os demais testes existentes não são editados.
- Motivos em pt-BR, lista fixa compartilhada entre as duas telas (nada de texto livre — mesmo racional da escala de conservação: padronizar o dado).
- `testID`s no padrão `report-reason-<value>`; seletor com rótulo "Qual o motivo da denúncia?".
- Testes: press com `await act` (RNTL + React 19); repositório `safetyRepository` mockado como nos testes atuais.
- Testes `npx jest <pattern>`; verificação final `npx jest --maxWorkers=2 && npx tsc --noEmit`.
- Commit a cada task concluída, no padrão dos commits anteriores.

## File Structure

- Task 1 (módulo compartilhado): `src/features/social/reportReasons.ts` + `src/features/social/reportReasons.test.ts`.
- Task 2 (perfil): `app/user/[userId].tsx` + `app/user/user-profile.test.tsx`.
- Task 3 (chat): `app/chat/[conversationId].tsx` + `app/chat/chat.test.tsx`.

---

### Task 1: Módulo compartilhado de motivos de denúncia

- [x] **Step 1: Write the failing test** — `reportReasons.test.ts`: `REPORT_REASONS` expõe exatamente os motivos `golpe` ("Golpe ou fraude"), `ofensa` ("Comportamento ofensivo"), `spam` ("Spam ou propaganda"), `perfil_falso` ("Perfil falso"), `outro` ("Outro"), nessa ordem, cada um com `value` e `label` não vazios e `value`s únicos.
- [x] **Step 2: Run to verify it fails** — `npx jest reportReasons` → falha por módulo inexistente.
- [x] **Step 3: Implement** — `src/features/social/reportReasons.ts` no mesmo padrão de `labels.ts` (array tipado `{ value: ReportReason; label: string }[]`) → GREEN.
- [x] **Step 4: Commit** — `feat: add shared report reasons module`

---

### Task 2: Seleção de motivo na denúncia pelo perfil

- [x] **Step 1: Write/adjust the failing RNTL tests** — em `user-profile.test.tsx`: (a) novo caso: press em `report-user` **não** chama `reportUser` e exibe o seletor com os 5 motivos (`report-reason-golpe` … `report-reason-outro`); (b) atualizar o caso "reports the user from the profile": press em `report-user` → press em `report-reason-golpe` → `reportUser` chamado com `(userId, "Golpe ou fraude", "perfil <id>")` e `Alert` de sucesso; (c) atualizar o caso de falha ("alerts when reporting fails") para o novo fluxo em dois passos.
- [x] **Step 2: Run to verify it fails** — `npx jest user-profile` → casos novos/atualizados falham, demais verdes (3 falhas, 6 verdes).
- [x] **Step 3: Implement** — estado `choosingReason: boolean` em `app/user/[userId].tsx`; press em "Denunciar usuário" alterna o seletor; press num motivo fecha o seletor e chama `reportUser` com o `label` escolhido → GREEN (9/9).
- [x] **Step 4: Commit** — `feat: add report reason picker to user profile`

---

### Task 3: Seleção de motivo na denúncia pelo chat

- [x] **Step 1: Write/adjust the failing RNTL tests** — em `chat.test.tsx`: mesmo padrão do perfil — press em `chat-report` exibe o seletor sem chamar `reportUser`; press em `report-reason-spam` chama `reportUser(other, "Spam ou propaganda", "conversa <id>")` e exibe o `Alert` de sucesso (casos aditivos — nenhum teste do chat pressionava a denúncia).
- [x] **Step 2: Run to verify it fails** — `npx jest chat.test` → casos novos falham, existentes verdes (2 falhas, 10 verdes).
- [x] **Step 3: Implement** — mesmo padrão do perfil em `app/chat/[conversationId].tsx` → GREEN (12/12).
- [x] **Step 4: Full suite** — `npx jest --maxWorkers=2 && npx tsc --noEmit` verdes (55 suites, 290 testes).
- [x] **Step 5: Commit** — `feat: add report reason picker to chat`

---

## Self-Review Notes

- **Rastreabilidade ao spec:** "denúncia registra motivo e contexto" (Fluxos, denúncia/bloqueio obrigatórios da Fase 3) — o motivo passa a ser informado pelo usuário; o contexto (origem) já era gravado e permanece.
- **Risco:** baixo — sem migration, sem mudança no repositório; só UI + módulo de rótulos. Os únicos testes ajustados são os que fixavam o comportamento antigo agora contrário ao spec.
- **YAGNI:** sem campo de texto livre, sem tela/modal dedicado, sem fluxo de moderação/admin (fora de escopo do app), sem alterar `blocks`.
