jest.mock("../../src/features/collection/collectionRepository", () => ({
  listUserCards: jest.fn(),
  markCardAsSold: jest.fn(),
  updateCardStatus: jest.fn()
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

import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { captureAndShareView } from "../../src/features/collection/shareImage";
import {
  listUserCards,
  markCardAsSold,
  updateCardStatus
} from "../../src/features/collection/collectionRepository";
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

describe("AlbumScreen card sale", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (listUserCards as jest.Mock).mockResolvedValue(CARDS);
    (fetchSetProgress as jest.Mock).mockResolvedValue([]);
    (isPremium as jest.Mock).mockResolvedValue(false);
    (markCardAsSold as jest.Mock).mockResolvedValue(undefined);
  });

  async function openSalePanel() {
    const screen = render(<AlbumScreen />);

    await waitFor(() => {
      expect(screen.getByTestId("sell-card-uc-1")).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId("sell-card-uc-1"));

    await waitFor(() => {
      expect(screen.getByTestId("sale-price-input")).toBeTruthy();
    });

    return screen;
  }

  it("abre o painel de venda ao tocar em Vender", async () => {
    const { getByTestId } = await openSalePanel();

    expect(getByTestId("confirm-sale")).toBeTruthy();
    expect(getByTestId("cancel-sale")).toBeTruthy();
  });

  it("confirma a venda com preço e remove a carta da lista", async () => {
    const { getByTestId, queryByTestId } = await openSalePanel();

    fireEvent.changeText(getByTestId("sale-price-input"), "30.5");
    await act(async () => {
      fireEvent.press(getByTestId("confirm-sale"));
    });

    expect(markCardAsSold).toHaveBeenCalledWith("uc-1", 30.5);
    await waitFor(() => {
      expect(queryByTestId("album-item-uc-1")).toBeNull();
    });
  });

  it("não chama o repositório com preço vazio", async () => {
    const { getByTestId } = await openSalePanel();

    fireEvent.press(getByTestId("confirm-sale"));

    expect(markCardAsSold).not.toHaveBeenCalled();
  });

  it("mostra alerta quando a venda falha", async () => {
    (markCardAsSold as jest.Mock).mockRejectedValue(new Error("venda falhou"));
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    const { getByTestId } = await openSalePanel();

    fireEvent.changeText(getByTestId("sale-price-input"), "30.5");
    fireEvent.press(getByTestId("confirm-sale"));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Erro", "venda falhou");
    });
  });

  it("cancela a venda fechando o painel sem chamar o repositório", async () => {
    const { getByTestId, queryByTestId } = await openSalePanel();

    fireEvent.press(getByTestId("cancel-sale"));

    await waitFor(() => {
      expect(queryByTestId("sale-price-input")).toBeNull();
    });
    expect(markCardAsSold).not.toHaveBeenCalled();
  });
});

describe("AlbumScreen card status", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (listUserCards as jest.Mock).mockResolvedValue(CARDS);
    (fetchSetProgress as jest.Mock).mockResolvedValue([]);
    (isPremium as jest.Mock).mockResolvedValue(false);
    (updateCardStatus as jest.Mock).mockResolvedValue(undefined);
  });

  async function openStatusPanel() {
    const screen = render(<AlbumScreen />);

    await waitFor(() => {
      expect(screen.getByTestId("card-status-uc-1")).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId("card-status-uc-1"));

    await waitFor(() => {
      expect(screen.getByTestId("status-option-a_venda")).toBeTruthy();
    });

    return screen;
  }

  it("abre o painel de status ao tocar em Status", async () => {
    const { getByTestId } = await openStatusPanel();

    expect(getByTestId("status-option-guardada")).toBeTruthy();
    expect(getByTestId("status-option-disponivel_troca")).toBeTruthy();
    expect(getByTestId("cancel-status")).toBeTruthy();
  });

  it("atualiza o status e fecha o painel ao escolher uma opção", async () => {
    const { getByTestId, queryByTestId } = await openStatusPanel();

    await act(async () => {
      fireEvent.press(getByTestId("status-option-a_venda"));
    });

    expect(updateCardStatus).toHaveBeenCalledWith("uc-1", "a_venda");
    expect(queryByTestId("status-option-a_venda")).toBeNull();
  });

  it("mostra alerta quando a atualização falha", async () => {
    (updateCardStatus as jest.Mock).mockRejectedValue(new Error("status falhou"));
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    const { getByTestId } = await openStatusPanel();

    await act(async () => {
      fireEvent.press(getByTestId("status-option-a_venda"));
    });

    expect(alertSpy).toHaveBeenCalledWith("Erro", "status falhou");
  });

  it("cancela fechando o painel sem chamar o repositório", async () => {
    const { getByTestId, queryByTestId } = await openStatusPanel();

    fireEvent.press(getByTestId("cancel-status"));

    await waitFor(() => {
      expect(queryByTestId("status-option-a_venda")).toBeNull();
    });
    expect(updateCardStatus).not.toHaveBeenCalled();
  });
});

describe("AlbumScreen card images", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetchSetProgress as jest.Mock).mockResolvedValue([]);
    (isPremium as jest.Mock).mockResolvedValue(false);
  });

  it("mostra a foto própria da carta quando existe", async () => {
    (listUserCards as jest.Mock).mockResolvedValue([
      { ...CARDS[0], photoUrl: "https://cdn.supabase.co/card-photos/user-1/1.jpg" }
    ]);
    const { getByTestId } = render(<AlbumScreen />);

    await waitFor(() => {
      expect(getByTestId("album-image-uc-1").props.source).toEqual({
        uri: "https://cdn.supabase.co/card-photos/user-1/1.jpg"
      });
    });
  });

  it("usa a imagem oficial do catálogo quando não há foto própria", async () => {
    (listUserCards as jest.Mock).mockResolvedValue([{ ...CARDS[0], photoUrl: null }]);
    const { getByTestId } = render(<AlbumScreen />);

    await waitFor(() => {
      expect(getByTestId("album-image-uc-1").props.source).toEqual({
        uri: "https://example.com/25.png"
      });
    });
  });
});
