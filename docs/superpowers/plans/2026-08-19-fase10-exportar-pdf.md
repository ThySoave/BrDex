# BrDex Fase 10 — Exportar Coleção em PDF (Premium) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Usuário premium exporta a coleção em PDF a partir do álbum ("documentação útil para seguro em caso de furto/perda", spec bloco premium). Não-premium vê upsell. Geração 100% local no dispositivo via `expo-print` (HTML → PDF) + `expo-sharing` para compartilhar/salvar o arquivo — sem backend novo.

**Architecture:** Função pura `buildCollectionPdfHtml(cards, generatedAtIso)` em `src/features/collection/exportPdf.ts` monta o HTML do documento (testável com Jest, sem tocar em APIs nativas); o álbum chama `Print.printToFileAsync({ html })` e depois `Sharing.shareAsync(uri)`. Gate premium de UX com `isPremium()` (mesmo padrão do progresso por set e dos alertas de preço).

**Tech Stack:** Expo/React Native (`expo-print`, `expo-sharing`), Jest (preset jest-expo).

## Global Constraints

- **Premium**: botão "Exportar PDF" checa `isPremium()`; não-premium vê upsell (testID `export-pdf-upsell`) e nada é gerado.
- HTML do PDF escapa conteúdo dinâmico (nomes de carta vêm de API externa) — nunca interpolar sem escape.
- Valores em pt-BR (R$ com vírgula); data de geração no cabeçalho do documento.
- Instalação de dependências com `npx expo install expo-print expo-sharing` (fallback: `npm install --legacy-peer-deps`).
- npm com `--legacy-peer-deps`; testes JS `npx jest <pattern>`.
- UI em pt-BR.

## File Structure

- `src/features/collection/exportPdf.ts` (+ test) — `buildCollectionPdfHtml(cards: UserCard[], generatedAtIso: string): string`.
- `app/(tabs)/album.tsx` — modificar: botão "Exportar PDF" (premium) → gera e compartilha.
- `app/(tabs)/album.test.tsx` — teste de componente (RNTL) do fluxo novo.

---

### Task 1: buildCollectionPdfHtml (função pura)

**Files:** Create `src/features/collection/exportPdf.ts` (+ test).

**Interfaces:**
- Produces: `buildCollectionPdfHtml(cards: UserCard[], generatedAtIso: string): string` — HTML completo com: título "Coleção BrDex", data de geração formatada pt-BR, uma linha de tabela por carta (nome, idioma, condição, preço pago formatado ou "—"), rodapé com contagem de cartas e soma dos preços pagos ("Total investido: R$ X,XX"). Task 2 usa exatamente esse nome.

- [ ] Teste `exportPdf` (4 casos: HTML contém título, data e uma linha por carta; caracteres especiais no nome da carta são escapados (`<`, `&`); preço nulo vira "—" e não entra na soma; total investido soma os preços pagos com vírgula decimal) → red → implementação → green.
- [ ] Commit `feat: add collection PDF HTML builder`

---

### Task 2: Botão Exportar PDF no álbum (premium)

**Files:** Modify `app/(tabs)/album.tsx`; Create `app/(tabs)/album.test.tsx`. Instalar `expo-print` e `expo-sharing`.

**Interfaces:** Consumes Task 1 + `isPremium()`.

- [ ] Instalar dependências: `npx expo install expo-print expo-sharing` (ou npm com `--legacy-peer-deps`).
- [ ] Teste de componente (RNTL, mockando `expo-print`, `expo-sharing`, repositórios e `isPremium`): premium — tocar "Exportar PDF" (testID `export-pdf`) chama `printToFileAsync` com HTML contendo o nome da carta e depois `shareAsync` com a uri retornada; não-premium — tocar "Exportar PDF" mostra upsell (testID `export-pdf-upsell`) e não chama `printToFileAsync`. → red
- [ ] Implementar no álbum: botão sempre visível; premium → `buildCollectionPdfHtml(cards, new Date().toISOString())` → `Print.printToFileAsync({ html })` → `Sharing.shareAsync(uri)`; não-premium → upsell. → green
- [ ] Full suite verde (`npx jest && npx tsc --noEmit`) → Commit `feat: add premium collection PDF export to album`

---

## Self-Review Notes

- **Cobertura do spec:** "Exportar coleção em PDF (documentação útil para seguro em caso de furto/perda)" — bloco premium.
- **YAGNI:** sem imagens das cartas no PDF (URLs remotas atrasariam a geração e podem falhar offline; lista textual cumpre o propósito de documentação), sem escolha de layout, sem envio por e-mail.
- **Consistência:** gate premium de UX igual às Fases 5/9; função pura testável igual a `shareCollection`/`valueChart`; nenhuma migration nova (não há estado no servidor).
