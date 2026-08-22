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

  it("expõe as ações por carta e o scanner como botões rotulados", async () => {
    (isPremium as jest.Mock).mockResolvedValue(false);
    const { findByRole, getByRole } = render(<CatalogScreen />);

    await findByRole("button", { name: "Quero Pikachu" });
    expect(getByRole("button", { name: "Comprar Pikachu" })).toBeTruthy();
    expect(getByRole("button", { name: "Alerta de preço para Pikachu" })).toBeTruthy();
    expect(getByRole("button", { name: "Escanear carta com a câmera" })).toBeTruthy();
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

describe("CatalogScreen wishlist language", () => {
  const { addToWishlist } = require("../../src/features/social/wishlistRepository");

  beforeEach(() => {
    jest.clearAllMocks();
    (fetchCatalogPage as jest.Mock).mockResolvedValue(CARDS);
    (isPremium as jest.Mock).mockResolvedValue(false);
    (addToWishlist as jest.Mock).mockResolvedValue(undefined);
  });

  it("opens the language panel instead of adding directly", async () => {
    const { getByTestId } = render(<CatalogScreen />);

    await waitFor(() => {
      expect(getByTestId("wishlist-add-card-1")).toBeTruthy();
    });

    fireEvent.press(getByTestId("wishlist-add-card-1"));

    expect(getByTestId("wishlist-language-any")).toBeTruthy();
    expect(addToWishlist).not.toHaveBeenCalled();
  });

  it("adds with null language when choosing any language", async () => {
    const { getByTestId, queryByTestId } = render(<CatalogScreen />);

    await waitFor(() => {
      expect(getByTestId("wishlist-add-card-1")).toBeTruthy();
    });

    fireEvent.press(getByTestId("wishlist-add-card-1"));
    fireEvent.press(getByTestId("wishlist-language-any"));

    await waitFor(() => {
      expect(addToWishlist).toHaveBeenCalledWith("card-1", null);
    });
    await waitFor(() => {
      expect(queryByTestId("wishlist-language-any")).toBeNull();
    });
  });

  it("adds with a specific language", async () => {
    const { getByTestId } = render(<CatalogScreen />);

    await waitFor(() => {
      expect(getByTestId("wishlist-add-card-1")).toBeTruthy();
    });

    fireEvent.press(getByTestId("wishlist-add-card-1"));
    fireEvent.press(getByTestId("wishlist-language-pt"));

    await waitFor(() => {
      expect(addToWishlist).toHaveBeenCalledWith("card-1", "pt");
    });
  });

  it("cancels without adding", async () => {
    const { getByTestId, queryByTestId } = render(<CatalogScreen />);

    await waitFor(() => {
      expect(getByTestId("wishlist-add-card-1")).toBeTruthy();
    });

    fireEvent.press(getByTestId("wishlist-add-card-1"));
    fireEvent.press(getByTestId("wishlist-language-cancel"));

    expect(queryByTestId("wishlist-language-any")).toBeNull();
    expect(addToWishlist).not.toHaveBeenCalled();
  });
});

describe("CatalogScreen empty state", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (isPremium as jest.Mock).mockResolvedValue(false);
  });

  it("mostra o estado vazio quando o catálogo não tem cartas", async () => {
    (fetchCatalogPage as jest.Mock).mockResolvedValue([]);
    const { findByTestId } = render(<CatalogScreen />);

    const empty = await findByTestId("catalog-empty");
    expect(empty).toBeTruthy();
  });
});
