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

import { fireEvent, render, waitFor } from "@testing-library/react-native";
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
