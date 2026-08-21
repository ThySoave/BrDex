jest.mock("../../src/features/social/wishlistRepository", () => ({
  listWishlist: jest.fn(),
  removeFromWishlist: jest.fn()
}));
jest.mock("expo-router", () => ({
  useFocusEffect: (callback: () => void) => {
    const React = require("react");
    React.useEffect(callback, []);
  }
}));

import { Alert } from "react-native";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { listWishlist, removeFromWishlist } from "../../src/features/social/wishlistRepository";
import WishlistScreen from "./index";

const ITEMS = [
  {
    id: "wish-1",
    catalogCardId: "card-1",
    cardName: "Pikachu",
    cardImageUrl: "https://img/pikachu.png",
    language: null
  },
  {
    id: "wish-2",
    catalogCardId: "card-2",
    cardName: "Charizard",
    cardImageUrl: "https://img/charizard.png",
    language: "pt"
  }
];

describe("WishlistScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (listWishlist as jest.Mock).mockResolvedValue(ITEMS);
    (removeFromWishlist as jest.Mock).mockResolvedValue(undefined);
  });

  it("renders the wishlist items with name and language label", async () => {
    const { getByTestId, getByText } = render(<WishlistScreen />);

    await waitFor(() => {
      expect(getByTestId("wishlist-item-wish-1")).toBeTruthy();
    });
    expect(getByText("Pikachu")).toBeTruthy();
    expect(getByText("Qualquer idioma")).toBeTruthy();
    expect(getByText("Charizard")).toBeTruthy();
    expect(getByText("Português")).toBeTruthy();
  });

  it("removes an item from the list", async () => {
    const { getByTestId, queryByTestId } = render(<WishlistScreen />);

    await waitFor(() => {
      expect(getByTestId("wishlist-remove-wish-1")).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByTestId("wishlist-remove-wish-1"));
    });

    expect(removeFromWishlist).toHaveBeenCalledWith("wish-1");
    await waitFor(() => {
      expect(queryByTestId("wishlist-item-wish-1")).toBeNull();
    });
    expect(getByTestId("wishlist-item-wish-2")).toBeTruthy();
  });

  it("keeps the item and alerts when removal fails", async () => {
    (removeFromWishlist as jest.Mock).mockRejectedValue(new Error("falha de rede"));
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);

    const { getByTestId } = render(<WishlistScreen />);

    await waitFor(() => {
      expect(getByTestId("wishlist-remove-wish-1")).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByTestId("wishlist-remove-wish-1"));
    });

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Erro", "falha de rede");
    });
    expect(getByTestId("wishlist-item-wish-1")).toBeTruthy();
  });

  it("shows the empty state when the wishlist is empty", async () => {
    (listWishlist as jest.Mock).mockResolvedValue([]);

    const { getByTestId } = render(<WishlistScreen />);

    await waitFor(() => {
      expect(getByTestId("wishlist-empty")).toBeTruthy();
    });
  });

  it("alerts when loading fails", async () => {
    (listWishlist as jest.Mock).mockRejectedValue(new Error("sem conexão"));
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);

    render(<WishlistScreen />);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Erro", "sem conexão");
    });
  });
});
