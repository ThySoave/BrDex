jest.mock("../../src/features/social/marketRepository", () => ({
  searchMarketListings: jest.fn()
}));
jest.mock("../../src/features/social/chatRepository", () => ({
  getOrCreateConversation: jest.fn()
}));
const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useFocusEffect: (callback: () => void) => {
    const React = require("react");
    React.useEffect(callback, []);
  },
  router: { push: (...args: unknown[]) => mockPush(...args) }
}));

import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { getOrCreateConversation } from "../../src/features/social/chatRepository";
import { searchMarketListings } from "../../src/features/social/marketRepository";
import MarketScreen from "./market";

const LISTINGS = [
  {
    userCardId: "uc-1",
    catalogCardId: "card-1",
    cardName: "Pikachu",
    cardImageUrl: "https://example.com/25.png",
    language: "en",
    condition: "near_mint",
    status: "a_venda",
    sellerId: "user-2",
    sellerVerified: true
  },
  {
    userCardId: "uc-2",
    catalogCardId: "card-2",
    cardName: "Alakazam",
    cardImageUrl: "https://example.com/1.png",
    language: "pt",
    condition: "good",
    status: "disponivel_troca",
    sellerId: "user-3",
    sellerVerified: false
  }
];

describe("MarketScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (searchMarketListings as jest.Mock).mockResolvedValue(LISTINGS);
    (getOrCreateConversation as jest.Mock).mockResolvedValue("conv-1");
  });

  it("searches with the typed text and renders listings with status labels", async () => {
    const { getByTestId, getByText } = render(<MarketScreen />);

    await waitFor(() => {
      expect(searchMarketListings).toHaveBeenCalledWith("");
    });

    fireEvent.changeText(getByTestId("market-search-input"), "Pika");
    fireEvent.press(getByTestId("market-search-submit"));

    await waitFor(() => {
      expect(searchMarketListings).toHaveBeenCalledWith("Pika");
      expect(getByText("Pikachu")).toBeTruthy();
      expect(getByText("À venda")).toBeTruthy();
      expect(getByText("Para troca")).toBeTruthy();
    });
  });

  it("shows the verified badge only for verified sellers", async () => {
    const { getByTestId, queryByTestId } = render(<MarketScreen />);

    await waitFor(() => {
      expect(getByTestId("market-verified-uc-1")).toBeTruthy();
    });
    expect(queryByTestId("market-verified-uc-2")).toBeNull();
  });

  it("expõe buscar como botão", async () => {
    const { findByRole } = render(<MarketScreen />);

    await findByRole("button", { name: "Buscar" });
  });

  it("opens a conversation with the seller", async () => {
    const { getByTestId } = render(<MarketScreen />);

    await waitFor(() => {
      expect(getByTestId("market-chat-uc-1")).toBeTruthy();
    });

    fireEvent.press(getByTestId("market-chat-uc-1"));

    await waitFor(() => {
      expect(getOrCreateConversation).toHaveBeenCalledWith("user-2");
      expect(mockPush).toHaveBeenCalledWith("/chat/conv-1?other=user-2");
    });
  });

  it("navigates to the seller profile", async () => {
    const { getByTestId } = render(<MarketScreen />);

    await waitFor(() => {
      expect(getByTestId("market-seller-uc-1")).toBeTruthy();
    });

    fireEvent.press(getByTestId("market-seller-uc-1"));

    expect(mockPush).toHaveBeenCalledWith("/user/user-2");
  });
});

describe("MarketScreen loading state", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("mostra o carregamento enquanto a busca inicial não respondeu", () => {
    (searchMarketListings as jest.Mock).mockReturnValue(new Promise(() => {}));
    const { getByTestId, queryByTestId } = render(<MarketScreen />);

    expect(getByTestId("market-loading")).toBeTruthy();
    expect(queryByTestId("market-empty")).toBeNull();
  });
});

describe("MarketScreen retry", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("refaz a busca ao tocar em tentar novamente", async () => {
    (searchMarketListings as jest.Mock)
      .mockRejectedValueOnce(new Error("sem conexão"))
      .mockResolvedValueOnce(LISTINGS);
    const { findByTestId, queryByTestId } = render(<MarketScreen />);

    const retry = await findByTestId("market-retry");
    await act(async () => {
      fireEvent.press(retry);
    });

    await findByTestId("market-list");
    expect(queryByTestId("market-error")).toBeNull();
    expect(searchMarketListings).toHaveBeenCalledTimes(2);
  });
});
