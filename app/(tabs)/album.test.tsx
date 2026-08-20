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
jest.mock("../../src/features/collection/shareImage", () => ({
  captureAndShareView: jest.fn()
}));

import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { captureAndShareView } from "../../src/features/collection/shareImage";
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

describe("AlbumScreen image sharing", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (listUserCards as jest.Mock).mockResolvedValue(CARDS);
    (fetchSetProgress as jest.Mock).mockResolvedValue([]);
    (isPremium as jest.Mock).mockResolvedValue(false);
    (captureAndShareView as jest.Mock).mockResolvedValue(undefined);
  });

  it("compartilha a imagem da coleção ao tocar em Compartilhar", async () => {
    const { getByTestId } = render(<AlbumScreen />);

    await waitFor(() => {
      expect(getByTestId("share-collection")).toBeTruthy();
    });

    fireEvent.press(getByTestId("share-collection"));

    await waitFor(() => {
      expect(captureAndShareView).toHaveBeenCalledTimes(1);
    });
  });

  it("compartilha a imagem de uma carta ao segurar o item do álbum", async () => {
    const { getByTestId } = render(<AlbumScreen />);

    await waitFor(() => {
      expect(getByTestId("album-item-uc-1")).toBeTruthy();
    });

    fireEvent(getByTestId("album-item-uc-1"), "longPress");

    await waitFor(() => {
      expect(captureAndShareView).toHaveBeenCalledTimes(1);
    });
  });

  it("mostra alerta quando a captura falha", async () => {
    (captureAndShareView as jest.Mock).mockRejectedValue(new Error("captura falhou"));
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    const { getByTestId } = render(<AlbumScreen />);

    await waitFor(() => {
      expect(getByTestId("share-collection")).toBeTruthy();
    });

    fireEvent.press(getByTestId("share-collection"));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Erro", "captura falhou");
    });
  });
});
