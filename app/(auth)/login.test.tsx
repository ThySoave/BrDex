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
  beforeEach(() => {
    jest.clearAllMocks();
  });

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

  it("shows a validation message and does not submit when the email is invalid", async () => {
    const { getByTestId, findByText } = render(<LoginScreen />);

    fireEvent.changeText(getByTestId("login-email"), "sem-arroba");
    fireEvent.changeText(getByTestId("login-password"), "password123");
    fireEvent.press(getByTestId("login-submit"));

    await findByText("Informe um email válido.");
    expect(signIn).not.toHaveBeenCalled();
  });

  it("shows a validation message and does not submit when the password is too short", async () => {
    const { getByTestId, findByText } = render(<LoginScreen />);

    fireEvent.changeText(getByTestId("login-email"), "a@b.com");
    fireEvent.changeText(getByTestId("login-password"), "12345");
    fireEvent.press(getByTestId("login-submit"));

    await findByText("A senha precisa de pelo menos 6 caracteres.");
    expect(signIn).not.toHaveBeenCalled();
  });

  it("expõe entrar e entrar com Google como botões", () => {
    const { getByRole } = render(<LoginScreen />);

    expect(getByRole("button", { name: "Entrar" })).toBeTruthy();
    expect(getByRole("button", { name: "Entrar com Google" })).toBeTruthy();
  });

  it("shows the repository error when sign in fails", async () => {
    (signIn as jest.Mock).mockRejectedValue(new Error("Credenciais inválidas"));
    const { getByTestId, findByText } = render(<LoginScreen />);

    fireEvent.changeText(getByTestId("login-email"), "a@b.com");
    fireEvent.changeText(getByTestId("login-password"), "password123");
    fireEvent.press(getByTestId("login-submit"));

    await findByText("Credenciais inválidas");
  });
});
