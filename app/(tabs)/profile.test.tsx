jest.mock("../../src/features/auth/authRepository", () => ({
  getSession: jest.fn(),
  signOut: jest.fn()
}));
jest.mock("../../src/features/premium/entitlementsRepository", () => ({
  isPremium: jest.fn(),
  isUserVerified: jest.fn()
}));
jest.mock("../../src/features/social/ratingsRepository", () => ({
  userRatingSummary: jest.fn()
}));
const mockReplace = jest.fn();
jest.mock("expo-router", () => ({
  router: { replace: (...args: unknown[]) => mockReplace(...args) }
}));

import { Alert } from "react-native";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { getSession, signOut } from "../../src/features/auth/authRepository";
import { isPremium, isUserVerified } from "../../src/features/premium/entitlementsRepository";
import { userRatingSummary } from "../../src/features/social/ratingsRepository";
import ProfileScreen from "./profile";

describe("ProfileScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getSession as jest.Mock).mockResolvedValue({
      user: { id: "user-1", email: "ash@example.com" }
    });
    (isPremium as jest.Mock).mockResolvedValue(false);
    (isUserVerified as jest.Mock).mockResolvedValue(false);
    (userRatingSummary as jest.Mock).mockResolvedValue({ avgStars: null, ratingsCount: 0 });
    (signOut as jest.Mock).mockResolvedValue(undefined);
  });

  it("expõe sair da conta como botão", async () => {
    const { findByRole } = render(<ProfileScreen />);

    await findByRole("button", { name: "Sair da conta" });
  });

  it("shows the session email", async () => {
    const { getByTestId } = render(<ProfileScreen />);

    await waitFor(() => {
      expect(getByTestId("profile-email").props.children).toBe("ash@example.com");
    });
  });

  it("shows the premium plan when the user is premium", async () => {
    (isPremium as jest.Mock).mockResolvedValue(true);

    const { getByText } = render(<ProfileScreen />);

    await waitFor(() => {
      expect(getByText("Plano: Premium")).toBeTruthy();
    });
  });

  it("shows the free plan when the user is not premium", async () => {
    const { getByText } = render(<ProfileScreen />);

    await waitFor(() => {
      expect(getByText("Plano: Grátis")).toBeTruthy();
    });
  });

  it("shows the verified badge only for verified users", async () => {
    (isUserVerified as jest.Mock).mockResolvedValue(true);

    const { getByTestId } = render(<ProfileScreen />);

    await waitFor(() => {
      expect(getByTestId("profile-verified")).toBeTruthy();
    });
  });

  it("hides the verified badge for unverified users", async () => {
    const { getByTestId, queryByTestId } = render(<ProfileScreen />);

    await waitFor(() => {
      expect(getByTestId("profile-email")).toBeTruthy();
    });
    expect(queryByTestId("profile-verified")).toBeNull();
  });

  it("shows the rating summary with average and count", async () => {
    (userRatingSummary as jest.Mock).mockResolvedValue({ avgStars: 4.5, ratingsCount: 12 });

    const { getByText } = render(<ProfileScreen />);

    await waitFor(() => {
      expect(getByText("Reputação: 4,5 (12 avaliações)")).toBeTruthy();
    });
  });

  it("shows a placeholder when the user has no ratings", async () => {
    const { getByText } = render(<ProfileScreen />);

    await waitFor(() => {
      expect(getByText("Sem avaliações")).toBeTruthy();
    });
  });

  it("signs out and navigates to the login screen", async () => {
    const { getByTestId } = render(<ProfileScreen />);

    await waitFor(() => {
      expect(getByTestId("sign-out")).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByTestId("sign-out"));
    });

    await waitFor(() => {
      expect(signOut).toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith("/(auth)/login");
    });
  });

  it("alerts when sign out fails", async () => {
    (signOut as jest.Mock).mockRejectedValue(new Error("falha de rede"));
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);

    const { getByTestId } = render(<ProfileScreen />);

    await waitFor(() => {
      expect(getByTestId("sign-out")).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByTestId("sign-out"));
    });

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Erro", "falha de rede");
    });
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
