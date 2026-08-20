const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush })
}));
jest.mock("../../src/features/catalog/catalogRepository", () => ({
  fetchCatalogPage: jest.fn()
}));
jest.mock("../../src/features/social/wishlistRepository", () => ({
  addToWishlist: jest.fn()
}));
jest.mock("../../src/features/premium/entitlementsRepository", () => ({
  isPremium: jest.fn()
}));
jest.mock("../../src/features/premium/priceAlertsRepository", () => ({
  createPriceAlert: jest.fn()
}));

import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { fetchCatalogPage } from "../../src/features/catalog/catalogRepository";
import { isPremium } from "../../src/features/premium/entitlementsRepository";
import { createPriceAlert } from "../../src/features/premium/priceAlertsRepository";
import CatalogScreen from "./catalog";

const CARDS = [
  {
    id: "card-1",
    name: "Pikachu",
    number: "25",
    setName: "Base Set",
    rarity: "Common",
    imageUrl: "https://example.com/25.png"
  }
];

describe("CatalogScreen price alerts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetchCatalogPage as jest.Mock).mockResolvedValue(CARDS);
    (createPriceAlert as jest.Mock).mockResolvedValue(undefined);
  });

  it("lets a premium user create a price alert with a threshold", async () => {
    (isPremium as jest.Mock).mockResolvedValue(true);
    const { getByTestId } = render(<CatalogScreen />);

    await waitFor(() => {
      expect(getByTestId("price-alert-add-card-1")).toBeTruthy();
    });

    fireEvent.press(getByTestId("price-alert-add-card-1"));
    fireEvent.changeText(getByTestId("price-alert-threshold"), "90");
    fireEvent.press(getByTestId("price-alert-confirm"));

    await waitFor(() => {
      expect(createPriceAlert).toHaveBeenCalledWith("card-1", "en", 90);
    });
  });

  it("shows an upsell instead for non-premium users", async () => {
    (isPremium as jest.Mock).mockResolvedValue(false);
    const { getByTestId } = render(<CatalogScreen />);

    await waitFor(() => {
      expect(getByTestId("price-alert-add-card-1")).toBeTruthy();
    });

    fireEvent.press(getByTestId("price-alert-add-card-1"));

    await waitFor(() => {
      expect(getByTestId("price-alert-upsell")).toBeTruthy();
    });
    expect(createPriceAlert).not.toHaveBeenCalled();
  });

  it("navigates to the scanner screen from the scanner button", async () => {
    (isPremium as jest.Mock).mockResolvedValue(true);
    const { getByTestId } = render(<CatalogScreen />);

    fireEvent.press(getByTestId("open-scanner"));

    expect(mockPush).toHaveBeenCalledWith("/card/scan");
  });
});
