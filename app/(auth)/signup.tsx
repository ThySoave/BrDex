import { useState } from "react";
import { View, TextInput, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { signUp } from "../../src/features/auth/authRepository";
import { validateCredentials } from "../../src/features/auth/validateCredentials";

export default function SignupScreen() {
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
      {error ? (
        <Text testID="signup-error" style={{ color: "red" }}>
          {error}
        </Text>
      ) : null}
      <Pressable testID="signup-submit" onPress={handleSubmit}>
        <Text>Criar conta</Text>
      </Pressable>
    </View>
  );
}
