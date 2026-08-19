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
jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ conversationId: "conv-1", other: "user-2" }),
  router: { back: jest.fn() }
}));

import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { listMessages, subscribeToMessages } from "../../src/features/social/chatRepository";
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
