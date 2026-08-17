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
