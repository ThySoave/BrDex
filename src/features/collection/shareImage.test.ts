import { createRef } from "react";
import type { View } from "react-native";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import { captureAndShareView } from "./shareImage";

jest.mock("react-native-view-shot", () => ({
  captureRef: jest.fn()
}));

jest.mock("expo-sharing", () => ({
  shareAsync: jest.fn()
}));

const mockCaptureRef = captureRef as jest.Mock;
const mockShareAsync = Sharing.shareAsync as jest.Mock;

describe("captureAndShareView", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("captura o ref como PNG tmpfile e compartilha a uri como imagem", async () => {
    const ref = createRef<View>();
    mockCaptureRef.mockResolvedValue("file:///tmp/share.png");
    mockShareAsync.mockResolvedValue(undefined);

    await captureAndShareView(ref);

    expect(mockCaptureRef).toHaveBeenCalledWith(ref, {
      format: "png",
      quality: 1,
      result: "tmpfile"
    });
    expect(mockShareAsync).toHaveBeenCalledWith("file:///tmp/share.png", {
      mimeType: "image/png"
    });
  });

  it("propaga erro da captura e não compartilha", async () => {
    const ref = createRef<View>();
    mockCaptureRef.mockRejectedValue(new Error("captura falhou"));

    await expect(captureAndShareView(ref)).rejects.toThrow("captura falhou");
    expect(mockShareAsync).not.toHaveBeenCalled();
  });
});
