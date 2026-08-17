jest.mock("../../src/features/auth/authRepository", () => ({
  signIn: jest.fn()
}));
jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: jest.fn() }),
  Link: ({ children }: { children: React.ReactNode }) => children
}));

import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { signIn } from "../../src/features/auth/authRepository";
import LoginScreen from "./login";

describe("LoginScreen", () => {
  it("calls signIn with the entered email and password", async () => {
    (signIn as jest.Mock).mockResolvedValue(undefined);
    const { getByTestId } = render(<LoginScreen />);

    fireEvent.changeText(getByTestId("login-email"), "a@b.com");
    fireEvent.changeText(getByTestId("login-password"), "password123");
    fireEvent.press(getByTestId("login-submit"));

    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith("a@b.com", "password123");
    });
  });
});
