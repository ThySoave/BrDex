jest.mock("../../src/features/auth/authRepository", () => ({
  signUp: jest.fn()
}));

const mockReplace = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockReplace })
}));

import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { signUp } from "../../src/features/auth/authRepository";
import SignupScreen from "./signup";

describe("SignupScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows a validation message and does not submit when the email is invalid", async () => {
    const { getByTestId, findByText } = render(<SignupScreen />);

    fireEvent.changeText(getByTestId("signup-email"), "sem-arroba");
    fireEvent.changeText(getByTestId("signup-password"), "password123");
    fireEvent.press(getByTestId("signup-submit"));

    await findByText("Informe um email válido.");
    expect(signUp).not.toHaveBeenCalled();
  });

  it("shows a validation message and does not submit when the password is too short", async () => {
    const { getByTestId, findByText } = render(<SignupScreen />);

    fireEvent.changeText(getByTestId("signup-email"), "a@b.com");
    fireEvent.changeText(getByTestId("signup-password"), "12345");
    fireEvent.press(getByTestId("signup-submit"));

    await findByText("A senha precisa de pelo menos 6 caracteres.");
    expect(signUp).not.toHaveBeenCalled();
  });

  it("signs up and navigates to the album with valid data", async () => {
    (signUp as jest.Mock).mockResolvedValue(undefined);
    const { getByTestId } = render(<SignupScreen />);

    fireEvent.changeText(getByTestId("signup-email"), "a@b.com");
    fireEvent.changeText(getByTestId("signup-password"), "password123");
    fireEvent.press(getByTestId("signup-submit"));

    await waitFor(() => {
      expect(signUp).toHaveBeenCalledWith("a@b.com", "password123");
      expect(mockReplace).toHaveBeenCalledWith("/(tabs)/album");
    });
  });

  it("expõe criar conta como botão", () => {
    const { getByRole } = render(<SignupScreen />);

    expect(getByRole("button", { name: "Criar conta" })).toBeTruthy();
  });

  it("shows the repository error when sign up fails", async () => {
    (signUp as jest.Mock).mockRejectedValue(new Error("Email já cadastrado"));
    const { getByTestId, findByText } = render(<SignupScreen />);

    fireEvent.changeText(getByTestId("signup-email"), "a@b.com");
    fireEvent.changeText(getByTestId("signup-password"), "password123");
    fireEvent.press(getByTestId("signup-submit"));

    await findByText("Email já cadastrado");
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
