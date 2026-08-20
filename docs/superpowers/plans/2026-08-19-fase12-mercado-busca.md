# BrDex Fase 12 — Mercado: Busca de Cartas à Venda/Troca — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fechar a lacuna central do spec ainda aberta: "Só cartas com status diferente de `guardada` aparecem **na busca de outros usuários**". Hoje a descoberta só acontece passivamente via wishlist/match — não existe busca ativa. A Fase 12 cria a aba Mercado: buscar cartas que outros usuários marcaram como `a_venda`/`disponivel_troca` e abrir conversa direto com o vendedor. Também concretiza a "prioridade nos resultados de busca" do selo de verificado (spec bloco premium, Fase 11): vendedores verificados aparecem primeiro.

**Architecture:** RLS de `user_cards` é dono-somente (por design, Fase 1), então a exposição pública vai por função SQL `search_market_listings(search_text)` **security definer** que retorna apenas o recorte público permitido pelo spec: cartas com status ≠ `guardada`, nunca as do próprio usuário, nunca de pares bloqueados (`users_blocked`, Fase 3), com `seller_verified` (via `is_premium`, Fase 4) para badge e ordenação (verificados primeiro, depois nome da carta). App consome via RPC em `marketRepository`; nova aba Mercado com campo de busca, lista e botão "Conversar" reutilizando `getOrCreateConversation` (Fase 3).

**Tech Stack:** Supabase (Postgres + pgTAP), Expo/React Native, Jest (preset jest-expo).

## Global Constraints

- **Grátis** para buscar (descoberta é motor de crescimento); o premium influencia só a **prioridade** na ordenação + badge — nunca esconde resultados de não-premium.
- A função nunca expõe: cartas `guardada`, cartas do próprio chamador, cartas de usuários com bloqueio em qualquer direção, `price_paid`/`price_sold` (dado privado do dono — o preço público é o comunitário, já visível em `price_community`).
- Busca por nome da carta (`ilike`), limite fixo de 50 resultados.
- npm com `--legacy-peer-deps`; testes JS `npx jest <pattern>`; banco `sg docker -c "npx supabase db reset"` / `sg docker -c "npx supabase test db"`.
- UI em pt-BR.

## File Structure

- `supabase/migrations/0013_market_search.sql` — função `search_market_listings(search_text text)`.
- `supabase/tests/database/market_search.test.sql` — pgTAP.
- `src/features/social/marketRepository.ts` (+ test) — `searchMarketListings(query)`.
- `app/(tabs)/market.tsx` — nova aba Mercado (+ `market.test.tsx`).
- `app/(tabs)/_layout.tsx` — registrar aba `market` (entre `catalog` e `value`).

---

### Task 1: search_market_listings (função SQL)

**Files:**
- Create: `supabase/migrations/0013_market_search.sql`
- Test: `supabase/tests/database/market_search.test.sql`

**Interfaces:**
- Produces: `search_market_listings(search_text text) returns table(user_card_id uuid, catalog_card_id uuid, card_name text, card_image_url text, language card_language, condition card_condition, status card_status, seller_id uuid, seller_verified boolean)` — security definer; filtros: `status <> 'guardada'`, `user_id <> auth.uid()`, `not users_blocked(auth.uid(), user_id)`, `card_name ilike '%'||search_text||'%'` (texto vazio retorna tudo); ordenação `seller_verified desc, card_name asc`; `limit 50`. Task 2 usa exatamente esses nomes.

- [x] **Step 1: Write the failing pgTAP test** (`market_search.test.sql` — 6 asserções: carta `a_venda` de outro usuário aparece; carta `guardada` de outro usuário não aparece; a própria carta não aparece; carta de usuário bloqueado não aparece; filtro de busca por nome funciona; vendedor verificado (premium ativo) vem antes do não verificado.)
- [x] **Step 2: Run to verify it fails** — `sg docker -c "npx supabase test db"` → FAIL `function public.search_market_listings(unknown) does not exist`.
- [x] **Step 3: Write the migration** (`0013_market_search.sql`): função security definer com joins em `cards_catalog`, filtros e ordenação acima; `revoke all ... from public` + `grant execute ... to authenticated`.
- [x] **Step 4: Apply and verify** — reset + test db → PASS 6/6 novos + suite completa (64 pgTAP total, incluindo os testes da Fase 12 paralela de preço de referência).
- [x] **Step 5: Commit** — `feat: add market search function for cards listed for sale or trade`

---

### Task 2: marketRepository

**Files:** Create `src/features/social/marketRepository.ts` (+ test).

**Interfaces:**
- Produces: `MarketListing { userCardId; catalogCardId; cardName; cardImageUrl; language; condition; status; sellerId; sellerVerified }`; `searchMarketListings(query: string): Promise<MarketListing[]>` — RPC `search_market_listings` com `{ search_text: query }`; erro vira `throw new Error(message)`.

- [x] Teste `marketRepository` (2 casos: mapeia as linhas do RPC chamado com `{ search_text }`; erro propagado) → red → implementação → green.
- [x] Commit `feat: add market repository`

---

### Task 3: Aba Mercado

**Files:** Create `app/(tabs)/market.tsx` (+ `market.test.tsx`); Modify `app/(tabs)/_layout.tsx`.

**Interfaces:** Consumes Task 2 + `getOrCreateConversation` (Fase 3).

- [ ] Teste de componente (RNTL, mockando `marketRepository`, `chatRepository` e `expo-router`): digitar no campo de busca (testID `market-search-input`) e submeter chama `searchMarketListings` com o texto e renderiza os resultados (nome + status em pt-BR); listing de vendedor verificado mostra badge (testID `market-verified-<userCardId>`); tocar "Conversar" (testID `market-chat-<userCardId>`) chama `getOrCreateConversation(sellerId)` e navega para o chat. → red
- [ ] Implementar `market.tsx`: campo de busca com botão "Buscar" (busca inicial vazia no `useFocusEffect`), lista com imagem/nome/status ("À venda" / "Para troca"), badge "✓ Verificado", botão "Conversar" → `router.push` para o chat; empty state em pt-BR. Registrar `<Tabs.Screen name="market" options={{ title: "Mercado" }} />` após `catalog`. → green
- [ ] Full suite verde (`npx jest && npx tsc --noEmit`) → Commit `feat: add market tab to browse cards for sale or trade`

---

## Self-Review Notes

- **Cobertura do spec:** fecha "aparecem na busca de outros usuários" (Modelo de dados, `user_cards`) e dá efeito real à "prioridade nos resultados de busca" do selo verificado; bloqueio respeitado na busca ("usuário bloqueado para de aparecer em buscas/matches do denunciante" — Fluxos, Fase 3).
- **Privacidade:** função expõe só o recorte público (status ≠ guardada), nunca preços privados do dono; RLS dono-somente de `user_cards` permanece intacto — a exposição é exclusivamente pela função auditável.
- **YAGNI:** sem filtros por idioma/condição/preço (busca por nome cobre o essencial; filtros são refinamento posterior), sem paginação (limit 50), sem preço pedido pelo vendedor (fora do modelo de dados do spec — negociação acontece no chat).
- **Consistência:** função security definer + RPC igual às Fases 5/8/9; aba nova igual às Fases 6/7; badge verificado igual à Fase 11.
