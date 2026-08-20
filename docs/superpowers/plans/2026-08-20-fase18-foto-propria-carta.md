# BrDex Fase 18 — Foto Própria da Carta — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O spec define `user_cards` com "foto opcional (senão usa a imagem oficial do catálogo)" — mas a coluna `photo_url` existe desde a migration 0001 e está morta: o cadastro de carta não permite tirar foto, nada faz upload e o álbum nem exibe imagem (só o nome da carta). A Fase 18 ativa a coluna, no mesmo padrão da Fase 17 (coluna morta → fluxo completo): o usuário tira uma foto da cópia física no cadastro, ela sobe para o Supabase Storage, e o álbum passa a mostrar a foto própria quando existe — senão a imagem oficial do catálogo.

**Architecture:** Migration nova (`0021_card_photos.sql`): bucket público `card-photos` no Supabase Storage + policy de insert restrita à pasta do próprio usuário (`<user_id>/...`); leitura via URL pública do bucket, sem policy de select. No cliente: `uploadCardPhoto(base64)` em `photoRepository.ts` novo (upload de `Uint8Array` decodificado de base64 para `card-photos/<user_id>/<timestamp>.jpg`, retorna a URL pública); `AddUserCardInput`/`UserCard` ganham `photoUrl: string | null` e o `collectionRepository` grava/lê `photo_url`; no `add.tsx`, botão "Tirar foto da carta" reusa o padrão de câmera do `scan.tsx` (`ImagePicker.launchCameraAsync` com `mediaTypes: ["images"]`, `base64: true` — API confirmada na doc do Expo SDK 57) e sobe a foto antes do submit; no `album.tsx`, cada item ganha `<Image>` com `photoUrl ?? cardImageUrl`.

**Tech Stack:** Expo/React Native (`expo-router`, `expo-image-picker`), Supabase (Storage + Postgres, migration SQL), Jest (preset jest-expo) + RNTL.

## Global Constraints

- Foto é **opcional**: cadastro sem foto continua funcionando exatamente como hoje (`photo_url` null → álbum usa a imagem do catálogo).
- Upload acontece na captura (não no submit): se falhar, `Alert.alert("Erro", message)` e o cadastro segue sem foto — padrão fail-open das fases anteriores.
- Caminho no bucket sempre começa com o `user_id` do dono (policy de insert exige); nunca sobrescrever foto de outro usuário.
- Nenhuma migration existente é alterada — bucket e policies em migration nova, padrão aditivo.
- npm com `--legacy-peer-deps`; testes `npx jest <pattern>`; verificação final `npx jest && npx tsc --noEmit`.
- UI/textos em pt-BR.

## File Structure

- `supabase/migrations/0021_card_photos.sql` — bucket `card-photos` + policy de insert por pasta do usuário.
- `src/features/collection/photoRepository.ts` (+ test) — `uploadCardPhoto(base64): Promise<string>`.
- `src/features/collection/types.ts` — `photoUrl: string | null` em `AddUserCardInput` e `UserCard`.
- `src/features/collection/collectionRepository.ts` (+ test) — insert/select de `photo_url`.
- `app/card/add.tsx` (+ test) — captura de foto no cadastro.
- `app/(tabs)/album.tsx` (+ test) — `<Image>` com `photoUrl ?? cardImageUrl`.

---

### Task 1: Storage e repositório de upload

**Files:** Create `supabase/migrations/0021_card_photos.sql`, `src/features/collection/photoRepository.ts` (+ `photoRepository.test.ts`).

**Interfaces:**
- Produces: bucket público `card-photos` (`insert into storage.buckets ... on conflict do nothing`); policy `users upload their own card photos` (insert para `authenticated`, `bucket_id = 'card-photos'` e primeira pasta do path = `auth.uid()::text`). `uploadCardPhoto(base64: string): Promise<string>` — exige usuário autenticado; decodifica base64 com `atob` → `Uint8Array`; `client.storage.from("card-photos").upload("<user_id>/<timestamp>.jpg", bytes, { contentType: "image/jpeg" })`; `error` → `throw new Error(error.message)`; retorna `getPublicUrl(path).data.publicUrl`.

- [x] **Step 1: Write the migration** (`0021_card_photos.sql` — bucket + policy de insert; sem policy de select, bucket é público.)
- [x] **Step 2: Write the failing Jest tests** (`photoRepository.test.ts` — casos: upload vai para `card-photos` com path iniciando em `user-1/` e `contentType: "image/jpeg"`; retorna a URL pública; erro de upload vira throw; sem usuário autenticado vira throw.)
- [x] **Step 3: Run to verify it fails** — `npx jest photoRepository` → FAIL (módulo inexistente).
- [x] **Step 4: Implement** `photoRepository.ts` → GREEN (3/3).
- [x] **Step 5: Commit** — `feat: add card photo storage and upload repository`

---

### Task 2: Persistência de `photo_url` no cadastro e leitura

**Files:** Modify `src/features/collection/types.ts`, `src/features/collection/collectionRepository.ts` (+ `collectionRepository.test.ts`).

**Interfaces:**
- Produces: `AddUserCardInput.photoUrl: string | null`; `UserCard.photoUrl: string | null`. `addUserCard` insere `photo_url: input.photoUrl`; `listUserCards` inclui `photo_url` no select e mapeia `photoUrl` — testes existentes atualizados (nenhum removido).

- [x] **Step 1: Write the failing Jest tests** (estender `collectionRepository.test.ts` — `addUserCard` insere `photo_url`; `listUserCards` seleciona e mapeia `photo_url` → `photoUrl`.)
- [x] **Step 2: Run to verify it fails** — `npx jest collectionRepository` → FAIL (2 falhas esperadas).
- [x] **Step 3: Implement** (types + repositório) → GREEN; tsc apontou `add.tsx` (`photoUrl: null` por ora) e fixtures de `exportPdf.test.ts`/`shareCards.test.tsx`/`add.test.tsx`. Suite 157/157, tsc limpo.
- [x] **Step 4: Commit** — `feat: persist user card photo url`

---

### Task 3: Captura no cadastro e exibição no álbum

**Files:** Modify `app/card/add.tsx` (+ `add.test.tsx`), `app/(tabs)/album.tsx` (+ `album.test.tsx`).

**Interfaces:**
- Consumes: Tasks 1–2. No `add.tsx`: botão `add-card-photo` pede permissão de câmera e abre `ImagePicker.launchCameraAsync({ mediaTypes: ["images"], base64: true, quality: 0.5 })` (padrão do `scan.tsx`); com base64, chama `uploadCardPhoto` e guarda a URL em estado (texto `add-card-photo-done` visível); cancelar/sem base64 → nada; erro de upload → `Alert.alert("Erro", message)` e cadastro segue sem foto; `handleSubmit` passa `photoUrl` (ou null). No `album.tsx`: cada item renderiza `<Image testID={`album-image-<id>`} source={{ uri: photoUrl ?? cardImageUrl }}>`.

- [x] **Step 1: Write the failing RNTL tests** (estender `add.test.tsx` — capturar foto faz upload e submit envia `photoUrl`; captura cancelada não faz upload; erro de upload vira Alert e submit envia `photoUrl: null`. Estender `album.test.tsx` — item mostra `album-image-uc-1` com a foto própria quando `photoUrl` existe; com a imagem do catálogo quando é null.)
- [x] **Step 2: Run to verify it fails** — `npx jest "add|album"` → FAIL (5 falhas esperadas).
- [x] **Step 3: Implement** (`add.tsx` + `album.tsx`) → GREEN (19/19 nas duas suítes).
- [x] **Step 4: Full suite** — `npx jest && npx tsc --noEmit` verdes (162/162, tsc limpo).
- [x] **Step 5: Commit** — `feat: capture card photo on add and show it in the album`

---

## Self-Review Notes

- **Cobertura do spec:** ativa a "foto opcional (senão usa a imagem oficial do catálogo)" de `user_cards` — última coluna do modelo de dados do spec sem fluxo. O álbum passa a ser de fato "álbum visual" com a cópia física do usuário.
- **YAGNI:** sem galeria, sem escolher da biblioteca (só câmera, como o scanner), sem editar/remover foto depois, sem compressão além do `quality: 0.5` — se precisar, o dado e o bucket já existem.
- **Consistência:** repositório fino com throw de `error.message`; câmera idêntica ao `scan.tsx`; fail-open no upload como no limite de cartas; migration aditiva; testIDs e `Alert.alert` no padrão das fases.
- **Decisão consciente:** bucket público (leitura por URL) — a foto da carta é conteúdo que o próprio usuário expõe no mercado/compartilhamento; escrita continua restrita à pasta do dono via policy.
