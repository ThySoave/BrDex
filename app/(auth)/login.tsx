import { useState } from "react";
import { View, TextInput, Text, Pressable } from "react-native";
import { useRouter, Link } from "expo-router";
import { signIn } from "../../src/features/auth/authRepository";
import { validateCredentials } from "../../src/features/auth/validateCredentials";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit() {
    setError(null);
    const validationError = validateCredentials(email, password);
    if (validationError) {
      setError(validationError);
      return;
    }
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
      {error ? (
        <Text testID="login-error" style={{ color: "red" }}>
          {error}
        </Text>
      ) : null}
      <Pressable testID="login-submit" onPress={handleSubmit}>
        <Text>Entrar</Text>
      </Pressable>
      <Link href="/(auth)/signup">Criar conta</Link>
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
    </View>
  );
}
