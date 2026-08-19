jest.mock("../../src/features/collection/collectionRepository", () => ({
  listUserCards: jest.fn()
}));
jest.mock("../../src/features/collection/setProgressRepository", () => ({
  fetchSetProgress: jest.fn()
}));
jest.mock("../../src/features/premium/entitlementsRepository", () => ({
  isPremium: jest.fn()
}));
jest.mock("expo-print", () => ({
  printToFileAsync: jest.fn()
}));
jest.mock("expo-sharing", () => ({
  shareAsync: jest.fn()
}));

import { fireEvent, render, waitFor } from "@testing-library/react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { listUserCards } from "../../src/features/collection/collectionRepository";
import { fetchSetProgress } from "../../src/features/collection/setProgressRepository";
import { isPremium } from "../../src/features/premium/entitlementsRepository";
import AlbumScreen from "./album";

const CARDS = [
  {
    id: "uc-1",
    catalogCardId: "card-1",
    cardName: "Pikachu",
    cardImageUrl: "https://example.com/25.png",
    language: "en",
    condition: "near_mint",
    pricePaid: 100.5,
    status: "guardada"
  }
];

describe("AlbumScreen PDF export", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (listUserCards as jest.Mock).mockResolvedValue(CARDS);
    (fetchSetProgress as jest.Mock).mockResolvedValue([]);
    (Print.printToFileAsync as jest.Mock).mockResolvedValue({ uri: "file:///collection.pdf" });
    (Sharing.shareAsync as jest.Mock).mockResolvedValue(undefined);
  });

  it("generates and shares the PDF for premium users", async () => {
    (isPremium as jest.Mock).mockResolvedValue(true);
    const { getByTestId } = render(<AlbumScreen />);

    await waitFor(() => {
      expect(getByTestId("export-pdf")).toBeTruthy();
    });

    fireEvent.press(getByTestId("export-pdf"));

    await waitFor(() => {
      expect(Print.printToFileAsync).toHaveBeenCalledWith({
        html: expect.stringContaining("Pikachu")
      });
      expect(Sharing.shareAsync).toHaveBeenCalledWith("file:///collection.pdf");
    });
  });

  it("shows an upsell instead for non-premium users", async () => {
    (isPremium as jest.Mock).mockResolvedValue(false);
    const { getByTestId } = render(<AlbumScreen />);

    await waitFor(() => {
      expect(getByTestId("export-pdf")).toBeTruthy();
    });

    fireEvent.press(getByTestId("export-pdf"));

    await waitFor(() => {
      expect(getByTestId("export-pdf-upsell")).toBeTruthy();
    });
    expect(Print.printToFileAsync).not.toHaveBeenCalled();
  });
});
