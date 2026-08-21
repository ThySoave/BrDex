jest.mock("../../src/features/social/chatRepository", () => ({
  listMessages: jest.fn(),
  sendMessage: jest.fn(),
  subscribeToMessages: jest.fn()
}));
jest.mock("../../src/features/social/safetyRepository", () => ({
  blockUser: jest.fn(),
  reportUser: jest.fn()
}));
jest.mock("../../src/features/social/tradesRepository", () => ({
  listTrades: jest.fn(),
  proposeTrade: jest.fn(),
  confirmTrade: jest.fn(),
  completedTradesCount: jest.fn()
}));
jest.mock("../../src/features/social/ratingsRepository", () => ({
  rateTrade: jest.fn(),
  myRatedTradeIds: jest.fn(),
  userRatingSummary: jest.fn()
}));
const mockChatPush = jest.fn();
jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ conversationId: "conv-1", other: "user-2" }),
  router: { back: jest.fn(), push: (...args: unknown[]) => mockChatPush(...args) }
}));

import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { listMessages, subscribeToMessages } from "../../src/features/social/chatRepository";
import {
  myRatedTradeIds,
  rateTrade,
  userRatingSummary
} from "../../src/features/social/ratingsRepository";
import {
  completedTradesCount,
  confirmTrade,
  listTrades,
  proposeTrade
} from "../../src/features/social/tradesRepository";
import ChatScreen from "./[conversationId]";

describe("ChatScreen trades", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (listMessages as jest.Mock).mockResolvedValue([]);
    (subscribeToMessages as jest.Mock).mockReturnValue(() => {});
    (listTrades as jest.Mock).mockResolvedValue([]);
    (completedTradesCount as jest.Mock).mockResolvedValue(3);
    (proposeTrade as jest.Mock).mockResolvedValue(undefined);
    (confirmTrade as jest.Mock).mockResolvedValue(undefined);
    (rateTrade as jest.Mock).mockResolvedValue(undefined);
    (myRatedTradeIds as jest.Mock).mockResolvedValue([]);
    (userRatingSummary as jest.Mock).mockResolvedValue({ avgStars: null, ratingsCount: 0 });
  });

  it("shows the other user's completed trades count", async () => {
    const { getByTestId, getByText } = render(<ChatScreen />);

    await waitFor(() => {
      expect(getByTestId("chat-reputation")).toBeTruthy();
      expect(getByText("3 negociações concluídas")).toBeTruthy();
    });
    expect(completedTradesCount).toHaveBeenCalledWith("user-2");
  });

  it("proposes a completed trade for the conversation", async () => {
    const { getByTestId } = render(<ChatScreen />);

    await waitFor(() => {
      expect(getByTestId("chat-propose-trade")).toBeTruthy();
    });

    fireEvent.press(getByTestId("chat-propose-trade"));

    await waitFor(() => {
      expect(proposeTrade).toHaveBeenCalledWith("conv-1");
    });
  });

  it("confirms a pending trade proposed by the other user", async () => {
    (listTrades as jest.Mock).mockResolvedValue([
      {
        id: "trade-1",
        conversationId: "conv-1",
        proposedBy: "user-2",
        createdAt: "2026-08-19T10:00:00Z",
        confirmedAt: null
      }
    ]);

    const { getByTestId } = render(<ChatScreen />);

    await waitFor(() => {
      expect(getByTestId("chat-confirm-trade")).toBeTruthy();
    });

    fireEvent.press(getByTestId("chat-confirm-trade"));

    await waitFor(() => {
      expect(confirmTrade).toHaveBeenCalledWith("trade-1");
    });
  });
});

describe("ChatScreen ratings", () => {
  const confirmedTrade = {
    id: "trade-1",
    conversationId: "conv-1",
    proposedBy: "user-2",
    createdAt: "2026-08-19T10:00:00Z",
    confirmedAt: "2026-08-19T11:00:00Z"
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (listMessages as jest.Mock).mockResolvedValue([]);
    (subscribeToMessages as jest.Mock).mockReturnValue(() => {});
    (listTrades as jest.Mock).mockResolvedValue([]);
    (completedTradesCount as jest.Mock).mockResolvedValue(3);
    (rateTrade as jest.Mock).mockResolvedValue(undefined);
    (myRatedTradeIds as jest.Mock).mockResolvedValue([]);
    (userRatingSummary as jest.Mock).mockResolvedValue({ avgStars: null, ratingsCount: 0 });
  });

  it("shows the other user's rating average", async () => {
    (userRatingSummary as jest.Mock).mockResolvedValue({ avgStars: 4.5, ratingsCount: 2 });

    const { getByTestId, getByText } = render(<ChatScreen />);

    await waitFor(() => {
      expect(getByTestId("chat-rating-summary")).toBeTruthy();
      expect(getByText("4.5 ★ (2 avaliações)")).toBeTruthy();
    });
    expect(userRatingSummary).toHaveBeenCalledWith("user-2");
  });

  it("rates a confirmed trade not yet rated by me", async () => {
    (listTrades as jest.Mock).mockResolvedValue([confirmedTrade]);

    const { getByTestId } = render(<ChatScreen />);

    await waitFor(() => {
      expect(getByTestId("chat-rate-1")).toBeTruthy();
      expect(getByTestId("chat-rate-5")).toBeTruthy();
    });

    fireEvent.press(getByTestId("chat-rate-5"));

    await waitFor(() => {
      expect(rateTrade).toHaveBeenCalledWith("trade-1", 5);
    });
  });

  it("hides the rating stars when the confirmed trade is already rated", async () => {
    (listTrades as jest.Mock).mockResolvedValue([confirmedTrade]);
    (myRatedTradeIds as jest.Mock).mockResolvedValue(["trade-1"]);

    const { queryByTestId, getByTestId } = render(<ChatScreen />);

    await waitFor(() => {
      expect(getByTestId("chat-reputation")).toBeTruthy();
    });
    expect(queryByTestId("chat-rate-5")).toBeNull();
  });

  it("navigates to the other user's profile from the header", async () => {
    const { getByTestId } = render(<ChatScreen />);

    await waitFor(() => {
      expect(getByTestId("chat-view-profile")).toBeTruthy();
    });

    fireEvent.press(getByTestId("chat-view-profile"));

    expect(mockChatPush).toHaveBeenCalledWith("/user/user-2");
  });
});
