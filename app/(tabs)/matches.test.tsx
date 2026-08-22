jest.mock("../../src/features/social/matchesRepository", () => ({
  listMatches: jest.fn()
}));
jest.mock("../../src/features/social/chatRepository", () => ({
  getOrCreateConversation: jest.fn()
}));
jest.mock("../../src/features/premium/entitlementsRepository", () => ({
  isUserVerified: jest.fn()
}));
const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useFocusEffect: (callback: () => void) => {
    const React = require("react");
    React.useEffect(callback, []);
  },
  router: { push: (...args: unknown[]) => mockPush(...args) }
}));

import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { isUserVerified } from "../../src/features/premium/entitlementsRepository";
import { listMatches } from "../../src/features/social/matchesRepository";
import MatchesScreen from "./matches";

const MATCHES = [
  {
    id: "m1",
    role: "quero",
    otherUserId: "user-a",
    cardName: "Pikachu",
    cardImageUrl: "https://example.com/25.png"
  },
  {
    id: "m2",
    role: "tenho",
    otherUserId: "user-b",
    cardName: "Alakazam",
    cardImageUrl: "https://example.com/1.png"
  }
];

describe("MatchesScreen verified badge", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (listMatches as jest.Mock).mockResolvedValue(MATCHES);
    (isUserVerified as jest.Mock).mockImplementation((userId: string) =>
      Promise.resolve(userId === "user-b")
    );
  });

  it("expõe conversar como botão rotulado com o nome da carta", async () => {
    const { findAllByRole } = render(<MatchesScreen />);

    const buttons = await findAllByRole("button", { name: /Conversar sobre/ });
    expect(buttons.length).toBeGreaterThan(0);
  });

  it("shows the badge only for verified users", async () => {
    const { getByTestId, queryByTestId } = render(<MatchesScreen />);

    await waitFor(() => {
      expect(getByTestId("verified-badge-m2")).toBeTruthy();
    });
    expect(queryByTestId("verified-badge-m1")).toBeNull();
  });

  it("lists matches with verified users first", async () => {
    const { getAllByTestId, getByTestId } = render(<MatchesScreen />);

    await waitFor(() => {
      expect(getByTestId("verified-badge-m2")).toBeTruthy();
    });

    const items = getAllByTestId(/^match-item-/);
    expect(items[0].props.testID).toBe("match-item-m2");
    expect(items[1].props.testID).toBe("match-item-m1");
  });
});

describe("MatchesScreen wishlist link", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (listMatches as jest.Mock).mockResolvedValue([]);
    (isUserVerified as jest.Mock).mockResolvedValue(false);
  });

  it("expõe o link da wishlist como botão", async () => {
    const { findByRole } = render(<MatchesScreen />);

    await findByRole("button", { name: "Minha lista de desejos" });
  });

  it("navigates to the wishlist screen from the fixed link", async () => {
    const { getByTestId } = render(<MatchesScreen />);

    await waitFor(() => {
      expect(getByTestId("open-wishlist")).toBeTruthy();
    });

    fireEvent.press(getByTestId("open-wishlist"));

    expect(mockPush).toHaveBeenCalledWith("/wishlist");
  });
});

describe("MatchesScreen loading state", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (isUserVerified as jest.Mock).mockResolvedValue(false);
  });

  it("mostra o carregamento enquanto as trocas ainda não responderam", () => {
    (listMatches as jest.Mock).mockReturnValue(new Promise(() => {}));
    const { getByTestId, queryByTestId } = render(<MatchesScreen />);

    expect(getByTestId("matches-loading")).toBeTruthy();
    expect(queryByTestId("matches-empty")).toBeNull();
  });
});
