import type { RefObject } from "react";
import type { View } from "react-native";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";

export async function captureAndShareView(ref: RefObject<View | null>): Promise<void> {
  const uri = await captureRef(ref, { format: "png", quality: 1, result: "tmpfile" });
  await Sharing.shareAsync(uri, { mimeType: "image/png" });
}
