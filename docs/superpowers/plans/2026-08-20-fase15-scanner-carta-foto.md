# BrDex Fase 15 — Scanner de Carta por Foto — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O spec lista o Scanner de carta por foto como recurso **premium** ("câmera com reconhecimento de imagem — tem custo de processamento por uso, é o recurso de maior 'uau' do produto"). É o último recurso da seção "Recursos adicionais" sem implementação. A Fase 15 entrega o MVP: tirar foto da carta → reconhecer nome/número via serviço de visão → casar com `cards_catalog` → abrir o formulário de cadastro (`/card/add`) já com a carta certa — com fallback manual (busca no catálogo) quando não reconhecer.

**Architecture:** O app **nunca chama o serviço de visão direto** (a chave ficaria exposta no cliente) — segue o mesmo padrão das fases anteriores: uma Supabase Edge Function (`recognize-card`) recebe a foto em base64, chama a Anthropic Messages API (modelo com visão, prompt pedindo JSON `{name, number}`) e devolve o resultado; a lógica testável (parse da resposta do modelo) vive em `transform.ts` puro com testes Deno, como `sync-prices`/`send-push`. No cliente: `expo-image-picker` (`launchCameraAsync` com `base64: true`, incluído no Expo Go SDK 57) captura a foto; `scannerRepository.recognizeCard` invoca a function via `client.functions.invoke`; `searchCatalogByName` (ilike no `cards_catalog`) + `matchScannedCard` (função pura, desempate por número da carta) escolhem a carta; a tela `/card/scan` orquestra tudo com gating premium + upsell (mesmo padrão dos alertas de preço do catálogo). Nenhuma migration nova — não há tabela nova.

**Tech Stack:** Expo/React Native (`expo-image-picker`, `expo-router`), Supabase Edge Function (Deno) + Anthropic Messages API, Jest (preset jest-expo) + RNTL, testes Deno para a function.

## Global Constraints

- Scanner é **premium** (spec: custo de processamento por uso) — sem assinatura mostra upsell (testID `scanner-upsell`), padrão dos alertas de preço da Fase 9.
- A chave da Anthropic (`ANTHROPIC_API_KEY`) vive só nas secrets da Edge Function — nunca no cliente nem em código versionado.
- Reconhecimento falhou / carta não encontrada no catálogo **nunca quebra a tela**: mensagem clara (testID `scan-no-match`) + caminho manual (botão para o catálogo), sem Alert de erro genérico para esse caso; erro real (rede, function) → `Alert.alert("Erro", message)` como nas fases anteriores.
- `expo-image-picker` instalado com `npx expo install expo-image-picker` (docs v57 conferidas: `launchCameraAsync({ mediaTypes: ["images"], base64, quality })`, resultado `{ canceled, assets: [{ base64 }] }`, `requestCameraPermissionsAsync`); fallback `npm install --legacy-peer-deps`.
- npm com `--legacy-peer-deps`; testes JS `npx jest <pattern>`; Deno: `deno test supabase/functions/recognize-card/transform.test.ts` e `deno check supabase/functions/recognize-card/index.ts`; verificação final `npx jest && npx tsc --noEmit`.
- UI/textos em pt-BR.

## File Structure

- `supabase/functions/recognize-card/transform.ts` (+ `transform.test.ts`) — parse da resposta do modelo de visão.
- `supabase/functions/recognize-card/index.ts` — endpoint Deno que chama a Anthropic API.
- `src/features/scanner/matchCard.ts` (+ `matchCard.test.ts`) — matching puro contra cartas do catálogo.
- `src/features/scanner/scannerRepository.ts` (+ `scannerRepository.test.ts`) — invoke da Edge Function.
- `src/features/catalog/catalogRepository.ts` (+ test) — nova `searchCatalogByName`.
- `app/card/scan.tsx` (+ `scan.test.tsx`) — tela do scanner (câmera → reconhecer → navegar).
- `app/(tabs)/catalog.tsx` (+ test) — botão de entrada "Escanear carta".

---

### Task 1: Matching puro contra o catálogo

**Files:** Create `src/features/scanner/matchCard.ts` (+ `matchCard.test.ts`).

**Interfaces:**
- Produces: `matchScannedCard(cards: CatalogCard[], recognition: { name: string | null; number: string | null }): CatalogCard | null` — sem nome reconhecido → `null`; compara nome normalizado (trim/lowercase/sem acentos via `normalize("NFD")`); entre os que batem por nome, o `number` reconhecido desempata (match exato de número ganha); sem número ou número sem match → primeiro candidato por nome. Nenhum match de nome → `null`.

- [x] **Step 1: Write the failing Jest test** (`matchCard.test.ts` — casos: nome exato acha a carta; nome com acento/caixa diferente acha; número desempata entre duas cartas de mesmo nome; sem número retorna o primeiro candidato; nome não existente → `null`; `name: null` → `null`.)
- [x] **Step 2: Run to verify it fails** — `npx jest matchCard` → FAIL (módulo não existe).
- [x] **Step 3: Implement `matchCard.ts`** → GREEN (7/7).
- [x] **Step 4: Commit** — `feat: add scanned card matching against catalog`

---

### Task 2: Edge Function de reconhecimento

**Files:** Create `supabase/functions/recognize-card/transform.ts` (+ `transform.test.ts`) e `index.ts`.

**Interfaces:**
- Produces: `parseRecognition(text: string): { name: string | null; number: string | null }` — extrai o JSON da resposta do modelo (tolerante a cercas ```json e texto em volta); campos ausentes/vazios/não-string → `null`; texto sem JSON válido → `{ name: null, number: null }`. `index.ts`: POST `{ imageBase64: string }` → chama Anthropic Messages API (modelo com visão, imagem base64 + prompt pedindo só JSON `{"name","number"}`) com `ANTHROPIC_API_KEY` das secrets → responde `parseRecognition(...)` como JSON; body sem `imageBase64` → 400; secret ausente → 500 com mensagem clara; erro da API → 502.

- [x] **Step 1: Write the failing Deno test** (`transform.test.ts` — casos: JSON puro; JSON com cerca de código; campos faltando → null; texto sem JSON → tudo null.)
- [x] **Step 2: Run to verify it fails** — `deno test supabase/functions/recognize-card/transform.test.ts` → FAIL.
- [x] **Step 3: Implement `transform.ts`** → GREEN (4/4); implement `index.ts` no padrão de `sync-prices` e verificado com `deno check`.
- [x] **Step 4: Commit** — `feat: add recognize-card edge function`

---

### Task 3: Repositórios no cliente

**Files:** Create `src/features/scanner/scannerRepository.ts` (+ `scannerRepository.test.ts`); modify `src/features/catalog/catalogRepository.ts` (+ `catalogRepository.test.ts`).

**Interfaces:**
- Produces: `recognizeCard(imageBase64: string): Promise<{ name: string | null; number: string | null }>` — `getSupabaseClient().functions.invoke("recognize-card", { body: { imageBase64 } })`; `error` → `throw new Error(error.message)`. `searchCatalogByName(name: string): Promise<CatalogCard[]>` — `.from("cards_catalog").select(...).ilike("name", "%name%").limit(25)`, mesmo mapeamento snake_case→camelCase de `fetchCatalogPage`.

- [x] **Step 1: Write the failing Jest tests** (`scannerRepository.test.ts` — invoke com nome da function e body certo; resultado repassado; erro vira throw. `catalogRepository.test.ts` — estender: `searchCatalogByName` usa ilike e mapeia os campos; erro vira throw.)
- [x] **Step 2: Run to verify it fails** — `npx jest scannerRepository catalogRepository` → FAIL.
- [x] **Step 3: Implement** → GREEN (6/6).
- [x] **Step 4: Commit** — `feat: add card recognition and catalog name search repositories`

---

### Task 4: Tela do scanner + entrada no catálogo

**Files:** Create `app/card/scan.tsx` (+ `scan.test.tsx`); modify `app/(tabs)/catalog.tsx` (+ `catalog.test.tsx`).

**Interfaces:**
- Consumes: Tasks 1 e 3, `expo-image-picker` (instalar primeiro), `isPremium`. Tela `/card/scan`: não-premium → texto `scanner-upsell` (sem botão de câmera); premium → botão `scan-capture` que pede permissão (`requestCameraPermissionsAsync`; negada → `Alert.alert`), captura (`launchCameraAsync({ mediaTypes: ["images"], base64: true, quality: 0.5 })`; `canceled` → volta ao estado inicial), chama `recognizeCard` → `searchCatalogByName` → `matchScannedCard`; match → `router.replace("/card/add?catalogCardId=...")` (formulário já preenche raridade/edição pelo catálogo, como no fluxo normal); sem match → `scan-no-match` ("Carta não reconhecida...") + botão `scan-manual-fallback` → `router.replace("/(tabs)/catalog")`; erro de function/rede → `Alert.alert("Erro", message)`. Catálogo ganha botão `open-scanner` → `router.push("/card/scan")`.

- [x] **Step 1: Install** `expo-image-picker` (57.0.11) e conferir que a suite existente segue verde (`npx jest` — 127/127).
- [x] **Step 2: Write the failing RNTL test** (`scan.test.tsx`, mockando `expo-image-picker`, `expo-router`, `isPremium`, `recognizeCard`, `searchCatalogByName` — casos: não-premium mostra upsell; premium com match navega para `/card/add?catalogCardId=`; sem match mostra `scan-no-match` e fallback navega ao catálogo; captura cancelada não chama `recognizeCard`; erro vira `Alert.alert`. `catalog.test.tsx` — estender: `open-scanner` navega para `/card/scan`.)
- [x] **Step 3: Run to verify it fails** — `npx jest scan catalog` → FAIL.
- [x] **Step 4: Implement** `scan.tsx` e o botão no catálogo → GREEN (8/8).
- [x] **Step 5: Full suite** — `npx jest` (133/133) e `npx tsc --noEmit` verdes.
- [x] **Step 6: Commit** — `feat: add premium card scanner with photo recognition`

---

## Self-Review Notes

- **Cobertura do spec:** fecha "Scanner de carta por foto (câmera com reconhecimento de imagem)" (Recursos adicionais, premium) — último recurso da lista sem implementação. Restam apenas: cobrança IAP real (credenciais de loja) e confirmação formal do licenciamento TCGplayer (tarefas de negócio, não de código).
- **YAGNI:** sem detecção de borda/crop da carta, sem reconhecimento offline/on-device, sem histórico de scans, sem retry automático — foto → um palpite do modelo → match → formulário resolve o MVP; quando erra, o fallback manual é a busca de catálogo que já existe.
- **Consistência:** Edge Function com `transform.ts` puro + testes Deno como `sync-prices`/`send-push`; gating premium + upsell como alertas de preço (Fase 9) e PDF (Fase 10); repositórios finos sobre o client Supabase com throw de `error.message` como todos os outros; navegação para `/card/add?catalogCardId=` reutiliza o formulário existente sem mudá-lo.
- **Custo por uso:** o gating premium acontece no cliente (MVP); a function exige JWT válido (default do Supabase), então não é anônima. Checagem de premium server-side na function fica como melhoria futura se houver abuso.
