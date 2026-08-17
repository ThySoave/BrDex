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
