export function buildGoogleOAuthUrl(supabaseUrl: string, redirectTo: string): string {
  const params = new URLSearchParams({
    provider: "google",
    redirect_to: redirectTo
  });
  return `${supabaseUrl}/auth/v1/authorize?${params.toString()}`;
}
