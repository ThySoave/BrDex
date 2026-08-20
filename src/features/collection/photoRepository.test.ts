jest.mock("../../lib/supabaseClient", () => ({
  getSupabaseClient: jest.fn()
}));

import { getSupabaseClient } from "../../lib/supabaseClient";
import { uploadCardPhoto } from "./photoRepository";

describe("uploadCardPhoto", () => {
  const BASE64 = Buffer.from("foto").toString("base64");

  function mockClient(uploadResponse: { error: { message: string } | null }) {
    const uploadMock = jest.fn().mockResolvedValue(uploadResponse);
    const getPublicUrlMock = jest.fn().mockReturnValue({
      data: { publicUrl: "https://cdn.supabase.co/card-photos/user-1/1.jpg" }
    });
    const storageFromMock = jest.fn().mockReturnValue({
      upload: uploadMock,
      getPublicUrl: getPublicUrlMock
    });
    const getUserMock = jest.fn().mockResolvedValue({ data: { user: { id: "user-1" } } });

    (getSupabaseClient as jest.Mock).mockReturnValue({
      storage: { from: storageFromMock },
      auth: { getUser: getUserMock }
    });

    return { uploadMock, getPublicUrlMock, storageFromMock };
  }

  it("uploads the decoded photo to the user's folder and returns the public URL", async () => {
    const { uploadMock, getPublicUrlMock, storageFromMock } = mockClient({ error: null });

    const url = await uploadCardPhoto(BASE64);

    expect(storageFromMock).toHaveBeenCalledWith("card-photos");
    expect(uploadMock).toHaveBeenCalledWith(
      expect.stringMatching(/^user-1\/.+\.jpg$/),
      expect.any(Uint8Array),
      { contentType: "image/jpeg" }
    );
    const uploadedPath = uploadMock.mock.calls[0][0];
    expect(getPublicUrlMock).toHaveBeenCalledWith(uploadedPath);
    expect(url).toBe("https://cdn.supabase.co/card-photos/user-1/1.jpg");
  });

  it("throws when the upload fails", async () => {
    mockClient({ error: { message: "boom" } });

    await expect(uploadCardPhoto(BASE64)).rejects.toThrow("boom");
  });

  it("throws when there is no authenticated user", async () => {
    const getUserMock = jest.fn().mockResolvedValue({ data: { user: null } });
    (getSupabaseClient as jest.Mock).mockReturnValue({
      storage: { from: jest.fn() },
      auth: { getUser: getUserMock }
    });

    await expect(uploadCardPhoto(BASE64)).rejects.toThrow("Usuário não autenticado");
  });
});
