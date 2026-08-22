jest.mock("../../src/features/news/newsRepository", () => ({
  listNews: jest.fn()
}));
jest.mock("../../src/features/news/setReleasesRepository", () => ({
  listUndismissedSetReleases: jest.fn(),
  dismissSetRelease: jest.fn()
}));
jest.mock("expo-router", () => ({
  useFocusEffect: (callback: () => void) => {
    const React = require("react");
    React.useEffect(callback, []);
  }
}));
jest.mock("expo-notifications", () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  AndroidImportance: { MAX: 5 }
}));
jest.mock("../../src/features/notifications/pushTokensRepository", () => ({
  registerPushToken: jest.fn()
}));

import { fireEvent, render, waitFor } from "@testing-library/react-native";
import * as Notifications from "expo-notifications";
import { Linking } from "react-native";
import { registerPushToken } from "../../src/features/notifications/pushTokensRepository";
import { listNews } from "../../src/features/news/newsRepository";
import {
  dismissSetRelease,
  listUndismissedSetReleases
} from "../../src/features/news/setReleasesRepository";
import HomeScreen from "./home";

const NEWS = [
  {
    id: "news-1",
    title: "Novo set anunciado",
    summary: "Resumo curto.",
    url: "https://example.com/noticia-1",
    source: "PokéNews",
    publishedAt: "2026-08-18T12:00:00Z"
  }
];

const RELEASES = [
  {
    id: "release-1",
    setId: "sv10",
    setName: "Scarlet & Violet 10",
    releasedDetectedAt: "2026-08-18T00:00:00Z"
  }
];

describe("HomeScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (listNews as jest.Mock).mockResolvedValue(NEWS);
    (listUndismissedSetReleases as jest.Mock).mockResolvedValue(RELEASES);
    (dismissSetRelease as jest.Mock).mockResolvedValue(undefined);
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: "granted" });
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({ status: "granted" });
    (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({
      data: "ExponentPushToken[device-1]"
    });
    (registerPushToken as jest.Mock).mockResolvedValue(undefined);
  });

  it("registers the device push token when permission is granted", async () => {
    render(<HomeScreen />);

    await waitFor(() => {
      expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalled();
      expect(registerPushToken).toHaveBeenCalledWith("ExponentPushToken[device-1]", "ios");
    });
  });

  it("does not register a push token when permission is denied", async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: "denied" });
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({ status: "denied" });

    const { getByText } = render(<HomeScreen />);

    await waitFor(() => {
      expect(getByText("Novo set anunciado")).toBeTruthy();
    });
    expect(registerPushToken).not.toHaveBeenCalled();
  });

  it("expõe dispensar o banner de set como botão", async () => {
    const { findByRole } = render(<HomeScreen />);

    await findByRole("button", { name: "Ok, entendi" });
  });

  it("renders the news list", async () => {
    const { getByText } = render(<HomeScreen />);

    await waitFor(() => {
      expect(getByText("Novo set anunciado")).toBeTruthy();
      expect(getByText("Resumo curto.")).toBeTruthy();
    });
  });

  it("renders the new set banner and hides it after dismissal", async () => {
    const { getByTestId, queryByTestId } = render(<HomeScreen />);

    await waitFor(() => {
      expect(getByTestId("home-set-release-banner-release-1")).toBeTruthy();
    });

    fireEvent.press(getByTestId("home-set-release-dismiss-release-1"));

    await waitFor(() => {
      expect(dismissSetRelease).toHaveBeenCalledWith("release-1");
    });
    await waitFor(
      () => {
        expect(queryByTestId("home-set-release-banner-release-1")).toBeNull();
      },
      { timeout: 3000 }
    );
  });

  it("opens the external link when a news item is pressed", async () => {
    const openUrlSpy = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined as any);
    const { getByTestId } = render(<HomeScreen />);

    await waitFor(() => {
      expect(getByTestId("home-news-item-news-1")).toBeTruthy();
    });

    fireEvent.press(getByTestId("home-news-item-news-1"));

    expect(openUrlSpy).toHaveBeenCalledWith("https://example.com/noticia-1");
  });
});
