jest.mock("expo-notifications", () => ({
  setNotificationChannelAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  AndroidImportance: { MAX: 5 }
}));
jest.mock("./pushTokensRepository", () => ({
  registerPushToken: jest.fn()
}));

import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { registerForPushNotifications } from "./registerForPush";
import { registerPushToken } from "./pushTokensRepository";

describe("registerForPushNotifications", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  it("does not register a token when permission stays denied", async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: "denied" });
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({ status: "denied" });

    await registerForPushNotifications();

    expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
    expect(registerPushToken).not.toHaveBeenCalled();
  });

  it("registers the token when permission is already granted", async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: "granted" });
    (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({
      data: "ExponentPushToken[test]"
    });

    await registerForPushNotifications();

    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(registerPushToken).toHaveBeenCalledWith("ExponentPushToken[test]", Platform.OS);
  });

  it("registers the token when permission is granted after the prompt", async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: "undetermined" });
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({ status: "granted" });
    (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({
      data: "ExponentPushToken[test]"
    });

    await registerForPushNotifications();

    expect(registerPushToken).toHaveBeenCalledWith("ExponentPushToken[test]", Platform.OS);
  });

  it("swallows errors instead of propagating them", async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: "granted" });
    (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({
      data: "ExponentPushToken[test]"
    });
    (registerPushToken as jest.Mock).mockRejectedValue(new Error("rede fora"));

    await expect(registerForPushNotifications()).resolves.toBeUndefined();
    expect(console.warn).toHaveBeenCalled();
  });
});
