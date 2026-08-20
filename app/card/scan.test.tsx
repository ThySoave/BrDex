const mockReplace = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockReplace })
}));
jest.mock("expo-image-picker", () => ({
  requestCameraPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn()
}));
jest.mock("../../src/features/premium/entitlementsRepository", () => ({
  isPremium: jest.fn()
}));
jest.mock("../../src/features/scanner/scannerRepository", () => ({
  recognizeCard: jest.fn()
}));
jest.mock("../../src/features/catalog/catalogRepository", () => ({
  searchCatalogByName: jest.fn()
}));

import { Alert } from "react-native";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import * as ImagePicker from "expo-image-picker";
import { isPremium } from "../../src/features/premium/entitlementsRepository";
import { recognizeCard } from "../../src/features/scanner/scannerRepository";
import { searchCatalogByName } from "../../src/features/catalog/catalogRepository";
import ScanCardScreen from "./scan";

const CHARIZARD = {
  id: "base1-4",
  name: "Charizard",
  number: "4",
  setName: "Base",
  rarity: "Rare Holo",
  imageUrl: "https://x/charizard.png"
};

describe("ScanCardScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
    (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ base64: "foto-base64" }]
    });
  });

  it("shows an upsell instead of the camera for non-premium users", async () => {
    (isPremium as jest.Mock).mockResolvedValue(false);
    const { getByTestId, queryByTestId } = render(<ScanCardScreen />);

    await waitFor(() => {
      expect(getByTestId("scanner-upsell")).toBeTruthy();
    });
    expect(queryByTestId("scan-capture")).toBeNull();
  });

  it("captures a photo, recognizes the card and opens the add form with the match", async () => {
    (isPremium as jest.Mock).mockResolvedValue(true);
    (recognizeCard as jest.Mock).mockResolvedValue({ name: "Charizard", number: "4" });
    (searchCatalogByName as jest.Mock).mockResolvedValue([CHARIZARD]);

    const { getByTestId } = render(<ScanCardScreen />);
    await waitFor(() => {
      expect(getByTestId("scan-capture")).toBeTruthy();
    });

    fireEvent.press(getByTestId("scan-capture"));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/card/add?catalogCardId=base1-4");
    });
    expect(recognizeCard).toHaveBeenCalledWith("foto-base64");
    expect(searchCatalogByName).toHaveBeenCalledWith("Charizard");
  });

  it("shows the manual fallback when no catalog card matches", async () => {
    (isPremium as jest.Mock).mockResolvedValue(true);
    (recognizeCard as jest.Mock).mockResolvedValue({ name: "Missingno", number: null });
    (searchCatalogByName as jest.Mock).mockResolvedValue([]);

    const { getByTestId } = render(<ScanCardScreen />);
    await waitFor(() => {
      expect(getByTestId("scan-capture")).toBeTruthy();
    });

    fireEvent.press(getByTestId("scan-capture"));

    await waitFor(() => {
      expect(getByTestId("scan-no-match")).toBeTruthy();
    });

    fireEvent.press(getByTestId("scan-manual-fallback"));
    expect(mockReplace).toHaveBeenCalledWith("/(tabs)/catalog");
  });

  it("does not call recognition when the capture is canceled", async () => {
    (isPremium as jest.Mock).mockResolvedValue(true);
    (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({ canceled: true, assets: null });

    const { getByTestId } = render(<ScanCardScreen />);
    await waitFor(() => {
      expect(getByTestId("scan-capture")).toBeTruthy();
    });

    fireEvent.press(getByTestId("scan-capture"));

    await waitFor(() => {
      expect(ImagePicker.launchCameraAsync).toHaveBeenCalled();
    });
    expect(recognizeCard).not.toHaveBeenCalled();
  });

  it("shows an alert when recognition fails", async () => {
    (isPremium as jest.Mock).mockResolvedValue(true);
    (recognizeCard as jest.Mock).mockRejectedValue(new Error("function offline"));
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);

    const { getByTestId } = render(<ScanCardScreen />);
    await waitFor(() => {
      expect(getByTestId("scan-capture")).toBeTruthy();
    });

    fireEvent.press(getByTestId("scan-capture"));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Erro", "function offline");
    });
  });
});
