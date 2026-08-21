// Regra única de credenciais para login e cadastro (senha mínima do Supabase Auth: 6).
export function validateCredentials(email: string, password: string): string | null {
  if (!email.trim() || !email.includes("@")) {
    return "Informe um email válido.";
  }
  if (password.length < 6) {
    return "A senha precisa de pelo menos 6 caracteres.";
  }
  return null;
}
