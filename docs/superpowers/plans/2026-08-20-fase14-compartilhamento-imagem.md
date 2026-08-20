# BrDex Fase 14 — Compartilhamento com Imagem — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O spec define o compartilhamento social como "gera uma **imagem** da coleção ou de uma carta rara para postar em redes" (Recursos adicionais, grátis — motor de crescimento). A Fase 5 entregou só a versão texto (`Share.share` com mensagem) e adiou explicitamente a imagem ("exige view-shot/asset pipeline"). A Fase 14 fecha essa lacuna: um cartão visual off-screen é capturado como PNG (`react-native-view-shot`, incluído no Expo Go SDK 57) e compartilhado via `expo-sharing` (já instalado desde a Fase 10) — tanto para a coleção inteira quanto para uma carta individual.

**Architecture:** Zero backend novo — tudo no cliente. Componentes visuais puros (`ShareCollectionCard`, `ShareSingleCard`) renderizados fora da área visível do álbum com `collapsable={false}` (Android descarta views "colapsáveis" e o `captureRef` falharia); um helper `captureAndShareView(ref)` orquestra `captureRef` (PNG, tmpfile) → `Sharing.shareAsync` — mesmo pipeline capture→share do PDF da Fase 10, trocando `Print.printToFileAsync` por `captureRef`. O botão "Compartilhar" existente do álbum passa a compartilhar a imagem da coleção; long-press num item do álbum compartilha a imagem daquela carta.

**Tech Stack:** Expo/React Native (`react-native-view-shot`, `expo-sharing`), Jest (preset jest-expo) + RNTL.

## Global Constraints

- Compartilhamento é **grátis** (spec: travar motor de crescimento atrás de paywall não faz sentido) — nenhum gating premium.
- Scanner por foto continua fora (exige serviço externo de reconhecimento de imagem); cobrança IAP real idem (exige credenciais de loja) — mesmas exclusões conscientes das fases anteriores.
- `react-native-view-shot` instalado com `npx expo install react-native-view-shot` (docs v57 conferidas: incluído no Expo Go; `captureRef(ref, { format, quality, result })`); fallback `npm install --legacy-peer-deps`.
- O cartão de coleção mostra contagem e até 4 nomes de cartas — sem buscar valor total (o share texto da Fase 5 já passa `null` de valor; não criar fetch novo só para isso — YAGNI).
- Falha na captura/share nunca quebra a tela: erro vira `Alert.alert("Erro", message)`, padrão do PDF da Fase 10.
- npm com `--legacy-peer-deps`; testes JS `npx jest <pattern>`; verificação final `npx jest && npx tsc --noEmit`.
- UI/textos em pt-BR.

## File Structure

- `src/features/collection/shareCards.tsx` (+ `shareCards.test.tsx`) — componentes visuais `ShareCollectionCard` e `ShareSingleCard`.
- `src/features/collection/shareImage.ts` (+ `shareImage.test.ts`) — `captureAndShareView(ref)`.
- `app/(tabs)/album.tsx` (+ `album.test.tsx`) — captura off-screen + botão de coleção + long-press por carta.

---

### Task 1: Componentes visuais do cartão de compartilhamento

**Files:** Create `src/features/collection/shareCards.tsx` (+ `shareCards.test.tsx`).

**Interfaces:**
- Produces: `ShareCollectionCard({ cardCount, cardNames }: { cardCount: number; cardNames: string[] })` — cartão com marca "BrDex", texto `"Minha coleção: {cardCount} cartas"` (testID `share-card-summary`) e até 4 nomes de cartas (testID `share-card-name-{i}`; excedente vira `"+N outras"`, testID `share-card-more`). `ShareSingleCard({ card }: { card: UserCard })` — cartão com marca "BrDex", `card.cardName` (testID `share-single-name`) e linha `"{estado} · {idioma}"` usando os labels de `conditionScale` (testID `share-single-details`). Componentes puros, sem fetch — Task 3 renderiza ambos off-screen.

- [x] **Step 1: Write the failing RNTL test** (`shareCards.test.tsx` — casos: coleção mostra contagem; coleção com 6 nomes mostra 4 + `"+2 outras"`; coleção com 2 nomes não mostra `share-card-more`; carta única mostra nome e detalhes com label do estado em pt-BR.)
- [x] **Step 2: Run to verify it fails** — `npx jest shareCards` → FAIL (módulo não existe).
- [x] **Step 3: Implement `shareCards.tsx`** → GREEN.
- [x] **Step 4: Commit** — `feat: add shareable collection and card image components`

---

### Task 2: Helper de captura e compartilhamento

**Files:** Create `src/features/collection/shareImage.ts` (+ `shareImage.test.ts`).

**Interfaces:**
- Consumes: `react-native-view-shot` (instalar primeiro — `npx expo install react-native-view-shot`), `expo-sharing`.
- Produces: `captureAndShareView(ref: React.RefObject<View | null>): Promise<void>` — `captureRef(ref, { format: "png", quality: 1, result: "tmpfile" })` → `Sharing.shareAsync(uri, { mimeType: "image/png" })`; erro de captura/share propaga (`throw`) para o chamador exibir o Alert.

- [x] **Step 1: Install** `react-native-view-shot` e conferir que a suite existente segue verde (`npx jest`).
- [x] **Step 2: Write the failing Jest test** (`shareImage.test.ts`, mockando `react-native-view-shot` e `expo-sharing` — casos: `captureRef` chamado com o ref e opções PNG/tmpfile; `shareAsync` recebe a uri retornada com mimeType `image/png`; erro do `captureRef` propaga e `shareAsync` não é chamado.)
- [x] **Step 3: Run to verify it fails** — `npx jest shareImage` → FAIL (módulo não existe).
- [x] **Step 4: Implement `shareImage.ts`** → GREEN.
- [x] **Step 5: Commit** — `feat: add capture-and-share image helper`

---

### Task 3: Integração no álbum

**Files:** Modify `app/(tabs)/album.tsx` (+ `album.test.tsx`).

**Interfaces:**
- Consumes: Tasks 1 e 2. O botão `share-collection` existente passa a capturar a imagem da coleção (`ShareCollectionCard` renderizado off-screen com `collapsable={false}` e `ref`) via `captureAndShareView`; o texto `Share.share` antigo sai (a imagem o substitui — spec pede imagem). Long-press num `album-item-{id}` define a carta destacada, renderiza `ShareSingleCard` off-screen e dispara a mesma captura. Erros → `Alert.alert("Erro", message)`.

- [x] **Step 1: Write the failing RNTL test** (estender `album.test.tsx`, mockando `shareImage` — casos: press em `share-collection` chama `captureAndShareView`; long-press em um item do álbum chama `captureAndShareView`; erro rejeitado vira `Alert.alert`.)
- [x] **Step 2: Run to verify it fails** — `npx jest album` → FAIL.
- [x] **Step 3: Implement** a integração em `album.tsx` → GREEN.
- [x] **Step 4: Full suite** — `npx jest && npx tsc --noEmit` verdes.
- [x] **Step 5: Commit** — `feat: share collection and single card as image from album`

---

## Self-Review Notes

- **Cobertura do spec:** fecha "gera uma imagem da coleção ou de uma carta rara para postar em redes" (Recursos adicionais, grátis) — última funcionalidade do spec implementável sem serviço externo. Restam apenas: scanner por foto (reconhecimento de imagem externo), cobrança IAP real (credenciais de loja) e confirmação formal do licenciamento TCGplayer (tarefa de negócio, não de código).
- **YAGNI:** sem geração server-side de imagem, sem template configurável, sem valor total no cartão (exigiria fetch novo), sem watermark/branding elaborado — um cartão simples e legível resolve o caso de uso "postar em redes".
- **Consistência:** pipeline capture→share idêntico ao PDF da Fase 10 (`expo-sharing` reutilizado); componentes puros testados com RNTL como nas Fases 5/12; erros via `Alert.alert` como no export PDF.
