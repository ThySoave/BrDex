import { validateCredentials } from "./validateCredentials";

describe("validateCredentials", () => {
  it("rejects an empty email", () => {
    expect(validateCredentials("", "password123")).toBe("Informe um email válido.");
  });

  it("rejects an email without @", () => {
    expect(validateCredentials("sem-arroba", "password123")).toBe("Informe um email válido.");
  });

  it("rejects a password shorter than 6 characters", () => {
    expect(validateCredentials("a@b.com", "12345")).toBe(
      "A senha precisa de pelo menos 6 caracteres."
    );
  });

  it("returns null for valid credentials", () => {
    expect(validateCredentials("a@b.com", "password123")).toBeNull();
  });

  it("reports the email error first when both are invalid", () => {
    expect(validateCredentials("", "")).toBe("Informe um email válido.");
  });
});
