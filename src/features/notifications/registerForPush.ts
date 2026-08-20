import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { registerPushToken } from "./pushTokensRepository";

// Registro best-effort: falha de permissão/rede nunca pode quebrar a tela.
export async function registerForPushNotifications(): Promise<void> {
  try {
    if (Platform.OS === "android") {
      // Android 13+ só mostra o prompt de permissão com um canal criado antes.
      await Notifications.setNotificationChannelAsync("default", {
        name: "Padrão",
        importance: Notifications.AndroidImportance.MAX
      });
    }

    let { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") {
      ({ status } = await Notifications.requestPermissionsAsync());
    }
    if (status !== "granted") {
      return;
    }

    const { data: token } = await Notifications.getExpoPushTokenAsync();
    await registerPushToken(token, Platform.OS);
  } catch (err) {
    console.warn("Falha ao registrar push token", err);
  }
}
