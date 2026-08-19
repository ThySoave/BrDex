# BrDex Fase 1 — Conta + Catálogo + Álbum Pessoal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first shippable slice of BrDex — a user can create an account, browse the synced Pokémon TCG catalog, register their own physical cards, and see them in a personal digital album.

**Architecture:** Expo (React Native + TypeScript) app using file-based routing (Expo Router), talking directly to a Supabase project (Postgres + Auth + Storage) via `@supabase/supabase-js`. Business logic lives in plain, framework-free "repository" modules under `src/features/*` so it is unit-testable with Jest without rendering any UI. The Pokémon TCG catalog is mirrored into our own `cards_catalog` table by a Supabase Edge Function (Deno) that runs on a schedule — the app never calls the external Pokémon TCG API directly.

**Tech Stack:** Expo SDK 51+, TypeScript, Expo Router, `@supabase/supabase-js` v2, Supabase CLI (local Postgres via Docker), Jest + `jest-expo` + `@testing-library/react-native`, Deno (bundled with Supabase CLI) for the Edge Function, `expo-auth-session` + `expo-web-browser` for Google OAuth, pgTAP for database policy tests.

## Global Constraints

- App is one codebase for iOS and Android (React Native + Expo) — no platform-specific forks.
- Backend is Supabase (Postgres + Auth + Storage + Realtime). Every table holding user data MUST have Row Level Security enabled with an explicit policy — no table is left with RLS disabled "for now."
- Authentication supports email/password AND Google OAuth via Supabase Auth.
- Card condition ("estado de conservação") is a fixed enum, never free text: `mint`, `near_mint`, `excellent`, `good`, `played`, `damaged`.
- Every user card (`user_cards`) has a `status` of exactly one of: `guardada`, `a_venda`, `disponivel_troca`. Only rows where `status != 'guardada'` are visible to other users (enforced in this phase's plan; cross-user visibility itself is built in Fase 3, but the column and policy shape must support it from day one).
- The app never calls the Pokémon TCG API directly — only a scheduled Supabase Edge Function does, writing into `cards_catalog`.
- Language of the physical card (`idioma`: `en`, `pt`, `jp`, `other`) is a separate field from the catalog card — the catalog identifies the artwork/number, not the language.

---

## File Structure

```
BrDex/
  app.json
  package.json
  tsconfig.json
  babel.config.js
  jest.config.js
  jest.setup.js
  .env.example
  app/                                    # Expo Router screens (thin — call src/features/*)
    _layout.tsx                           # Root layout, wraps app in auth state provider
    index.tsx                             # Redirects to (auth)/login or (tabs)/album
    (auth)/
      _layout.tsx
      login.tsx
      signup.tsx
    (tabs)/
      _layout.tsx
      album.tsx                           # Personal album (home)
      catalog.tsx                         # Catalog search screen
    card/
      add.tsx                             # Register a user's physical card
  src/
    lib/
      supabaseClient.ts                   # createClient() wrapper, env validation
      supabaseClient.test.ts
    features/
      auth/
        authRepository.ts                 # signUp, signIn, signOut, getSession, onAuthStateChange
        authRepository.test.ts
        googleAuth.ts                     # pure redirect URI builder for expo-auth-session
        googleAuth.test.ts
      catalog/
        catalogRepository.ts              # fetchCatalogPage, searchCatalog (Supabase queries)
        catalogRepository.test.ts
        catalogSearch.ts                  # pure client-side filter/sort helper
        catalogSearch.test.ts
        types.ts                          # CatalogCard type
      collection/
        conditionScale.ts                 # fixed CARD_CONDITIONS list + labels
        conditionScale.test.ts
        collectionRepository.ts           # addUserCard, listUserCards
        collectionRepository.test.ts
        types.ts                          # UserCard, CardStatus, CardLanguage types
    components/
      CardGridItem.tsx                    # thumbnail used by both album and catalog screens
  supabase/
    config.toml
    migrations/
      0001_init_schema.sql                # cards_catalog, user_cards, RLS policies
    tests/
      database/
        user_cards_rls.test.sql           # pgTAP test for RLS
    functions/
      sync-catalog/
        index.ts                          # Deno Edge Function entrypoint
        transform.ts                      # pure mapping: raw Pokémon TCG API card -> DB row
        transform.test.ts                 # Deno test
```

**Responsibility boundaries:**
- `app/**` files are thin screens: they call hooks/repositories from `src/features/**` and render. No Supabase calls directly inside a screen file.
- `src/features/<domain>/*Repository.ts` is the only place that talks to `@supabase/supabase-js`. Every repository function is testable by mocking the Supabase client.
- `src/features/<domain>/*.ts` (non-repository files) hold pure logic (filtering, validation, constants) with zero dependencies on React Native or Supabase — cheapest possible unit tests.
- `supabase/functions/sync-catalog/transform.ts` is pure and Deno-testable in isolation from network calls.

---

### Task 1: Scaffold the Expo project and testing pipeline

**Files:**
- Create: `package.json`, `tsconfig.json`, `babel.config.js`, `jest.config.js`, `jest.setup.js`, `app.json`
- Create: `app/_layout.tsx`, `app/index.tsx`
- Test: `src/lib/sanity.test.ts`

**Interfaces:**
- Produces: a working `npm test` command and a working `npx expo start` command that later tasks build on.

- [x] **Step 1: Create the Expo app**

```bash
cd "/home/tsc/Documents/TSC/Testes/BrDex"
yes | npx create-expo-app@latest . --template blank-typescript
```

The directory is non-empty (it contains `docs/` and `.git`), so `create-expo-app` asks for
confirmation before proceeding; `yes |` answers that prompt non-interactively so the command
does not hang.

- [x] **Step 2: Install Expo Router and its peer dependencies**

```bash
npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar
```

- [x] **Step 3: Configure Expo Router as the entry point**

Edit `package.json`, set:

```json
{
  "main": "expo-router/entry"
}
```

Edit `app.json`, add inside `"expo"`:

```json
{
  "expo": {
    "scheme": "brdex",
    "plugins": ["expo-router"]
  }
}
```

- [x] **Step 4: Create the root layout and index redirect**

Create `app/_layout.tsx`:

```tsx
import { Stack } from "expo-router";

export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

Create `app/index.tsx`:

```tsx
import { Redirect } from "expo-router";

export default function Index() {
  return <Redirect href="/(auth)/login" />;
}
```

- [x] **Step 5: Install and configure Jest**

```bash
npx expo install jest-expo jest @types/jest --dev
npm install --save-dev @testing-library/react-native
```

Create `jest.config.js`:

```js
module.exports = {
  preset: "jest-expo",
  setupFilesAfterEach: [],
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)"
  ]
};
```

Add to `package.json` scripts:

```json
{
  "scripts": {
    "start": "expo start",
    "test": "jest"
  }
}
```

- [x] **Step 6: Write the failing sanity test**

Create `src/lib/sanity.test.ts`:

```ts
describe("test pipeline", () => {
  it("runs a basic assertion", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [x] **Step 7: Run the test to verify the pipeline works**

Run: `npm test`
Expected: PASS — 1 test passed.

- [x] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold Expo Router app with Jest test pipeline"
```

---

### Task 2: Database schema and RLS policies

**Files:**
- Create: `supabase/config.toml` (via `supabase init`)
- Create: `supabase/migrations/0001_init_schema.sql`
- Create: `supabase/tests/database/user_cards_rls.test.sql`

**Interfaces:**
- Produces: `cards_catalog(id, name, number, set_name, set_id, rarity, image_url, created_at)` and `user_cards(id, user_id, catalog_card_id, language, condition, price_paid, price_sold, photo_url, status, created_at, updated_at)`. Later tasks (3, 8, 10) query these exact column names.

- [x] **Step 1: Install the Supabase CLI and initialize the project**

```bash
npm install --save-dev supabase
npx supabase init
```

Confirm `supabase/config.toml` was created.

- [x] **Step 2: Start the local Supabase stack**

```bash
npx supabase start
```

Expected: output includes `API URL`, `anon key`, `service_role key` — keep this terminal running or note the printed keys.

- [x] **Step 3: Write the failing RLS test**

Create `supabase/tests/database/user_cards_rls.test.sql`:

```sql
begin;
select plan(3);

-- Two fake users
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'alice@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'bob@example.com');

insert into public.cards_catalog (id, name, number, set_name, set_id, rarity, image_url)
values ('33333333-3333-3333-3333-333333333333', 'Pikachu', '25', 'Base Set', 'base1', 'Common', 'https://example.com/pikachu.png');

-- Alice inserts her own card as Alice
set local role authenticated;
set local "request.jwt.claims" to '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

insert into public.user_cards (user_id, catalog_card_id, language, condition, status)
values ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'en', 'near_mint', 'guardada');

select is(
  (select count(*)::int from public.user_cards where user_id = '11111111-1111-1111-1111-111111111111'),
  1,
  'Alice can insert her own card'
);

-- Bob should not see Alice's guardada card
set local "request.jwt.claims" to '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';

select is(
  (select count(*)::int from public.user_cards),
  0,
  'Bob cannot see Alice''s card while it is guardada'
);

-- Bob cannot insert a card on Alice's behalf
select throws_ok(
  $$ insert into public.user_cards (user_id, catalog_card_id, language, condition, status)
     values ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'en', 'good', 'guardada') $$,
  'new row violates row-level security policy for table "user_cards"'
);

select * from finish();
rollback;
```

- [x] **Step 4: Run the test to verify it fails**

```bash
npx supabase test db
```

Expected: FAIL — `relation "public.cards_catalog" does not exist` (no migration yet).

- [x] **Step 5: Write the migration**

Create `supabase/migrations/0001_init_schema.sql`:

```sql
create extension if not exists pgcrypto;

create table public.cards_catalog (
  id uuid primary key default gen_random_uuid(),
  external_id text unique not null,
  name text not null,
  number text not null,
  set_name text not null,
  set_id text not null,
  rarity text,
  image_url text not null,
  created_at timestamptz not null default now()
);

alter table public.cards_catalog enable row level security;

create policy "catalog is readable by any authenticated user"
  on public.cards_catalog for select
  to authenticated
  using (true);

create type public.card_language as enum ('en', 'pt', 'jp', 'other');
create type public.card_condition as enum ('mint', 'near_mint', 'excellent', 'good', 'played', 'damaged');
create type public.card_status as enum ('guardada', 'a_venda', 'disponivel_troca');

create table public.user_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  catalog_card_id uuid not null references public.cards_catalog(id),
  language public.card_language not null,
  condition public.card_condition not null,
  price_paid numeric(10,2),
  price_sold numeric(10,2),
  photo_url text,
  status public.card_status not null default 'guardada',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_cards enable row level security;

create policy "users can select their own cards"
  on public.user_cards for select
  to authenticated
  using (auth.uid() = user_id);

create policy "users can insert their own cards"
  on public.user_cards for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "users can update their own cards"
  on public.user_cards for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users can delete their own cards"
  on public.user_cards for delete
  to authenticated
  using (auth.uid() = user_id);

create index user_cards_user_id_idx on public.user_cards (user_id);
create index user_cards_catalog_card_id_idx on public.user_cards (catalog_card_id);
create index cards_catalog_name_idx on public.cards_catalog using gin (to_tsvector('simple', name));
```

- [x] **Step 6: Apply the migration and run the test again**

```bash
npx supabase db reset
npx supabase test db
```

Expected: PASS — 3/3 assertions pass.

- [x] **Step 7: Commit**

```bash
git add supabase/
git commit -m "feat: add cards_catalog and user_cards schema with RLS policies"
```

---

### Task 3: Supabase client wrapper

**Files:**
- Create: `src/lib/supabaseClient.ts`
- Test: `src/lib/supabaseClient.test.ts`
- Create: `.env.example`

**Interfaces:**
- Consumes: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` env vars.
- Produces: `getSupabaseClient(): SupabaseClient` — every repository in later tasks imports this.

- [x] **Step 1: Install the Supabase JS client**

```bash
npx expo install @supabase/supabase-js @react-native-async-storage/async-storage
```

- [x] **Step 2: Write the failing test**

Create `src/lib/supabaseClient.test.ts`:

```ts
describe("getSupabaseClient", () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it("throws when EXPO_PUBLIC_SUPABASE_URL is missing", () => {
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    const { getSupabaseClient } = require("./supabaseClient");
    expect(() => getSupabaseClient()).toThrow(
      "Missing EXPO_PUBLIC_SUPABASE_URL environment variable"
    );
  });

  it("returns a client when both env vars are set", () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    const { getSupabaseClient } = require("./supabaseClient");
    const client = getSupabaseClient();
    expect(client).toBeDefined();
    expect(typeof client.from).toBe("function");
  });
});
```

- [x] **Step 2: Run the test to verify it fails**

Run: `npm test -- supabaseClient`
Expected: FAIL with "Cannot find module './supabaseClient'".

- [x] **Step 3: Write the implementation**

Create `src/lib/supabaseClient.ts`:

```ts
import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

let cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (cachedClient) {
    return cachedClient;
  }

  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) {
    throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL environment variable");
  }
  if (!anonKey) {
    throw new Error("Missing EXPO_PUBLIC_SUPABASE_ANON_KEY environment variable");
  }

  cachedClient = createClient(url, anonKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false
    }
  });

  return cachedClient;
}
```

```bash
npx expo install react-native-url-polyfill
```

- [x] **Step 4: Run the test to verify it passes**

Run: `npm test -- supabaseClient`
Expected: PASS — 2 tests passed.

- [x] **Step 5: Document the env vars**

Create `.env.example`:

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

- [x] **Step 6: Commit**

```bash
git add src/lib/ .env.example package.json
git commit -m "feat: add Supabase client wrapper with env validation"
```

---

### Task 4: Auth repository

**Files:**
- Create: `src/features/auth/authRepository.ts`
- Test: `src/features/auth/authRepository.test.ts`

**Interfaces:**
- Consumes: `getSupabaseClient` from `src/lib/supabaseClient.ts` (Task 3).
- Produces: `signUp(email: string, password: string): Promise<void>`, `signIn(email: string, password: string): Promise<void>`, `signOut(): Promise<void>`, `getSession(): Promise<Session | null>` — Task 5 (screens) and Task 9's account gating call these.

- [x] **Step 1: Write the failing test**

Create `src/features/auth/authRepository.test.ts`:

```ts
jest.mock("../../lib/supabaseClient", () => ({
  getSupabaseClient: jest.fn()
}));

import { getSupabaseClient } from "../../lib/supabaseClient";
import { signUp, signIn, signOut, getSession } from "./authRepository";

describe("authRepository", () => {
  const mockAuth = {
    signUp: jest.fn(),
    signInWithPassword: jest.fn(),
    signOut: jest.fn(),
    getSession: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getSupabaseClient as jest.Mock).mockReturnValue({ auth: mockAuth });
  });

  it("signUp calls supabase auth.signUp and throws on error", async () => {
    mockAuth.signUp.mockResolvedValue({ error: null });
    await signUp("a@b.com", "password123");
    expect(mockAuth.signUp).toHaveBeenCalledWith({
      email: "a@b.com",
      password: "password123"
    });
  });

  it("signUp throws the Supabase error message on failure", async () => {
    mockAuth.signUp.mockResolvedValue({ error: { message: "Email already in use" } });
    await expect(signUp("a@b.com", "password123")).rejects.toThrow("Email already in use");
  });

  it("signIn calls supabase auth.signInWithPassword", async () => {
    mockAuth.signInWithPassword.mockResolvedValue({ error: null });
    await signIn("a@b.com", "password123");
    expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({
      email: "a@b.com",
      password: "password123"
    });
  });

  it("signOut calls supabase auth.signOut", async () => {
    mockAuth.signOut.mockResolvedValue({ error: null });
    await signOut();
    expect(mockAuth.signOut).toHaveBeenCalled();
  });

  it("getSession returns the session from Supabase", async () => {
    const fakeSession = { user: { id: "123" } };
    mockAuth.getSession.mockResolvedValue({ data: { session: fakeSession } });
    const session = await getSession();
    expect(session).toBe(fakeSession);
  });
});
```

- [x] **Step 2: Run the test to verify it fails**

Run: `npm test -- authRepository`
Expected: FAIL with "Cannot find module './authRepository'".

- [x] **Step 3: Write the implementation**

Create `src/features/auth/authRepository.ts`:

```ts
import type { Session } from "@supabase/supabase-js";
import { getSupabaseClient } from "../../lib/supabaseClient";

export async function signUp(email: string, password: string): Promise<void> {
  const { error } = await getSupabaseClient().auth.signUp({ email, password });
  if (error) {
    throw new Error(error.message);
  }
}

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await getSupabaseClient().auth.signInWithPassword({ email, password });
  if (error) {
    throw new Error(error.message);
  }
}

export async function signOut(): Promise<void> {
  const { error } = await getSupabaseClient().auth.signOut();
  if (error) {
    throw new Error(error.message);
  }
}

export async function getSession(): Promise<Session | null> {
  const {
    data: { session }
  } = await getSupabaseClient().auth.getSession();
  return session;
}
```

- [x] **Step 4: Run the test to verify it passes**

Run: `npm test -- authRepository`
Expected: PASS — 5 tests passed.

- [x] **Step 5: Commit**

```bash
git add src/features/auth/
git commit -m "feat: add auth repository wrapping Supabase email/password auth"
```

---

### Task 5: Login and signup screens

**Files:**
- Create: `app/(auth)/_layout.tsx`, `app/(auth)/login.tsx`, `app/(auth)/signup.tsx`
- Test: `app/(auth)/login.test.tsx`

**Interfaces:**
- Consumes: `signIn`, `signUp` from `src/features/auth/authRepository.ts` (Task 4).

- [x] **Step 1: Write the failing test**

Create `app/(auth)/login.test.tsx`:

```tsx
jest.mock("../../src/features/auth/authRepository", () => ({
  signIn: jest.fn()
}));
jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: jest.fn() }),
  Link: ({ children }: { children: React.ReactNode }) => children
}));

import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { signIn } from "../../src/features/auth/authRepository";
import LoginScreen from "./login";

describe("LoginScreen", () => {
  it("calls signIn with the entered email and password", async () => {
    (signIn as jest.Mock).mockResolvedValue(undefined);
    const { getByTestId } = render(<LoginScreen />);

    fireEvent.changeText(getByTestId("login-email"), "a@b.com");
    fireEvent.changeText(getByTestId("login-password"), "password123");
    fireEvent.press(getByTestId("login-submit"));

    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith("a@b.com", "password123");
    });
  });
});
```

- [x] **Step 2: Run the test to verify it fails**

Run: `npm test -- login.test`
Expected: FAIL with "Cannot find module './login'".

- [x] **Step 3: Write the implementation**

Create `app/(auth)/_layout.tsx`:

```tsx
import { Stack } from "expo-router";

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

Create `app/(auth)/login.tsx`:

```tsx
import { useState } from "react";
import { View, TextInput, Text, Pressable } from "react-native";
import { useRouter, Link } from "expo-router";
import { signIn } from "../../src/features/auth/authRepository";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit() {
    setError(null);
    try {
      await signIn(email, password);
      router.replace("/(tabs)/album");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao entrar");
    }
  }

  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 24 }}>
      <Text>Entrar no BrDex</Text>
      <TextInput
        testID="login-email"
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        testID="login-password"
        placeholder="Senha"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {error ? <Text style={{ color: "red" }}>{error}</Text> : null}
      <Pressable testID="login-submit" onPress={handleSubmit}>
        <Text>Entrar</Text>
      </Pressable>
      <Link href="/(auth)/signup">Criar conta</Link>
    </View>
  );
}
```

Create `app/(auth)/signup.tsx`:

```tsx
import { useState } from "react";
import { View, TextInput, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { signUp } from "../../src/features/auth/authRepository";

export default function SignupScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit() {
    setError(null);
    try {
      await signUp(email, password);
      router.replace("/(tabs)/album");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar conta");
    }
  }

  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 24 }}>
      <Text>Criar conta no BrDex</Text>
      <TextInput
        testID="signup-email"
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        testID="signup-password"
        placeholder="Senha"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {error ? <Text style={{ color: "red" }}>{error}</Text> : null}
      <Pressable testID="signup-submit" onPress={handleSubmit}>
        <Text>Criar conta</Text>
      </Pressable>
    </View>
  );
}
```

- [x] **Step 4: Run the test to verify it passes**

Run: `npm test -- login.test`
Expected: PASS — 1 test passed.

- [x] **Step 5: Commit**

```bash
git add app/
git commit -m "feat: add login and signup screens"
```

---

### Task 6: Google OAuth redirect helper

**Files:**
- Create: `src/features/auth/googleAuth.ts`
- Test: `src/features/auth/googleAuth.test.ts`

**Interfaces:**
- Produces: `buildGoogleOAuthUrl(supabaseUrl: string, redirectTo: string): string` — used by the login screen's "Entrar com Google" button (wired in this task).

- [x] **Step 1: Write the failing test**

Create `src/features/auth/googleAuth.test.ts`:

```ts
import { buildGoogleOAuthUrl } from "./googleAuth";

describe("buildGoogleOAuthUrl", () => {
  it("builds a Supabase OAuth authorize URL for Google with the redirect encoded", () => {
    const url = buildGoogleOAuthUrl(
      "https://example.supabase.co",
      "brdex://redirect"
    );
    expect(url).toBe(
      "https://example.supabase.co/auth/v1/authorize?provider=google&redirect_to=brdex%3A%2F%2Fredirect"
    );
  });
});
```

- [x] **Step 2: Run the test to verify it fails**

Run: `npm test -- googleAuth`
Expected: FAIL with "Cannot find module './googleAuth'".

- [x] **Step 3: Write the implementation**

Create `src/features/auth/googleAuth.ts`:

```ts
export function buildGoogleOAuthUrl(supabaseUrl: string, redirectTo: string): string {
  const params = new URLSearchParams({
    provider: "google",
    redirect_to: redirectTo
  });
  return `${supabaseUrl}/auth/v1/authorize?${params.toString()}`;
}
```

- [x] **Step 4: Run the test to verify it passes**

Run: `npm test -- googleAuth`
Expected: PASS — 1 test passed.

- [x] **Step 5: Wire it into the login screen**

```bash
npx expo install expo-auth-session expo-web-browser
```

Modify `app/(auth)/login.tsx` — add below the `Link` at the end of the returned JSX (before the closing `</View>`):

```tsx
      <Pressable
        testID="login-google"
        onPress={async () => {
          const WebBrowser = await import("expo-web-browser");
          const { buildGoogleOAuthUrl } = await import("../../src/features/auth/googleAuth");
          const redirectTo = "brdex://redirect";
          const url = buildGoogleOAuthUrl(
            process.env.EXPO_PUBLIC_SUPABASE_URL as string,
            redirectTo
          );
          await WebBrowser.openAuthSessionAsync(url, redirectTo);
        }}
      >
        <Text>Entrar com Google</Text>
      </Pressable>
```

- [x] **Step 6: Run the full test suite to confirm nothing broke**

Run: `npm test`
Expected: PASS — all tests from Tasks 1-6 pass.

- [x] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add Google OAuth redirect helper and wire it into login screen"
```

---

### Task 7: Catalog sync Edge Function — pure transform

**Files:**
- Create: `supabase/functions/sync-catalog/transform.ts`
- Test: `supabase/functions/sync-catalog/transform.test.ts`
- Create: `supabase/functions/sync-catalog/index.ts`

**Interfaces:**
- Produces: `mapPokemonTcgCardToRow(card: PokemonTcgApiCard): CardsCatalogRow` — matches the `cards_catalog` columns from Task 2 exactly (`external_id, name, number, set_name, set_id, rarity, image_url`).

- [x] **Step 1: Write the failing test**

Create `supabase/functions/sync-catalog/transform.test.ts`:

```ts
import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { mapPokemonTcgCardToRow } from "./transform.ts";

Deno.test("mapPokemonTcgCardToRow maps the Pokémon TCG API shape to our catalog row", () => {
  const apiCard = {
    id: "base1-25",
    name: "Pikachu",
    number: "25",
    rarity: "Common",
    set: { id: "base1", name: "Base Set" },
    images: { small: "https://images.pokemontcg.io/base1/25.png" }
  };

  const row = mapPokemonTcgCardToRow(apiCard);

  assertEquals(row, {
    external_id: "base1-25",
    name: "Pikachu",
    number: "25",
    set_name: "Base Set",
    set_id: "base1",
    rarity: "Common",
    image_url: "https://images.pokemontcg.io/base1/25.png"
  });
});

Deno.test("mapPokemonTcgCardToRow defaults rarity to null when absent", () => {
  const apiCard = {
    id: "base1-1",
    name: "Alakazam",
    number: "1",
    set: { id: "base1", name: "Base Set" },
    images: { small: "https://images.pokemontcg.io/base1/1.png" }
  };

  const row = mapPokemonTcgCardToRow(apiCard);

  assertEquals(row.rarity, null);
});
```

- [x] **Step 2: Run the test to verify it fails**

```bash
cd supabase/functions/sync-catalog
deno test --allow-none transform.test.ts
```

Expected: FAIL — "Module not found './transform.ts'".

- [x] **Step 3: Write the implementation**

Create `supabase/functions/sync-catalog/transform.ts`:

```ts
export interface PokemonTcgApiCard {
  id: string;
  name: string;
  number: string;
  rarity?: string;
  set: { id: string; name: string };
  images: { small: string };
}

export interface CardsCatalogRow {
  external_id: string;
  name: string;
  number: string;
  set_name: string;
  set_id: string;
  rarity: string | null;
  image_url: string;
}

export function mapPokemonTcgCardToRow(card: PokemonTcgApiCard): CardsCatalogRow {
  return {
    external_id: card.id,
    name: card.name,
    number: card.number,
    set_name: card.set.name,
    set_id: card.set.id,
    rarity: card.rarity ?? null,
    image_url: card.images.small
  };
}
```

- [x] **Step 4: Run the test to verify it passes**

```bash
deno test --allow-none transform.test.ts
```

Expected: PASS — 2 tests passed.

- [x] **Step 5: Write the Edge Function entrypoint that uses the pure transform**

Create `supabase/functions/sync-catalog/index.ts`:

```ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { mapPokemonTcgCardToRow, type PokemonTcgApiCard } from "./transform.ts";

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  let page = 1;
  let totalUpserted = 0;

  while (true) {
    const response = await fetch(
      `https://api.pokemontcg.io/v2/cards?page=${page}&pageSize=250`,
      { headers: { "X-Api-Key": Deno.env.get("POKEMON_TCG_API_KEY") ?? "" } }
    );

    if (!response.ok) {
      return new Response(`Pokémon TCG API error: ${response.status}`, { status: 502 });
    }

    const body = await response.json();
    const cards: PokemonTcgApiCard[] = body.data;

    if (cards.length === 0) {
      break;
    }

    const rows = cards.map(mapPokemonTcgCardToRow);
    const { error } = await supabase.from("cards_catalog").upsert(rows, {
      onConflict: "external_id"
    });

    if (error) {
      return new Response(`Upsert error: ${error.message}`, { status: 500 });
    }

    totalUpserted += rows.length;
    page += 1;
  }

  return new Response(JSON.stringify({ upserted: totalUpserted }), {
    headers: { "Content-Type": "application/json" }
  });
});
```

- [x] **Step 6: Commit**

```bash
git add supabase/functions/
git commit -m "feat: add catalog sync Edge Function with pure API-to-row transform"
```

---

### Task 8: Catalog search and browse screen

**Files:**
- Create: `src/features/catalog/types.ts`, `src/features/catalog/catalogSearch.ts`, `src/features/catalog/catalogRepository.ts`
- Test: `src/features/catalog/catalogSearch.test.ts`, `src/features/catalog/catalogRepository.test.ts`
- Create: `app/(tabs)/_layout.tsx`, `app/(tabs)/catalog.tsx`, `src/components/CardGridItem.tsx`

**Interfaces:**
- Consumes: `getSupabaseClient` (Task 3). `cards_catalog` table shape from Task 2.
- Produces: `CatalogCard` type and `searchCatalogCards(query, page)` — Task 10 (add-card screen) reuses `CatalogCard` and `CardGridItem`.

- [x] **Step 1: Write the failing test for the pure filter helper**

Create `src/features/catalog/types.ts`:

```ts
export interface CatalogCard {
  id: string;
  name: string;
  number: string;
  setName: string;
  rarity: string | null;
  imageUrl: string;
}
```

Create `src/features/catalog/catalogSearch.test.ts`:

```ts
import { filterCatalogCards } from "./catalogSearch";
import type { CatalogCard } from "./types";

const CARDS: CatalogCard[] = [
  { id: "1", name: "Pikachu", number: "25", setName: "Base Set", rarity: "Common", imageUrl: "x" },
  { id: "2", name: "Charizard", number: "4", setName: "Base Set", rarity: "Rare Holo", imageUrl: "x" },
  { id: "3", name: "Raichu", number: "26", setName: "Base Set", rarity: "Rare", imageUrl: "x" }
];

describe("filterCatalogCards", () => {
  it("returns all cards when the query is empty", () => {
    expect(filterCatalogCards(CARDS, "")).toHaveLength(3);
  });

  it("filters case-insensitively by name substring", () => {
    const result = filterCatalogCards(CARDS, "pika");
    expect(result.map((c) => c.name)).toEqual(["Pikachu"]);
  });

  it("matches partial names shared by multiple cards", () => {
    const result = filterCatalogCards(CARDS, "chu");
    expect(result.map((c) => c.name).sort()).toEqual(["Pikachu", "Raichu"]);
  });
});
```

- [x] **Step 2: Run the test to verify it fails**

Run: `npm test -- catalogSearch`
Expected: FAIL with "Cannot find module './catalogSearch'".

- [x] **Step 3: Write the pure filter implementation**

Create `src/features/catalog/catalogSearch.ts`:

```ts
import type { CatalogCard } from "./types";

export function filterCatalogCards(cards: CatalogCard[], query: string): CatalogCard[] {
  const normalized = query.trim().toLowerCase();
  if (normalized === "") {
    return cards;
  }
  return cards.filter((card) => card.name.toLowerCase().includes(normalized));
}
```

- [x] **Step 4: Run the test to verify it passes**

Run: `npm test -- catalogSearch`
Expected: PASS — 3 tests passed.

- [x] **Step 5: Write the failing repository test**

Create `src/features/catalog/catalogRepository.test.ts`:

```ts
jest.mock("../../lib/supabaseClient", () => ({
  getSupabaseClient: jest.fn()
}));

import { getSupabaseClient } from "../../lib/supabaseClient";
import { fetchCatalogPage } from "./catalogRepository";

describe("fetchCatalogPage", () => {
  it("queries cards_catalog ordered by name and maps rows to CatalogCard", async () => {
    const rangeMock = jest.fn().mockResolvedValue({
      data: [
        {
          id: "1",
          name: "Pikachu",
          number: "25",
          set_name: "Base Set",
          rarity: "Common",
          image_url: "https://x/pikachu.png"
        }
      ],
      error: null
    });
    const orderMock = jest.fn().mockReturnValue({ range: rangeMock });
    const selectMock = jest.fn().mockReturnValue({ order: orderMock });
    const fromMock = jest.fn().mockReturnValue({ select: selectMock });

    (getSupabaseClient as jest.Mock).mockReturnValue({ from: fromMock });

    const result = await fetchCatalogPage(0);

    expect(fromMock).toHaveBeenCalledWith("cards_catalog");
    expect(orderMock).toHaveBeenCalledWith("name", { ascending: true });
    expect(rangeMock).toHaveBeenCalledWith(0, 49);
    expect(result).toEqual([
      {
        id: "1",
        name: "Pikachu",
        number: "25",
        setName: "Base Set",
        rarity: "Common",
        imageUrl: "https://x/pikachu.png"
      }
    ]);
  });

  it("throws when Supabase returns an error", async () => {
    const rangeMock = jest.fn().mockResolvedValue({ data: null, error: { message: "network down" } });
    const orderMock = jest.fn().mockReturnValue({ range: rangeMock });
    const selectMock = jest.fn().mockReturnValue({ order: orderMock });
    const fromMock = jest.fn().mockReturnValue({ select: selectMock });
    (getSupabaseClient as jest.Mock).mockReturnValue({ from: fromMock });

    await expect(fetchCatalogPage(0)).rejects.toThrow("network down");
  });
});
```

- [x] **Step 6: Run the test to verify it fails**

Run: `npm test -- catalogRepository`
Expected: FAIL with "Cannot find module './catalogRepository'".

- [x] **Step 7: Write the repository implementation**

Create `src/features/catalog/catalogRepository.ts`:

```ts
import { getSupabaseClient } from "../../lib/supabaseClient";
import type { CatalogCard } from "./types";

const PAGE_SIZE = 50;

export async function fetchCatalogPage(page: number): Promise<CatalogCard[]> {
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data, error } = await getSupabaseClient()
    .from("cards_catalog")
    .select("id, name, number, set_name, rarity, image_url")
    .order("name", { ascending: true })
    .range(from, to);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    number: row.number,
    setName: row.set_name,
    rarity: row.rarity,
    imageUrl: row.image_url
  }));
}
```

- [x] **Step 8: Run the test to verify it passes**

Run: `npm test -- catalogRepository`
Expected: PASS — 2 tests passed.

- [x] **Step 9: Build the screen**

Create `src/components/CardGridItem.tsx`:

```tsx
import { Image, Text, View } from "react-native";
import type { CatalogCard } from "../features/catalog/types";

export function CardGridItem({ card }: { card: CatalogCard }) {
  return (
    <View testID={`card-grid-item-${card.id}`} style={{ width: 100, margin: 8 }}>
      <Image source={{ uri: card.imageUrl }} style={{ width: 100, height: 140 }} />
      <Text numberOfLines={1}>{card.name}</Text>
      <Text style={{ fontSize: 12, color: "#666" }}>{card.setName}</Text>
    </View>
  );
}
```

Create `app/(tabs)/_layout.tsx`:

```tsx
import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="album" options={{ title: "Álbum" }} />
      <Tabs.Screen name="catalog" options={{ title: "Catálogo" }} />
    </Tabs>
  );
}
```

Create `app/(tabs)/catalog.tsx`:

```tsx
import { useEffect, useState } from "react";
import { FlatList, TextInput, View } from "react-native";
import { fetchCatalogPage } from "../../src/features/catalog/catalogRepository";
import { filterCatalogCards } from "../../src/features/catalog/catalogSearch";
import { CardGridItem } from "../../src/components/CardGridItem";
import type { CatalogCard } from "../../src/features/catalog/types";

export default function CatalogScreen() {
  const [cards, setCards] = useState<CatalogCard[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetchCatalogPage(0).then(setCards).catch(() => setCards([]));
  }, []);

  const visibleCards = filterCatalogCards(cards, query);

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <TextInput
        testID="catalog-search-input"
        placeholder="Buscar carta..."
        value={query}
        onChangeText={setQuery}
      />
      <FlatList
        testID="catalog-list"
        data={visibleCards}
        keyExtractor={(item) => item.id}
        numColumns={3}
        renderItem={({ item }) => <CardGridItem card={item} />}
      />
    </View>
  );
}
```

- [x] **Step 10: Run the full suite**

Run: `npm test`
Expected: PASS — all tests pass.

- [x] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: add catalog search screen backed by cards_catalog"
```

---

### Task 9: Card condition scale

**Files:**
- Create: `src/features/collection/conditionScale.ts`
- Test: `src/features/collection/conditionScale.test.ts`

**Interfaces:**
- Produces: `CARD_CONDITIONS: { value: CardCondition; label: string }[]` and `CardCondition` type — Task 10's add-card form and picker consume this exact list, in this exact order.

- [x] **Step 1: Write the failing test**

Create `src/features/collection/conditionScale.test.ts`:

```ts
import { CARD_CONDITIONS } from "./conditionScale";

describe("CARD_CONDITIONS", () => {
  it("defines exactly the 6 fixed condition values in best-to-worst order", () => {
    expect(CARD_CONDITIONS.map((c) => c.value)).toEqual([
      "mint",
      "near_mint",
      "excellent",
      "good",
      "played",
      "damaged"
    ]);
  });

  it("gives every condition a non-empty Portuguese label", () => {
    for (const condition of CARD_CONDITIONS) {
      expect(condition.label.length).toBeGreaterThan(0);
    }
  });
});
```

- [x] **Step 2: Run the test to verify it fails**

Run: `npm test -- conditionScale`
Expected: FAIL with "Cannot find module './conditionScale'".

- [x] **Step 3: Write the implementation**

Create `src/features/collection/conditionScale.ts`:

```ts
export type CardCondition = "mint" | "near_mint" | "excellent" | "good" | "played" | "damaged";

export const CARD_CONDITIONS: { value: CardCondition; label: string }[] = [
  { value: "mint", label: "Mint" },
  { value: "near_mint", label: "Quase Nova" },
  { value: "excellent", label: "Excelente" },
  { value: "good", label: "Boa" },
  { value: "played", label: "Jogada" },
  { value: "damaged", label: "Danificada" }
];
```

- [x] **Step 4: Run the test to verify it passes**

Run: `npm test -- conditionScale`
Expected: PASS — 2 tests passed.

- [x] **Step 5: Commit**

```bash
git add src/features/collection/conditionScale.ts src/features/collection/conditionScale.test.ts
git commit -m "feat: add fixed card condition scale"
```

---

### Task 10: Collection repository, add-card screen, and album screen

**Files:**
- Create: `src/features/collection/types.ts`, `src/features/collection/collectionRepository.ts`
- Test: `src/features/collection/collectionRepository.test.ts`
- Create: `app/card/add.tsx`, `app/(tabs)/album.tsx`

**Interfaces:**
- Consumes: `getSupabaseClient` (Task 3), `CatalogCard` (Task 8), `CardCondition`/`CARD_CONDITIONS` (Task 9), `CardGridItem` (Task 8).
- Produces: `addUserCard(input: AddUserCardInput): Promise<void>`, `listUserCards(): Promise<UserCard[]>`.

- [x] **Step 1: Define the types**

Create `src/features/collection/types.ts`:

```ts
import type { CardCondition } from "./conditionScale";

export type CardLanguage = "en" | "pt" | "jp" | "other";
export type CardStatus = "guardada" | "a_venda" | "disponivel_troca";

export interface AddUserCardInput {
  catalogCardId: string;
  language: CardLanguage;
  condition: CardCondition;
  pricePaid: number | null;
  status: CardStatus;
}

export interface UserCard {
  id: string;
  catalogCardId: string;
  cardName: string;
  cardImageUrl: string;
  language: CardLanguage;
  condition: CardCondition;
  pricePaid: number | null;
  status: CardStatus;
}
```

- [x] **Step 2: Write the failing repository test**

Create `src/features/collection/collectionRepository.test.ts`:

```ts
jest.mock("../../lib/supabaseClient", () => ({
  getSupabaseClient: jest.fn()
}));

import { getSupabaseClient } from "../../lib/supabaseClient";
import { addUserCard, listUserCards } from "./collectionRepository";

describe("addUserCard", () => {
  it("inserts a row into user_cards with the current user's id", async () => {
    const insertMock = jest.fn().mockResolvedValue({ error: null });
    const fromMock = jest.fn().mockReturnValue({ insert: insertMock });
    const getUserMock = jest.fn().mockResolvedValue({ data: { user: { id: "user-1" } } });

    (getSupabaseClient as jest.Mock).mockReturnValue({
      from: fromMock,
      auth: { getUser: getUserMock }
    });

    await addUserCard({
      catalogCardId: "card-1",
      language: "en",
      condition: "near_mint",
      pricePaid: 25.5,
      status: "guardada"
    });

    expect(fromMock).toHaveBeenCalledWith("user_cards");
    expect(insertMock).toHaveBeenCalledWith({
      user_id: "user-1",
      catalog_card_id: "card-1",
      language: "en",
      condition: "near_mint",
      price_paid: 25.5,
      status: "guardada"
    });
  });
});

describe("listUserCards", () => {
  it("joins user_cards with cards_catalog and maps to UserCard", async () => {
    const eqMock = jest.fn().mockResolvedValue({
      data: [
        {
          id: "uc-1",
          catalog_card_id: "card-1",
          language: "en",
          condition: "near_mint",
          price_paid: 25.5,
          status: "guardada",
          cards_catalog: { name: "Pikachu", image_url: "https://x/pikachu.png" }
        }
      ],
      error: null
    });
    const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
    const fromMock = jest.fn().mockReturnValue({ select: selectMock });
    const getUserMock = jest.fn().mockResolvedValue({ data: { user: { id: "user-1" } } });

    (getSupabaseClient as jest.Mock).mockReturnValue({
      from: fromMock,
      auth: { getUser: getUserMock }
    });

    const result = await listUserCards();

    expect(selectMock).toHaveBeenCalledWith(
      "id, catalog_card_id, language, condition, price_paid, status, cards_catalog(name, image_url)"
    );
    expect(eqMock).toHaveBeenCalledWith("user_id", "user-1");
    expect(result).toEqual([
      {
        id: "uc-1",
        catalogCardId: "card-1",
        cardName: "Pikachu",
        cardImageUrl: "https://x/pikachu.png",
        language: "en",
        condition: "near_mint",
        pricePaid: 25.5,
        status: "guardada"
      }
    ]);
  });
});
```

- [x] **Step 3: Run the test to verify it fails**

Run: `npm test -- collectionRepository`
Expected: FAIL with "Cannot find module './collectionRepository'".

- [x] **Step 4: Write the implementation**

Create `src/features/collection/collectionRepository.ts`:

```ts
import { getSupabaseClient } from "../../lib/supabaseClient";
import type { AddUserCardInput, UserCard } from "./types";

export async function addUserCard(input: AddUserCardInput): Promise<void> {
  const client = getSupabaseClient();
  const {
    data: { user }
  } = await client.auth.getUser();

  if (!user) {
    throw new Error("Usuário não autenticado");
  }

  const { error } = await client.from("user_cards").insert({
    user_id: user.id,
    catalog_card_id: input.catalogCardId,
    language: input.language,
    condition: input.condition,
    price_paid: input.pricePaid,
    status: input.status
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function listUserCards(): Promise<UserCard[]> {
  const client = getSupabaseClient();
  const {
    data: { user }
  } = await client.auth.getUser();

  if (!user) {
    throw new Error("Usuário não autenticado");
  }

  const { data, error } = await client
    .from("user_cards")
    .select(
      "id, catalog_card_id, language, condition, price_paid, status, cards_catalog(name, image_url)"
    )
    .eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    catalogCardId: row.catalog_card_id,
    cardName: row.cards_catalog.name,
    cardImageUrl: row.cards_catalog.image_url,
    language: row.language,
    condition: row.condition,
    pricePaid: row.price_paid,
    status: row.status
  }));
}
```

- [x] **Step 5: Run the test to verify it passes**

Run: `npm test -- collectionRepository`
Expected: PASS — 2 tests passed.

- [x] **Step 6: Build the add-card screen**

Create `app/card/add.tsx`:

```tsx
import { useState } from "react";
import { View, Text, Pressable, ScrollView, TextInput } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { addUserCard } from "../../src/features/collection/collectionRepository";
import { CARD_CONDITIONS, type CardCondition } from "../../src/features/collection/conditionScale";
import type { CardLanguage, CardStatus } from "../../src/features/collection/types";

const LANGUAGES: { value: CardLanguage; label: string }[] = [
  { value: "en", label: "Inglês" },
  { value: "pt", label: "Português" },
  { value: "jp", label: "Japonês" },
  { value: "other", label: "Outro" }
];

const STATUSES: { value: CardStatus; label: string }[] = [
  { value: "guardada", label: "Guardada" },
  { value: "a_venda", label: "À venda" },
  { value: "disponivel_troca", label: "Disponível para troca" }
];

export default function AddCardScreen() {
  const { catalogCardId } = useLocalSearchParams<{ catalogCardId: string }>();
  const router = useRouter();

  const [language, setLanguage] = useState<CardLanguage>("en");
  const [condition, setCondition] = useState<CardCondition>("near_mint");
  const [status, setStatus] = useState<CardStatus>("guardada");
  const [pricePaid, setPricePaid] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    try {
      await addUserCard({
        catalogCardId,
        language,
        condition,
        pricePaid: pricePaid ? Number(pricePaid) : null,
        status
      });
      router.replace("/(tabs)/album");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao cadastrar carta");
    }
  }

  return (
    <ScrollView style={{ flex: 1, padding: 16 }}>
      <Text>Idioma</Text>
      {LANGUAGES.map((lang) => (
        <Pressable key={lang.value} testID={`language-${lang.value}`} onPress={() => setLanguage(lang.value)}>
          <Text style={{ fontWeight: language === lang.value ? "bold" : "normal" }}>{lang.label}</Text>
        </Pressable>
      ))}

      <Text>Estado de conservação</Text>
      {CARD_CONDITIONS.map((cond) => (
        <Pressable key={cond.value} testID={`condition-${cond.value}`} onPress={() => setCondition(cond.value)}>
          <Text style={{ fontWeight: condition === cond.value ? "bold" : "normal" }}>{cond.label}</Text>
        </Pressable>
      ))}

      <Text>Status</Text>
      {STATUSES.map((s) => (
        <Pressable key={s.value} testID={`status-${s.value}`} onPress={() => setStatus(s.value)}>
          <Text style={{ fontWeight: status === s.value ? "bold" : "normal" }}>{s.label}</Text>
        </Pressable>
      ))}

      <Text>Preço pago (R$)</Text>
      <TextInput
        testID="add-card-price"
        keyboardType="numeric"
        value={pricePaid}
        onChangeText={setPricePaid}
      />

      {error ? <Text style={{ color: "red" }}>{error}</Text> : null}

      <Pressable testID="add-card-submit" onPress={handleSubmit}>
        <Text>Salvar carta</Text>
      </Pressable>
    </ScrollView>
  );
}
```

- [x] **Step 7: Build the album screen**

Create `app/(tabs)/album.tsx`:

```tsx
import { useEffect, useState } from "react";
import { FlatList, Text, View } from "react-native";
import { listUserCards } from "../../src/features/collection/collectionRepository";
import type { UserCard } from "../../src/features/collection/types";

export default function AlbumScreen() {
  const [cards, setCards] = useState<UserCard[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listUserCards()
      .then(setCards)
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar álbum"));
  }, []);

  if (error) {
    return (
      <View style={{ flex: 1, padding: 16 }}>
        <Text>{error}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <FlatList
        testID="album-list"
        data={cards}
        keyExtractor={(item) => item.id}
        numColumns={3}
        renderItem={({ item }) => (
          <View testID={`album-item-${item.id}`} style={{ width: 100, margin: 8 }}>
            <Text numberOfLines={1}>{item.cardName}</Text>
          </View>
        )}
      />
    </View>
  );
}
```

- [x] **Step 8: Run the full test suite**

Run: `npm test`
Expected: PASS — all tests from Tasks 1-10 pass.

- [x] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add card registration flow and personal album screen"
```

---

## Self-Review Notes

- **Spec coverage:** cadastro/login (Task 4-6), catálogo sincronizado (Task 7-8), cadastro de carta com raridade/estado/idioma/preço (Task 9-10), álbum visual (Task 10). Gráfico de valor, preço colaborativo, wishlist/match/chat, denúncia, monetização, notícias, and other Fase 2-4 items are intentionally out of this plan — each gets its own plan once this phase is running.
- **Placeholder scan:** no TBD/TODO; every step has runnable code and exact commands.
- **Type consistency:** `CatalogCard` (Task 8) and `CardCondition`/`CardLanguage`/`CardStatus`/`UserCard` (Tasks 9-10) are defined once and imported everywhere they're used — verified column names in `collectionRepository.ts` match `0001_init_schema.sql` from Task 2 exactly (`catalog_card_id`, `price_paid`, `status`, etc).
