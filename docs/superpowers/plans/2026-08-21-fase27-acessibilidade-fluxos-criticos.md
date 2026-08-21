# BrDex Fase 27 — Acessibilidade nos Fluxos Críticos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auditoria desta sessão: **nenhuma** tela do app tem anotação de acessibilidade — ~125 `Pressable` em 15 telas sem `accessibilityRole`, então TalkBack/VoiceOver não anunciam nenhum controle como botão, e as imagens de carta não têm rótulo. Para um app de consumo indo para as lojas isso é débito real, não polimento. Escopo contido: só os fluxos críticos do produto (venda/edição no álbum, matches, chat, wishlist) — o restante das telas fica para uma fase futura se houver demanda. Tratamento de erro dos fluxos críticos foi auditado na mesma varredura e está sólido (todas as telas usam `setError` inline ou `Alert`); acessibilidade é a lacuna.

**Architecture:** Sem componente novo: adicionar `accessibilityRole="button"` aos `Pressable` interativos das telas-alvo e `accessibilityLabel` onde o conteúdo não é texto autoexplicativo (ex.: imagem da carta no álbum → nome da carta; botões por item → rótulo com o nome do item). Testes RNTL usam `getByRole("button", { name })`/`getAllByRole` — falham hoje (nenhum role definido) e passam com as anotações: RED-GREEN honesto por tela.

**Tech Stack:** Expo/React Native (`expo-router`), Jest (preset jest-expo) + RNTL (queries por role).

## Global Constraints

- Nenhum teste existente editado ou removido — apenas casos novos estendendo os arquivos de teste das telas.
- Nenhuma mudança visual ou de comportamento: só props de acessibilidade.
- `accessibilityRole="button"` em todo `Pressable` com `onPress` das telas-alvo; `accessibilityLabel` apenas onde o texto filho não descreve a ação sozinho (botões por item recebem o nome do item, ex.: "Vender Pikachu").
- Rótulos em pt-BR, coerentes com o texto visível.
- Testes `npx jest <pattern>`; verificação final `npx jest --maxWorkers=2 && npx tsc --noEmit`.

## File Structure

- Task 1: `app/(tabs)/album.tsx` (+ estender `album.test.tsx`).
- Task 2: `app/chat/[conversationId].tsx`, `app/(tabs)/matches.tsx`, `app/wishlist/index.tsx` (+ estender os testes respectivos).

---

### Task 1: Acessibilidade no álbum (venda, edição, exclusão, status)

**Files:** Modify `app/(tabs)/album.tsx`; extend `app/(tabs)/album.test.tsx`.

**Interfaces:**
- Todo `Pressable` interativo do álbum ganha `accessibilityRole="button"`; os botões por carta (vender/editar/excluir/status/compartilhar) ganham `accessibilityLabel` com o nome da carta (ex.: `Vender ${item.cardName}`); a imagem da carta ganha `accessibilityLabel={item.cardName}`.
- Painéis (venda/edição/exclusão) mantêm seus controles com role de botão ("Confirmar", "Cancelar").

- [x] **Step 1: Write the failing RNTL tests** (estender `album.test.tsx` — casos: os controles por carta são expostos como botões com rótulo contendo o nome da carta; confirmar/cancelar do painel de venda são botões.)
- [x] **Step 2: Run to verify it fails** — `npx jest album.test` → FAIL (2 falhas novas; 26 existentes verdes).
- [x] **Step 3: Implement** as props de acessibilidade (roles em todos os Pressable, labels por carta, label na imagem; container de long-press sem role para não engolir os botões internos) → GREEN (28/28), sem editar testes existentes.
- [x] **Step 4: Commit** — `feat: add accessibility roles and labels to album`

---

### Task 2: Acessibilidade em chat, matches e wishlist

**Files:** Modify `app/chat/[conversationId].tsx`, `app/(tabs)/matches.tsx`, `app/wishlist/index.tsx`; extend os testes respectivos.

**Interfaces:**
- Chat: enviar ("Enviar mensagem"), denunciar e bloquear como botões; matches: link da wishlist e itens de match como botões; wishlist: remover por item como botão com rótulo `Remover ${item.cardName}`.

- [ ] **Step 1: Write the failing RNTL tests** (estender `chat.test.tsx`, `matches.test.tsx`, `wishlist.test.tsx` — um caso por tela via `getByRole`/`getAllByRole`.)
- [ ] **Step 2: Run to verify it fails** — `npx jest chat.test matches wishlist` → FAIL.
- [ ] **Step 3: Implement** as props → GREEN sem editar testes existentes.
- [ ] **Step 4: Full suite** — `npx jest --maxWorkers=2 && npx tsc --noEmit` verdes.
- [ ] **Step 5: Commit** — `feat: add accessibility roles to social flows`

---

## Self-Review Notes

- **Valor real vs. trabalho inventado:** leitor de tela é requisito prático de loja/consumo; zero anotação é lacuna objetiva, não estética. Escopo deliberadamente limitado aos fluxos que o produto considera críticos — não é uma varredura cosmética das 15 telas.
- **Coordenação:** `git status` e `ls docs/superpowers/plans/` conferidos na hora — sem plano nem arquivos paralelos sobre o tema.
- **Rede de proteção:** testes por role são adição pura; os testes por testID existentes continuam intactos e garantem que nada mais mudou.
- **YAGNI:** sem lib de a11y, sem auditoria WCAG formal, sem refactor de componentes — só roles/labels nativos onde faltam.
