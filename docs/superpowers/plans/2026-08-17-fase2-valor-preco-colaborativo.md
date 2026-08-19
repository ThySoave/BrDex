# BrDex Fase 2 — Gráfico de Valor + Preço Colaborativo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preço de mercado colaborativo por `(carta, idioma)` com mediana e exclusão de outliers, preço de referência externo para cartas EN, e gráfico histórico do valor da coleção do usuário.

**Architecture:** O cálculo colaborativo vive no Postgres como uma view (`price_community`) sobre `user_cards.price_paid`, agregada por carta+idioma com filtro IQR — sem jobs. O histórico de valor usa snapshots diários por usuário (`collection_value_snapshots`) preenchidos por uma função SQL `security definer` agendada via `pg_cron`. O app só lê: um repository de preços por carta e um de snapshots, mais duas UIs (preços na tela de cadastro; nova aba Valor com gráfico de barras feito com Views).

**Tech Stack:** Supabase (Postgres + pgTAP + pg_cron), Expo/React Native, Jest (preset jest-expo).

## Global Constraints

- Nunca misturar mercados de idiomas: toda agregação de preço é chaveada por `(catalog_card_id, language)`.
- Preço de referência externo só existe para `language = 'en'` e é sempre rotulado "Referência internacional" na UI — nunca somado nem misturado ao preço comunitário.
- **Gate de licenciamento:** nenhuma integração TCGplayer é construída neste plano. `price_reference` nasce com semente manual; o sync externo só entra após confirmação formal por escrito do programa de API da TCGplayer (ver Riscos no design spec).
- Outliers: excluídos do cálculo por faixa IQR (`< q1 − 1.5·IQR` ou `> q3 + 1.5·IQR`), sem moderação manual.
- npm sempre com `--legacy-peer-deps`. Testes JS: `npx jest <pattern>`. Banco local: `sg docker -c "npx supabase db reset"` / `sg docker -c "npx supabase test db"` (o wrapper `sg docker` é obrigatório nesta máquina).
- Textos de UI em português (pt-BR). Valores em R$.
- A view `price_community` é deliberadamente **security definer** (dona: postgres): precisa agregar `user_cards` de todos os usuários, atravessando o RLS. Ela só pode expor agregados (mediana/min/max/contagem) — nunca colunas por linha de `user_cards`.

## File Structure

- `supabase/migrations/0002_price_tables.sql` — tabela `price_reference` + view `price_community` + grants.
- `supabase/migrations/0003_collection_value_snapshots.sql` — tabela de snapshots + função `snapshot_collection_values()` + agendamento pg_cron.
- `supabase/tests/database/price_community.test.sql` — pgTAP: mediana, outlier, isolamento por idioma.
- `supabase/tests/database/collection_value_snapshots.test.sql` — pgTAP: snapshot + RLS.
- `src/features/pricing/types.ts` / `pricingRepository.ts` (+ test) — leitura de preços por carta.
- `src/components/CardPrices.tsx` (+ test) — exibição dos dois preços, rotulados.
- `app/card/add.tsx` (modificar) — mostra `CardPrices` da carta sendo cadastrada.
- `src/features/collection/valueRepository.ts` (+ test) — leitura dos snapshots.
- `src/features/collection/valueChart.ts` (+ test) — helper puro que converte snapshots em barras.
- `app/(tabs)/value.tsx` + `app/(tabs)/_layout.tsx` (modificar) — nova aba Valor.

---

### Task 1: Tabela `price_reference` e view `price_community`

**Files:**
- Create: `supabase/migrations/0002_price_tables.sql`
- Test: `supabase/tests/database/price_community.test.sql`

**Interfaces:**
- Produces: tabela `price_reference(id, catalog_card_id, language, price_brl, source, captured_at)` com unique `(catalog_card_id, language)`; view `price_community(catalog_card_id, language, median_price, min_price, max_price, sample_count)`. Tasks 3 e 5 consultam exatamente esses nomes.

- [x] **Step 1: Write the failing pgTAP test**

Create `supabase/tests/database/price_community.test.sql`:

```sql
begin;
select plan(5);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'alice@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'bob@example.com');

insert into public.cards_catalog (id, external_id, name, number, set_name, set_id, rarity, image_url)
values ('33333333-3333-3333-3333-333333333333', 'base1-25', 'Pikachu', '25', 'Base Set', 'base1', 'Common', 'https://example.com/pikachu.png');

-- 5 preços EN: 10, 10, 11, 12 e um outlier 1000 (IQR: q1=10, q3=12 → teto 15)
insert into public.user_cards (user_id, catalog_card_id, language, condition, price_paid, status) values
  ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'en', 'good', 10, 'guardada'),
  ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'en', 'good', 10, 'guardada'),
  ('22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 'en', 'good', 11, 'guardada'),
  ('22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 'en', 'good', 12, 'guardada'),
  ('22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 'en', 'good', 1000, 'guardada');

-- 1 preço PT: mercado separado
insert into public.user_cards (user_id, catalog_card_id, language, condition, price_paid, status) values
  ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'pt', 'good', 50, 'guardada');

select is(
  (select sample_count from public.price_community
   where catalog_card_id = '33333333-3333-3333-3333-333333333333' and language = 'en'),
  4,
  'outlier fica fora da contagem EN'
);

select is(
  (select median_price::numeric from public.price_community
   where catalog_card_id = '33333333-3333-3333-3333-333333333333' and language = 'en'),
  10.5::numeric,
  'mediana EN calculada sem o outlier'
);

select is(
  (select max_price::numeric from public.price_community
   where catalog_card_id = '33333333-3333-3333-3333-333333333333' and language = 'en'),
  12::numeric,
  'max EN ignora o outlier'
);

select is(
  (select median_price::numeric from public.price_community
   where catalog_card_id = '33333333-3333-3333-3333-333333333333' and language = 'pt'),
  50::numeric,
  'mercado PT é separado do EN'
);

-- price_reference aceita uma âncora EN e é única por (carta, idioma)
insert into public.price_reference (catalog_card_id, language, price_brl, source)
values ('33333333-3333-3333-3333-333333333333', 'en', 42.90, 'seed-manual');

select throws_ok(
  $$ insert into public.price_reference (catalog_card_id, language, price_brl, source)
     values ('33333333-3333-3333-3333-333333333333', 'en', 99.99, 'seed-manual') $$,
  23505,
  null,
  'não pode haver duas referências para a mesma (carta, idioma)'
);

select * from finish();
rollback;
```

- [x] **Step 2: Run the test to verify it fails**

```bash
sg docker -c "npx supabase test db"
```

Expected: FAIL — `relation "public.price_community" does not exist`.

- [x] **Step 3: Write the migration**

Create `supabase/migrations/0002_price_tables.sql`:

```sql
create table public.price_reference (
  id uuid primary key default gen_random_uuid(),
  catalog_card_id uuid not null references public.cards_catalog(id) on delete cascade,
  language public.card_language not null,
  price_brl numeric(10,2) not null,
  source text not null,
  captured_at timestamptz not null default now(),
  unique (catalog_card_id, language)
);

alter table public.price_reference enable row level security;

create policy "reference prices are readable by any authenticated user"
  on public.price_reference for select
  to authenticated
  using (true);

grant select on public.price_reference to authenticated;

-- View colaborativa: agrega user_cards de TODOS os usuários (por isso NÃO usa
-- security_invoker — precisa atravessar o RLS de user_cards). Expõe apenas
-- agregados por (carta, idioma); nunca adicionar colunas por linha aqui.
create view public.price_community as
with priced as (
  select catalog_card_id, language, price_paid::numeric as price
  from public.user_cards
  where price_paid is not null
),
bounds as (
  select catalog_card_id, language,
    percentile_cont(0.25) within group (order by price) as q1,
    percentile_cont(0.75) within group (order by price) as q3
  from priced
  group by catalog_card_id, language
),
filtered as (
  select p.catalog_card_id, p.language, p.price
  from priced p
  join bounds b using (catalog_card_id, language)
  where p.price >= b.q1 - 1.5 * (b.q3 - b.q1)
    and p.price <= b.q3 + 1.5 * (b.q3 - b.q1)
)
select
  catalog_card_id,
  language,
  percentile_cont(0.5) within group (order by price) as median_price,
  min(price) as min_price,
  max(price) as max_price,
  count(*)::int as sample_count
from filtered
group by catalog_card_id, language;

grant select on public.price_community to authenticated;
```

- [x] **Step 4: Apply and verify the test passes**

```bash
sg docker -c "npx supabase db reset"
sg docker -c "npx supabase test db"
```

Expected: PASS — todos os testes (novos 5/5 e os 3 da Fase 1).

- [x] **Step 5: Commit**

```bash
git add supabase/
git commit -m "feat: add price_reference table and price_community view with outlier exclusion"
```

---

### Task 2: Snapshots do valor da coleção + agendamento

**Files:**
- Create: `supabase/migrations/0003_collection_value_snapshots.sql`
- Test: `supabase/tests/database/collection_value_snapshots.test.sql`

**Interfaces:**
- Consumes: `price_community` e `price_reference` (Task 1); `user_cards` (Fase 1).
- Produces: tabela `collection_value_snapshots(id, user_id, captured_on, total_value)` com unique `(user_id, captured_on)`; função `public.snapshot_collection_values()`. Task 5 lê `captured_on` e `total_value`.

- [x] **Step 1: Write the failing pgTAP test**

Create `supabase/tests/database/collection_value_snapshots.test.sql`:

```sql
begin;
select plan(4);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'alice@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'bob@example.com');

insert into public.cards_catalog (id, external_id, name, number, set_name, set_id, rarity, image_url)
values ('33333333-3333-3333-3333-333333333333', 'base1-25', 'Pikachu', '25', 'Base Set', 'base1', 'Common', 'https://example.com/pikachu.png');

-- Alice tem 2 cópias EN comunitárias de 10 e 12 (mediana 11 → valor 22).
insert into public.user_cards (user_id, catalog_card_id, language, condition, price_paid, status) values
  ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'en', 'good', 10, 'guardada'),
  ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'en', 'good', 12, 'guardada');

select public.snapshot_collection_values();

select is(
  (select total_value::numeric from public.collection_value_snapshots
   where user_id = '11111111-1111-1111-1111-111111111111' and captured_on = current_date),
  22::numeric,
  'snapshot soma a mediana comunitária por cópia'
);

-- Rodar de novo no mesmo dia atualiza em vez de duplicar
select public.snapshot_collection_values();

select is(
  (select count(*)::int from public.collection_value_snapshots
   where user_id = '11111111-1111-1111-1111-111111111111'),
  1,
  'um snapshot por usuário por dia'
);

-- RLS: Alice não vê snapshot de Bob
insert into public.user_cards (user_id, catalog_card_id, language, condition, price_paid, status) values
  ('22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 'en', 'good', 10, 'guardada');
select public.snapshot_collection_values();

set local role authenticated;
set local "request.jwt.claims" to '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

select is(
  (select count(*)::int from public.collection_value_snapshots),
  1,
  'usuário autenticado só vê os próprios snapshots'
);

select throws_ok(
  $$ insert into public.collection_value_snapshots (user_id, captured_on, total_value)
     values ('11111111-1111-1111-1111-111111111111', current_date - 1, 999) $$,
  42501,
  null,
  'usuário não insere snapshot manualmente'
);

select * from finish();
rollback;
```

- [x] **Step 2: Run the test to verify it fails**

```bash
sg docker -c "npx supabase test db"
```

Expected: FAIL — `function public.snapshot_collection_values() does not exist`.

- [x] **Step 3: Write the migration**

Create `supabase/migrations/0003_collection_value_snapshots.sql`:

```sql
create table public.collection_value_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  captured_on date not null default current_date,
  total_value numeric(12,2) not null,
  unique (user_id, captured_on)
);

alter table public.collection_value_snapshots enable row level security;

create policy "users read their own snapshots"
  on public.collection_value_snapshots for select
  to authenticated
  using (auth.uid() = user_id);

grant select on public.collection_value_snapshots to authenticated;

-- Escrita só pela função abaixo (security definer, dona: postgres).
create function public.snapshot_collection_values()
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.collection_value_snapshots (user_id, captured_on, total_value)
  select
    uc.user_id,
    current_date,
    sum(coalesce(pc.median_price, pr.price_brl, uc.price_paid, 0))
  from public.user_cards uc
  left join public.price_community pc
    on pc.catalog_card_id = uc.catalog_card_id and pc.language = uc.language
  left join public.price_reference pr
    on pr.catalog_card_id = uc.catalog_card_id and pr.language = uc.language
  group by uc.user_id
  on conflict (user_id, captured_on)
  do update set total_value = excluded.total_value;
$$;

-- Agenda diária (03:00 UTC). pg_cron está disponível no Supabase.
create extension if not exists pg_cron;
select cron.schedule(
  'snapshot-collection-values-daily',
  '0 3 * * *',
  $$select public.snapshot_collection_values()$$
);
```

- [x] **Step 4: Apply and verify the test passes**

```bash
sg docker -c "npx supabase db reset"
sg docker -c "npx supabase test db"
```

Expected: PASS — 4/4 novos + todos os anteriores.

- [x] **Step 5: Commit**

```bash
git add supabase/
git commit -m "feat: add daily collection value snapshots with pg_cron schedule"
```

---

### Task 3: Repository de preços no app

**Files:**
- Create: `src/features/pricing/types.ts`
- Create: `src/features/pricing/pricingRepository.ts`
- Test: `src/features/pricing/pricingRepository.test.ts`

**Interfaces:**
- Consumes: `getSupabaseClient` de `src/lib/supabaseClient.ts`; view `price_community` e tabela `price_reference` (Task 1); tipo `CardLanguage` de `src/features/collection/types.ts`.
- Produces: `fetchCardPrices(catalogCardId: string, language: CardLanguage): Promise<CardPricesData>` — Task 4 consome. Tipo `CardPricesData { community: CommunityPrice | null; reference: ReferencePrice | null }`.

- [x] **Step 1: Define the types**

Create `src/features/pricing/types.ts`:

```ts
export interface CommunityPrice {
  medianPrice: number;
  minPrice: number;
  maxPrice: number;
  sampleCount: number;
}

export interface ReferencePrice {
  priceBrl: number;
  source: string;
}

export interface CardPricesData {
  community: CommunityPrice | null;
  reference: ReferencePrice | null;
}
```

- [x] **Step 2: Write the failing test**

Create `src/features/pricing/pricingRepository.test.ts`:

```ts
jest.mock("../../lib/supabaseClient", () => ({
  getSupabaseClient: jest.fn()
}));

import { getSupabaseClient } from "../../lib/supabaseClient";
import { fetchCardPrices } from "./pricingRepository";

function chainReturning(result: unknown) {
  const maybeSingleMock = jest.fn().mockResolvedValue(result);
  const eq2 = jest.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
  const eq1 = jest.fn().mockReturnValue({ eq: eq2 });
  const select = jest.fn().mockReturnValue({ eq: eq1 });
  return { select, eq1, eq2 };
}

describe("fetchCardPrices", () => {
  it("returns community and EN reference prices mapped to camelCase", async () => {
    const community = chainReturning({
      data: { median_price: 10.5, min_price: 10, max_price: 12, sample_count: 4 },
      error: null
    });
    const reference = chainReturning({
      data: { price_brl: 42.9, source: "seed-manual" },
      error: null
    });
    const fromMock = jest.fn((table: string) =>
      table === "price_community" ? { select: community.select } : { select: reference.select }
    );
    (getSupabaseClient as jest.Mock).mockReturnValue({ from: fromMock });

    const result = await fetchCardPrices("card-1", "en");

    expect(fromMock).toHaveBeenCalledWith("price_community");
    expect(fromMock).toHaveBeenCalledWith("price_reference");
    expect(community.eq1).toHaveBeenCalledWith("catalog_card_id", "card-1");
    expect(community.eq2).toHaveBeenCalledWith("language", "en");
    expect(result).toEqual({
      community: { medianPrice: 10.5, minPrice: 10, maxPrice: 12, sampleCount: 4 },
      reference: { priceBrl: 42.9, source: "seed-manual" }
    });
  });

  it("does not query price_reference for non-EN copies", async () => {
    const community = chainReturning({ data: null, error: null });
    const fromMock = jest.fn().mockReturnValue({ select: community.select });
    (getSupabaseClient as jest.Mock).mockReturnValue({ from: fromMock });

    const result = await fetchCardPrices("card-1", "pt");

    expect(fromMock).toHaveBeenCalledTimes(1);
    expect(fromMock).toHaveBeenCalledWith("price_community");
    expect(result).toEqual({ community: null, reference: null });
  });

  it("throws when the community query errors", async () => {
    const community = chainReturning({ data: null, error: { message: "boom" } });
    const fromMock = jest.fn().mockReturnValue({ select: community.select });
    (getSupabaseClient as jest.Mock).mockReturnValue({ from: fromMock });

    await expect(fetchCardPrices("card-1", "en")).rejects.toThrow("boom");
  });
});
```

- [x] **Step 3: Run the test to verify it fails**

Run: `npx jest pricingRepository`
Expected: FAIL — "Cannot find module './pricingRepository'".

- [x] **Step 4: Write the implementation**

Create `src/features/pricing/pricingRepository.ts`:

```ts
import { getSupabaseClient } from "../../lib/supabaseClient";
import type { CardLanguage } from "../collection/types";
import type { CardPricesData } from "./types";

export async function fetchCardPrices(
  catalogCardId: string,
  language: CardLanguage
): Promise<CardPricesData> {
  const client = getSupabaseClient();

  const { data: communityRow, error: communityError } = await client
    .from("price_community")
    .select("median_price, min_price, max_price, sample_count")
    .eq("catalog_card_id", catalogCardId)
    .eq("language", language)
    .maybeSingle();

  if (communityError) {
    throw new Error(communityError.message);
  }

  let reference = null;
  if (language === "en") {
    const { data: referenceRow, error: referenceError } = await client
      .from("price_reference")
      .select("price_brl, source")
      .eq("catalog_card_id", catalogCardId)
      .eq("language", "en")
      .maybeSingle();

    if (referenceError) {
      throw new Error(referenceError.message);
    }

    reference = referenceRow
      ? { priceBrl: referenceRow.price_brl, source: referenceRow.source }
      : null;
  }

  return {
    community: communityRow
      ? {
          medianPrice: communityRow.median_price,
          minPrice: communityRow.min_price,
          maxPrice: communityRow.max_price,
          sampleCount: communityRow.sample_count
        }
      : null,
    reference
  };
}
```

- [x] **Step 5: Run the test to verify it passes**

Run: `npx jest pricingRepository`
Expected: PASS — 3 tests passed.

- [x] **Step 6: Commit**

```bash
git add src/features/pricing/
git commit -m "feat: add pricing repository reading community and reference prices"
```

---

### Task 4: Componente `CardPrices` na tela de cadastro

**Files:**
- Create: `src/components/CardPrices.tsx`
- Test: `src/components/CardPrices.test.tsx`
- Modify: `app/card/add.tsx` (renderizar `CardPrices` acima do formulário; re-buscar quando o idioma muda)

**Interfaces:**
- Consumes: `fetchCardPrices` e `CardPricesData` (Task 3); `CardLanguage` (Fase 1).
- Produces: componente `CardPrices({ catalogCardId, language })` — busca sozinho via `fetchCardPrices` e renderiza.

- [x] **Step 1: Write the failing test**

Create `src/components/CardPrices.test.tsx`:

```tsx
jest.mock("../features/pricing/pricingRepository", () => ({
  fetchCardPrices: jest.fn()
}));

import { render, waitFor } from "@testing-library/react-native";
import { fetchCardPrices } from "../features/pricing/pricingRepository";
import { CardPrices } from "./CardPrices";

describe("CardPrices", () => {
  it("shows community median with sample count and labeled EN reference", async () => {
    (fetchCardPrices as jest.Mock).mockResolvedValue({
      community: { medianPrice: 10.5, minPrice: 10, maxPrice: 12, sampleCount: 4 },
      reference: { priceBrl: 42.9, source: "seed-manual" }
    });

    const { getByTestId } = render(<CardPrices catalogCardId="card-1" language="en" />);

    await waitFor(() => {
      expect(getByTestId("community-price").props.children.join("")).toContain("R$ 10,50");
      expect(getByTestId("community-price").props.children.join("")).toContain("4");
      expect(getByTestId("reference-price").props.children.join("")).toContain("Referência internacional");
      expect(getByTestId("reference-price").props.children.join("")).toContain("R$ 42,90");
    });
  });

  it("shows a placeholder when there is no community price yet", async () => {
    (fetchCardPrices as jest.Mock).mockResolvedValue({ community: null, reference: null });

    const { getByTestId, queryByTestId } = render(
      <CardPrices catalogCardId="card-1" language="pt" />
    );

    await waitFor(() => {
      expect(getByTestId("community-price-empty")).toBeTruthy();
      expect(queryByTestId("reference-price")).toBeNull();
    });
  });
});
```

- [x] **Step 2: Run the test to verify it fails**

Run: `npx jest CardPrices`
Expected: FAIL — "Cannot find module './CardPrices'".

- [x] **Step 3: Write the component**

Create `src/components/CardPrices.tsx`:

```tsx
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { fetchCardPrices } from "../features/pricing/pricingRepository";
import type { CardPricesData } from "../features/pricing/types";
import type { CardLanguage } from "../features/collection/types";

function formatBrl(value: number): string {
  return `R$ ${value.toFixed(2).replace(".", ",")}`;
}

export function CardPrices({
  catalogCardId,
  language
}: {
  catalogCardId: string;
  language: CardLanguage;
}) {
  const [prices, setPrices] = useState<CardPricesData | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchCardPrices(catalogCardId, language)
      .then((data) => {
        if (!cancelled) setPrices(data);
      })
      .catch(() => {
        if (!cancelled) setPrices({ community: null, reference: null });
      });
    return () => {
      cancelled = true;
    };
  }, [catalogCardId, language]);

  if (!prices) {
    return null;
  }

  return (
    <View style={{ marginBottom: 16 }}>
      {prices.community ? (
        <Text testID="community-price">
          {"Preço comunitário (BR): "}
          {formatBrl(prices.community.medianPrice)}
          {" · "}
          {prices.community.sampleCount}
          {" registros"}
        </Text>
      ) : (
        <Text testID="community-price-empty">Ainda sem preço comunitário para esta carta.</Text>
      )}
      {prices.reference ? (
        <Text testID="reference-price" style={{ color: "#666" }}>
          {"Referência internacional: "}
          {formatBrl(prices.reference.priceBrl)}
        </Text>
      ) : null}
    </View>
  );
}
```

- [x] **Step 4: Run the test to verify it passes**

Run: `npx jest CardPrices`
Expected: PASS — 2 tests passed.

- [x] **Step 5: Wire into the add-card screen**

Modify `app/card/add.tsx` — adicionar o import no topo, junto aos demais:

```tsx
import { CardPrices } from "../../src/components/CardPrices";
```

E dentro do `ScrollView`, como primeiro elemento (antes de `<Text>Idioma</Text>`):

```tsx
      {catalogCardId ? <CardPrices catalogCardId={catalogCardId} language={language} /> : null}
```

(Como o componente recebe `language` do estado da tela, trocar o idioma re-busca o preço do mercado certo automaticamente.)

- [x] **Step 6: Run the full suite**

Run: `npx jest`
Expected: PASS — todos os testes.

- [x] **Step 7: Commit**

```bash
git add src/components/ app/card/add.tsx
git commit -m "feat: show community and reference prices on the add-card screen"
```

---

### Task 5: Repository de snapshots de valor

**Files:**
- Create: `src/features/collection/valueRepository.ts`
- Test: `src/features/collection/valueRepository.test.ts`

**Interfaces:**
- Consumes: `getSupabaseClient`; tabela `collection_value_snapshots` (Task 2).
- Produces: `fetchValueSnapshots(): Promise<ValueSnapshot[]>` com `ValueSnapshot { capturedOn: string; totalValue: number }`, ordenado do mais antigo ao mais recente — Task 6 consome.

- [x] **Step 1: Write the failing test**

Create `src/features/collection/valueRepository.test.ts`:

```ts
jest.mock("../../lib/supabaseClient", () => ({
  getSupabaseClient: jest.fn()
}));

import { getSupabaseClient } from "../../lib/supabaseClient";
import { fetchValueSnapshots } from "./valueRepository";

describe("fetchValueSnapshots", () => {
  it("reads snapshots ordered by captured_on ascending and maps to camelCase", async () => {
    const orderMock = jest.fn().mockResolvedValue({
      data: [
        { captured_on: "2026-08-16", total_value: 120.5 },
        { captured_on: "2026-08-17", total_value: 130 }
      ],
      error: null
    });
    const selectMock = jest.fn().mockReturnValue({ order: orderMock });
    const fromMock = jest.fn().mockReturnValue({ select: selectMock });
    (getSupabaseClient as jest.Mock).mockReturnValue({ from: fromMock });

    const result = await fetchValueSnapshots();

    expect(fromMock).toHaveBeenCalledWith("collection_value_snapshots");
    expect(selectMock).toHaveBeenCalledWith("captured_on, total_value");
    expect(orderMock).toHaveBeenCalledWith("captured_on", { ascending: true });
    expect(result).toEqual([
      { capturedOn: "2026-08-16", totalValue: 120.5 },
      { capturedOn: "2026-08-17", totalValue: 130 }
    ]);
  });

  it("throws when Supabase returns an error", async () => {
    const orderMock = jest.fn().mockResolvedValue({ data: null, error: { message: "down" } });
    const selectMock = jest.fn().mockReturnValue({ order: orderMock });
    const fromMock = jest.fn().mockReturnValue({ select: selectMock });
    (getSupabaseClient as jest.Mock).mockReturnValue({ from: fromMock });

    await expect(fetchValueSnapshots()).rejects.toThrow("down");
  });
});
```

- [x] **Step 2: Run the test to verify it fails**

Run: `npx jest valueRepository`
Expected: FAIL — "Cannot find module './valueRepository'".

- [x] **Step 3: Write the implementation**

Create `src/features/collection/valueRepository.ts`:

```ts
import { getSupabaseClient } from "../../lib/supabaseClient";

export interface ValueSnapshot {
  capturedOn: string;
  totalValue: number;
}

export async function fetchValueSnapshots(): Promise<ValueSnapshot[]> {
  const { data, error } = await getSupabaseClient()
    .from("collection_value_snapshots")
    .select("captured_on, total_value")
    .order("captured_on", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    capturedOn: row.captured_on,
    totalValue: row.total_value
  }));
}
```

(O RLS da Task 2 garante que só vêm os snapshots do próprio usuário — não precisa de filtro por `user_id` no cliente.)

- [x] **Step 4: Run the test to verify it passes**

Run: `npx jest valueRepository`
Expected: PASS — 2 tests passed.

- [x] **Step 5: Commit**

```bash
git add src/features/collection/valueRepository.ts src/features/collection/valueRepository.test.ts
git commit -m "feat: add collection value snapshots repository"
```

---

### Task 6: Aba Valor com gráfico de barras

**Files:**
- Create: `src/features/collection/valueChart.ts`
- Test: `src/features/collection/valueChart.test.ts`
- Create: `app/(tabs)/value.tsx`
- Modify: `app/(tabs)/_layout.tsx` (registrar a aba)

**Interfaces:**
- Consumes: `fetchValueSnapshots` / `ValueSnapshot` (Task 5).
- Produces: `buildChartBars(snapshots: ValueSnapshot[], maxBarHeight: number): ChartBar[]` com `ChartBar { label: string; height: number; value: number }` — alturas normalizadas pelo maior valor da série.

- [x] **Step 1: Write the failing test for the pure helper**

Create `src/features/collection/valueChart.test.ts`:

```ts
import { buildChartBars } from "./valueChart";

describe("buildChartBars", () => {
  it("normalizes heights against the max value and labels with day/month", () => {
    const bars = buildChartBars(
      [
        { capturedOn: "2026-08-15", totalValue: 50 },
        { capturedOn: "2026-08-16", totalValue: 100 },
        { capturedOn: "2026-08-17", totalValue: 25 }
      ],
      120
    );

    expect(bars).toEqual([
      { label: "15/08", height: 60, value: 50 },
      { label: "16/08", height: 120, value: 100 },
      { label: "17/08", height: 30, value: 25 }
    ]);
  });

  it("keeps only the most recent 30 snapshots", () => {
    const snapshots = Array.from({ length: 40 }, (_, i) => ({
      capturedOn: `2026-07-${String(i + 1).padStart(2, "0")}`,
      totalValue: i + 1
    }));

    const bars = buildChartBars(snapshots, 100);

    expect(bars).toHaveLength(30);
    expect(bars[bars.length - 1].value).toBe(40);
  });

  it("returns an empty array when every value is zero", () => {
    expect(buildChartBars([{ capturedOn: "2026-08-17", totalValue: 0 }], 100)).toEqual([]);
  });
});
```

- [x] **Step 2: Run the test to verify it fails**

Run: `npx jest valueChart`
Expected: FAIL — "Cannot find module './valueChart'".

- [x] **Step 3: Write the pure helper**

Create `src/features/collection/valueChart.ts`:

```ts
import type { ValueSnapshot } from "./valueRepository";

export interface ChartBar {
  label: string;
  height: number;
  value: number;
}

const MAX_BARS = 30;

export function buildChartBars(snapshots: ValueSnapshot[], maxBarHeight: number): ChartBar[] {
  const recent = snapshots.slice(-MAX_BARS);
  const maxValue = Math.max(...recent.map((s) => s.totalValue), 0);

  if (maxValue === 0) {
    return [];
  }

  return recent.map((snapshot) => {
    const [, month, day] = snapshot.capturedOn.split("-");
    return {
      label: `${day}/${month}`,
      height: Math.round((snapshot.totalValue / maxValue) * maxBarHeight),
      value: snapshot.totalValue
    };
  });
}
```

- [x] **Step 4: Run the test to verify it passes**

Run: `npx jest valueChart`
Expected: PASS — 3 tests passed.

- [x] **Step 5: Build the screen**

Create `app/(tabs)/value.tsx`:

```tsx
import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { fetchValueSnapshots, type ValueSnapshot } from "../../src/features/collection/valueRepository";
import { buildChartBars } from "../../src/features/collection/valueChart";

const BAR_MAX_HEIGHT = 160;

export default function ValueScreen() {
  const [snapshots, setSnapshots] = useState<ValueSnapshot[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchValueSnapshots()
      .then(setSnapshots)
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar valores"));
  }, []);

  if (error) {
    return (
      <View style={{ flex: 1, padding: 16 }}>
        <Text>{error}</Text>
      </View>
    );
  }

  const bars = buildChartBars(snapshots, BAR_MAX_HEIGHT);
  const latest = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;

  if (!latest || bars.length === 0) {
    return (
      <View style={{ flex: 1, padding: 16 }}>
        <Text testID="value-empty">
          Ainda sem histórico de valor. Cadastre cartas com preço e volte amanhã — o valor da
          coleção é calculado diariamente.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text testID="value-current" style={{ fontSize: 24, fontWeight: "bold" }}>
        {`R$ ${latest.totalValue.toFixed(2).replace(".", ",")}`}
      </Text>
      <Text style={{ color: "#666", marginBottom: 16 }}>Valor estimado da coleção</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: "row", alignItems: "flex-end", height: BAR_MAX_HEIGHT + 24 }}>
          {bars.map((bar) => (
            <View key={bar.label} style={{ alignItems: "center", marginRight: 6 }}>
              <View
                testID={`value-bar-${bar.label}`}
                style={{ width: 16, height: bar.height, backgroundColor: "#4a90d9", borderRadius: 3 }}
              />
              <Text style={{ fontSize: 9, marginTop: 4 }}>{bar.label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
```

- [x] **Step 6: Register the tab**

Modify `app/(tabs)/_layout.tsx` — substituir o conteúdo por:

```tsx
import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="album" options={{ title: "Álbum" }} />
      <Tabs.Screen name="catalog" options={{ title: "Catálogo" }} />
      <Tabs.Screen name="value" options={{ title: "Valor" }} />
    </Tabs>
  );
}
```

- [x] **Step 7: Run the full suite and the type check**

Run: `npx jest && npx tsc --noEmit`
Expected: todos os testes passam; tsc sem erros.

- [x] **Step 8: Commit**

```bash
git add src/features/collection/valueChart.ts src/features/collection/valueChart.test.ts "app/(tabs)/value.tsx" "app/(tabs)/_layout.tsx"
git commit -m "feat: add collection value tab with daily history chart"
```

---

## Self-Review Notes

- **Cobertura do spec (Fase 2):** preço colaborativo por (carta, idioma) com mediana e outliers → Task 1; referência internacional EN rotulada e nunca misturada → Tasks 1, 3, 4; gráfico de valor ao longo do tempo → Tasks 2, 5, 6. Gate de licenciamento TCGplayer respeitado: nenhuma integração externa construída, `price_reference` aceita semente manual.
- **Tipos consistentes entre tasks:** `CardPricesData`/`fetchCardPrices` (Task 3 → 4), `ValueSnapshot`/`fetchValueSnapshots` (Task 5 → 6), colunas SQL `median_price`/`sample_count`/`captured_on`/`total_value` idênticas entre migrations, testes pgTAP e repositories.
- **Recorte premium (histórico completo vs. recorte) fica para a Fase 4** — aqui todo usuário vê os últimos 30 dias (`MAX_BARS`), o que já implementa o "recorte menor" gratuito do spec.
- **Nota pg_cron:** no Supabase hospedado o `cron.schedule` roda como está; no stack local o worker do pg_cron pode não disparar, mas a função é testada diretamente via pgTAP (Task 2), que é o que valida a lógica.
