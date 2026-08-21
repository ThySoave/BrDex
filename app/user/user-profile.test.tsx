jest.mock("../../src/features/premium/entitlementsRepository", () => ({
  isUserVerified: jest.fn()
}));
jest.mock("../../src/features/social/ratingsRepository", () => ({
  userRatingSummary: jest.fn()
}));
jest.mock("../../src/features/social/safetyRepository", () => ({
  blockUser: jest.fn(),
  reportUser: jest.fn()
}));
const mockBack = jest.fn();
jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ userId: "user-2" }),
  router: { back: (...args: unknown[]) => mockBack(...args) }
}));

import { Alert } from "react-native";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { isUserVerified } from "../../src/features/premium/entitlementsRepository";
import { userRatingSummary } from "../../src/features/social/ratingsRepository";
import { blockUser, reportUser } from "../../src/features/social/safetyRepository";
import UserProfileScreen from "./[userId]";

describe("UserProfileScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (isUserVerified as jest.Mock).mockResolvedValue(false);
    (userRatingSummary as jest.Mock).mockResolvedValue({ avgStars: null, ratingsCount: 0 });
    (blockUser as jest.Mock).mockResolvedValue(undefined);
    (reportUser as jest.Mock).mockResolvedValue(undefined);
  });

  it("shows the verified badge when the user is verified", async () => {
    (isUserVerified as jest.Mock).mockResolvedValue(true);

    const { getByTestId } = render(<UserProfileScreen />);

    await waitFor(() => {
      expect(getByTestId("user-verified")).toBeTruthy();
    });
    expect(isUserVerified).toHaveBeenCalledWith("user-2");
  });

  it("hides the verified badge when the user is not verified", async () => {
    const { getByTestId, queryByTestId } = render(<UserProfileScreen />);

    await waitFor(() => {
      expect(getByTestId("user-rating")).toBeTruthy();
    });
    expect(queryByTestId("user-verified")).toBeNull();
  });

  it("shows the rating summary with average and count", async () => {
    (userRatingSummary as jest.Mock).mockResolvedValue({ avgStars: 4.5, ratingsCount: 12 });

    const { getByText } = render(<UserProfileScreen />);

    await waitFor(() => {
      expect(getByText("Reputação: 4,5 (12 avaliações)")).toBeTruthy();
    });
  });

  it("shows a placeholder when the user has no ratings", async () => {
    const { getByText } = render(<UserProfileScreen />);

    await waitFor(() => {
      expect(getByText("Sem avaliações")).toBeTruthy();
    });
  });

  it("expõe denunciar e bloquear como botões", async () => {
    const { findByRole, getByRole } = render(<UserProfileScreen />);

    await findByRole("button", { name: "Denunciar usuário" });
    expect(getByRole("button", { name: "Bloquear usuário" })).toBeTruthy();
  });

  it("reports the user from the profile", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
    const { getByTestId } = render(<UserProfileScreen />);

    await waitFor(() => {
      expect(getByTestId("report-user")).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByTestId("report-user"));
    });

    await waitFor(() => {
      expect(reportUser).toHaveBeenCalledWith(
        "user-2",
        "denúncia feita a partir do perfil",
        "perfil user-2"
      );
      expect(alertSpy).toHaveBeenCalledWith("Denúncia enviada", "Nossa equipe vai analisar.");
    });
  });

  it("blocks the user and navigates back", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
    const { getByTestId } = render(<UserProfileScreen />);

    await waitFor(() => {
      expect(getByTestId("block-user")).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByTestId("block-user"));
    });

    await waitFor(() => {
      expect(blockUser).toHaveBeenCalledWith("user-2");
      expect(alertSpy).toHaveBeenCalledWith("Usuário bloqueado");
      expect(mockBack).toHaveBeenCalled();
    });
  });

  it("alerts when reporting fails", async () => {
    (reportUser as jest.Mock).mockRejectedValue(new Error("falha de rede"));
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);

    const { getByTestId } = render(<UserProfileScreen />);

    await waitFor(() => {
      expect(getByTestId("report-user")).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByTestId("report-user"));
    });

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Erro", "falha de rede");
    });
  });
});
