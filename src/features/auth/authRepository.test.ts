jest.mock("../../lib/supabaseClient", () => ({
  getSupabaseClient: jest.fn()
}));

import { getSupabaseClient } from "../../lib/supabaseClient";
import { signUp, signIn, signOut, getSession } from "./authRepository";

describe("authRepository", () => {
  const mockAuth = {
    signUp: jest.fn(),
    signInWithPassword: jest.fn(),
    signOut: jest.fn(),
    getSession: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getSupabaseClient as jest.Mock).mockReturnValue({ auth: mockAuth });
  });

  it("signUp calls supabase auth.signUp and throws on error", async () => {
    mockAuth.signUp.mockResolvedValue({ error: null });
    await signUp("a@b.com", "password123");
    expect(mockAuth.signUp).toHaveBeenCalledWith({
      email: "a@b.com",
      password: "password123"
    });
  });

  it("signUp throws the Supabase error message on failure", async () => {
    mockAuth.signUp.mockResolvedValue({ error: { message: "Email already in use" } });
    await expect(signUp("a@b.com", "password123")).rejects.toThrow("Email already in use");
  });

  it("signIn calls supabase auth.signInWithPassword", async () => {
    mockAuth.signInWithPassword.mockResolvedValue({ error: null });
    await signIn("a@b.com", "password123");
    expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({
      email: "a@b.com",
      password: "password123"
    });
  });

  it("signOut calls supabase auth.signOut", async () => {
    mockAuth.signOut.mockResolvedValue({ error: null });
    await signOut();
    expect(mockAuth.signOut).toHaveBeenCalled();
  });

  it("getSession returns the session from Supabase", async () => {
    const fakeSession = { user: { id: "123" } };
    mockAuth.getSession.mockResolvedValue({ data: { session: fakeSession } });
    const session = await getSession();
    expect(session).toBe(fakeSession);
  });
});
