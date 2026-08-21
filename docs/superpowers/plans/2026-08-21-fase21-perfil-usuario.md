# BrDex Fase 21 — Perfil do Usuário — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O spec exige que denúncia possa ser feita "a partir do chat **ou do perfil**" e que a reputação básica seja um "histórico de negociações **visível**" — mas hoje não existe tela de perfil: denúncia/bloqueio só existem dentro do chat, a reputação (`userRatingSummary`) e o selo de verificado nunca aparecem fora do resultado de busca do mercado, e o usuário nem consegue **sair da conta** (nenhuma UI chama `signOut`). A Fase 21 fecha esses três buracos com duas telas: a aba "Perfil" (meus dados, plano, selo, reputação, sair) e o perfil público de outro usuário (selo, reputação, denunciar, bloquear), com pontos de entrada no mercado e no chat.

**Architecture:** Sem migration e sem função nova de repositório — tudo já existe: `getSession`/`signOut` (auth), `isPremium`/`isUserVerified` (premium), `userRatingSummary` (ratings), `reportUser`/`blockUser` (safety). A fase é 100% camada de UI: `app/(tabs)/profile.tsx` (aba nova registrada no `_layout.tsx`) e `app/user/[userId].tsx` (rota dinâmica, mesmo padrão de `app/chat/[conversationId].tsx`). Pontos de entrada: botão "Ver perfil" em cada item do mercado (já tem `sellerId`) e no cabeçalho do chat (já tem `other`), ambos via `router.push("/user/<id>")`.

**Tech Stack:** Expo/React Native (`expo-router`), Supabase (repositórios existentes), Jest (preset jest-expo) + RNTL.

## Global Constraints

- Nenhuma função nova de repositório e nenhuma migration — a fase consome só APIs já testadas.
- Denúncia a partir do perfil usa o mesmo shape do chat: `reportUser(userId, "denúncia feita a partir do perfil", "perfil <userId>")`; bloqueio confirma com `Alert.alert("Usuário bloqueado")` e volta (`router.back()`).
- Reputação sem avaliações → texto "Sem avaliações"; com avaliações → média com 1 casa (vírgula como separador decimal, pt-BR) + contagem.
- Erros de rede/banco → `Alert.alert("Erro", message)`, padrão das fases anteriores.
- Nenhum teste existente removido; sem force-push.
- npm com `--legacy-peer-deps`; testes `npx jest <pattern>`; verificação final `npx jest --maxWorkers=2 && npx tsc --noEmit`.
- UI/textos em pt-BR.

## File Structure

- `app/(tabs)/profile.tsx` (+ `profile.test.tsx`) — aba "Perfil" (meu perfil + sair).
- `app/(tabs)/_layout.tsx` — registro da aba.
- `app/user/[userId].tsx` (+ `user-profile.test.tsx`) — perfil público com denúncia/bloqueio.
- `app/(tabs)/market.tsx` (+ test) e `app/chat/[conversationId].tsx` (+ test) — pontos de entrada.

---

### Task 1: Aba "Perfil" (meu perfil e sair da conta)

**Files:** Create `app/(tabs)/profile.tsx` + `app/(tabs)/profile.test.tsx`; modify `app/(tabs)/_layout.tsx`.

**Interfaces:**
- Consumes: `getSession`/`signOut` (authRepository), `isPremium` (entitlementsRepository), `isUserVerified` (entitlementsRepository), `userRatingSummary` (ratingsRepository).
- Produces: tela com `profile-email` (email da sessão), `profile-plan` ("Plano: Premium" / "Plano: Grátis"), `profile-verified` ("✓ Verificado", só quando verificado), `profile-rating` (média + contagem ou "Sem avaliações") e botão `sign-out` → `signOut()` → `router.replace("/(auth)/login")`; erro → `Alert.alert("Erro", message)`.

- [x] **Step 1: Write the failing RNTL tests** (`profile.test.tsx` — casos: mostra email da sessão; mostra "Plano: Premium" quando `isPremium` true e "Plano: Grátis" quando false; mostra selo só quando `isUserVerified` true; mostra reputação formatada e "Sem avaliações" quando `ratingsCount` = 0; `sign-out` chama `signOut` e navega para o login; erro do `signOut` vira `Alert.alert`.)
- [x] **Step 2: Run to verify it fails** — `npx jest profile` → FAIL (module not found, 9 testes bloqueados).
- [x] **Step 3: Implement** — tela no padrão das demais tabs + `<Tabs.Screen name="profile" options={{ title: "Perfil" }} />` no layout → GREEN (9/9).
- [x] **Step 4: Commit** — `feat: add profile tab with account info and sign out`

---

### Task 2: Perfil público de outro usuário (denúncia e bloqueio)

**Files:** Create `app/user/[userId].tsx` + `app/user/user-profile.test.tsx`.

**Interfaces:**
- Consumes: `isUserVerified`, `userRatingSummary`, `reportUser`, `blockUser`; `useLocalSearchParams<{ userId: string }>`.
- Produces: tela com `user-verified` (selo, só quando verificado), `user-rating` (mesma formatação da Task 1), botão `report-user` → `reportUser(userId, "denúncia feita a partir do perfil", "perfil <userId>")` → `Alert.alert("Denúncia enviada", "Nossa equipe vai analisar.")`, botão `block-user` → `blockUser(userId)` → `Alert.alert("Usuário bloqueado")` + `router.back()`; erros → `Alert.alert("Erro", message)`.

- [ ] **Step 1: Write the failing RNTL tests** (`user-profile.test.tsx` — casos: mostra selo quando verificado e omite quando não; mostra reputação e "Sem avaliações"; denunciar chama `reportUser` com motivo/contexto do perfil e mostra confirmação; bloquear chama `blockUser`, confirma e volta; erro de denúncia vira `Alert.alert("Erro", ...)`.)
- [ ] **Step 2: Run to verify it fails** — `npx jest user-profile` → FAIL.
- [ ] **Step 3: Implement** — tela no padrão de `app/chat/[conversationId].tsx` (handlers `.then/.catch` + `Alert`) → GREEN.
- [ ] **Step 4: Commit** — `feat: add public user profile with report and block`

---

### Task 3: Pontos de entrada — mercado e chat

**Files:** Modify `app/(tabs)/market.tsx` (+ `market.test.tsx`) and `app/chat/[conversationId].tsx` (+ `chat.test.tsx`).

**Interfaces:**
- Consumes: Task 2 (rota `/user/<id>`). Mercado: cada item ganha botão `market-seller-<userCardId>` → `router.push("/user/<sellerId>")`. Chat: botão `chat-view-profile` no cabeçalho → `router.push("/user/<other>")` (omitido quando `other` ausente).

- [ ] **Step 1: Write the failing RNTL tests** (estender `market.test.tsx`: botão do vendedor navega para o perfil do `sellerId`; estender `chat.test.tsx`: botão do cabeçalho navega para o perfil do `other`.)
- [ ] **Step 2: Run to verify it fails** — `npx jest market chat` → FAIL.
- [ ] **Step 3: Implement** — dois botões com `router.push` → GREEN.
- [ ] **Step 4: Full suite** — `npx jest --maxWorkers=2 && npx tsc --noEmit` verdes.
- [ ] **Step 5: Commit** — `feat: link to user profile from market and chat`

---

## Self-Review Notes

- **Cobertura do spec:** fecha o requisito obrigatório da Fase 3 do spec ("denúncia a partir do chat **ou do perfil**"), torna a reputação de fato "visível" (spec: motor de segurança gratuito) e dá saída de conta ao usuário — hoje impossível pela UI.
- **YAGNI:** sem tabela `profiles`/display name (spec não define perfil editável), sem foto de perfil, sem histórico detalhado de negociações (o resumo `userRatingSummary` já é a "reputação básica" do spec), sem gerenciamento de assinatura (só exibição do plano).
- **Consistência:** rota dinâmica no padrão do chat; handlers `.then/.catch` + `Alert.alert` como nas fases 3–20; testIDs no padrão `<área>-<ação>`; selo "✓ Verificado" com o mesmo visual do mercado (Fase 11).
- **Decisão consciente:** o perfil público não expõe email nem dados privados de outro usuário — só selo e reputação, ambos já públicos por design (RLS das fases 8 e 11).
