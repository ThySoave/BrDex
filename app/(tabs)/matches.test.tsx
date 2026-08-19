jest.mock("../../src/features/social/matchesRepository", () => ({
  listMatches: jest.fn()
}));
jest.mock("../../src/features/social/chatRepository", () => ({
  getOrCreateConversation: jest.fn()
}));
jest.mock("../../src/features/premium/entitlementsRepository", () => ({
  isUserVerified: jest.fn()
}));
jest.mock("expo-router", () => ({
  useFocusEffect: (callback: () => void) => {
    const React = require("react");
    React.useEffect(callback, []);
  },
  router: { push: jest.fn() }
}));

import { render, waitFor } from "@testing-library/react-native";
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
