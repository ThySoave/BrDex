const mockReplace = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockReplace }),
  useLocalSearchParams: () => ({ catalogCardId: "base1-4" })
}));
jest.mock("../../src/features/premium/entitlementsRepository", () => ({
  isPremium: jest.fn()
}));
jest.mock("../../src/features/collection/collectionRepository", () => ({
  addUserCard: jest.fn(),
  countUserCards: jest.fn()
}));
jest.mock("../../src/components/CardPrices", () => ({
  CardPrices: () => null
}));
jest.mock("../../src/features/collection/photoRepository", () => ({
  uploadCardPhoto: jest.fn()
}));
jest.mock("expo-image-picker", () => ({
  requestCameraPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn()
}));

import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { uploadCardPhoto } from "../../src/features/collection/photoRepository";
import { isPremium } from "../../src/features/premium/entitlementsRepository";
import { addUserCard, countUserCards } from "../../src/features/collection/collectionRepository";
import { FREE_CARD_LIMIT } from "../../src/features/premium/cardLimit";
import AddCardScreen from "./add";

describe("AddCardScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (addUserCard as jest.Mock).mockResolvedValue(undefined);
  });

  it("shows the upsell instead of the form for free users at the card limit", async () => {
    (isPremium as jest.Mock).mockResolvedValue(false);
    (countUserCards as jest.Mock).mockResolvedValue(FREE_CARD_LIMIT);

    const { getByTestId, queryByTestId } = render(<AddCardScreen />);

    await waitFor(() => {
      expect(getByTestId("card-limit-upsell")).toBeTruthy();
    });
    expect(queryByTestId("add-card-submit")).toBeNull();
  });

  it("shows the form for free users below the limit and saves the card", async () => {
    (isPremium as jest.Mock).mockResolvedValue(false);
    (countUserCards as jest.Mock).mockResolvedValue(FREE_CARD_LIMIT - 1);

    const { getByTestId } = render(<AddCardScreen />);

    await waitFor(() => {
      expect(getByTestId("add-card-submit")).toBeTruthy();
    });

    fireEvent.press(getByTestId("add-card-submit"));

    await waitFor(() => {
      expect(addUserCard).toHaveBeenCalledWith({
        catalogCardId: "base1-4",
        language: "en",
        condition: "near_mint",
        pricePaid: null,
        status: "guardada",
        photoUrl: null
      });
    });
    expect(mockReplace).toHaveBeenCalledWith("/(tabs)/album");
  });

  it("expõe tirar foto e salvar como botões", async () => {
    (isPremium as jest.Mock).mockResolvedValue(false);
    (countUserCards as jest.Mock).mockResolvedValue(FREE_CARD_LIMIT - 1);

    const { findByRole, getByRole } = render(<AddCardScreen />);

    await findByRole("button", { name: "Salvar carta" });
    expect(getByRole("button", { name: "Tirar foto da carta" })).toBeTruthy();
  });

  it("parses a decimal comma price before saving", async () => {
    (isPremium as jest.Mock).mockResolvedValue(false);
    (countUserCards as jest.Mock).mockResolvedValue(FREE_CARD_LIMIT - 1);

    const { getByTestId } = render(<AddCardScreen />);

    await waitFor(() => {
      expect(getByTestId("add-card-submit")).toBeTruthy();
    });

    fireEvent.changeText(getByTestId("add-card-price"), "12,50");
    fireEvent.press(getByTestId("add-card-submit"));

    await waitFor(() => {
      expect(addUserCard).toHaveBeenCalledWith(expect.objectContaining({ pricePaid: 12.5 }));
    });
  });

  it("saves a null price when the input is not numeric", async () => {
    (isPremium as jest.Mock).mockResolvedValue(false);
    (countUserCards as jest.Mock).mockResolvedValue(FREE_CARD_LIMIT - 1);

    const { getByTestId } = render(<AddCardScreen />);

    await waitFor(() => {
      expect(getByTestId("add-card-submit")).toBeTruthy();
    });

    fireEvent.changeText(getByTestId("add-card-price"), "abc");
    fireEvent.press(getByTestId("add-card-submit"));

    await waitFor(() => {
      expect(addUserCard).toHaveBeenCalledWith(expect.objectContaining({ pricePaid: null }));
    });
  });

  it("shows the form for premium users even at the limit", async () => {
    (isPremium as jest.Mock).mockResolvedValue(true);
    (countUserCards as jest.Mock).mockResolvedValue(FREE_CARD_LIMIT + 20);

    const { getByTestId, queryByTestId } = render(<AddCardScreen />);

    await waitFor(() => {
      expect(getByTestId("add-card-submit")).toBeTruthy();
    });
    expect(queryByTestId("card-limit-upsell")).toBeNull();
  });

  it("fails open and shows the form when the limit check errors", async () => {
    (isPremium as jest.Mock).mockResolvedValue(false);
    (countUserCards as jest.Mock).mockRejectedValue(new Error("offline"));

    const { getByTestId, queryByTestId } = render(<AddCardScreen />);

    await waitFor(() => {
      expect(getByTestId("add-card-submit")).toBeTruthy();
    });
    expect(queryByTestId("card-limit-upsell")).toBeNull();
  });
});

describe("AddCardScreen photo capture", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (isPremium as jest.Mock).mockResolvedValue(false);
    (countUserCards as jest.Mock).mockResolvedValue(0);
    (addUserCard as jest.Mock).mockResolvedValue(undefined);
    (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
    (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ base64: "Zm90bw==" }]
    });
    (uploadCardPhoto as jest.Mock).mockResolvedValue(
      "https://cdn.supabase.co/card-photos/user-1/1.jpg"
    );
  });

  async function renderForm() {
    const screen = render(<AddCardScreen />);
    await waitFor(() => {
      expect(screen.getByTestId("add-card-photo")).toBeTruthy();
    });
    return screen;
  }

  it("captura a foto, faz upload e envia a URL no cadastro", async () => {
    const { getByTestId } = await renderForm();

    await act(async () => {
      fireEvent.press(getByTestId("add-card-photo"));
    });

    expect(uploadCardPhoto).toHaveBeenCalledWith("Zm90bw==");
    expect(getByTestId("add-card-photo-done")).toBeTruthy();

    await act(async () => {
      fireEvent.press(getByTestId("add-card-submit"));
    });

    expect(addUserCard).toHaveBeenCalledWith(
      expect.objectContaining({
        photoUrl: "https://cdn.supabase.co/card-photos/user-1/1.jpg"
      })
    );
  });

  it("não faz upload quando a captura é cancelada", async () => {
    (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({
      canceled: true,
      assets: null
    });
    const { getByTestId, queryByTestId } = await renderForm();

    await act(async () => {
      fireEvent.press(getByTestId("add-card-photo"));
    });

    expect(uploadCardPhoto).not.toHaveBeenCalled();
    expect(queryByTestId("add-card-photo-done")).toBeNull();
  });

  it("mostra alerta quando o upload falha e o cadastro segue sem foto", async () => {
    (uploadCardPhoto as jest.Mock).mockRejectedValue(new Error("upload falhou"));
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    const { getByTestId, queryByTestId } = await renderForm();

    await act(async () => {
      fireEvent.press(getByTestId("add-card-photo"));
    });

    expect(alertSpy).toHaveBeenCalledWith("Erro", "upload falhou");
    expect(queryByTestId("add-card-photo-done")).toBeNull();

    await act(async () => {
      fireEvent.press(getByTestId("add-card-submit"));
    });

    expect(addUserCard).toHaveBeenCalledWith(
      expect.objectContaining({ photoUrl: null })
    );
  });
});
