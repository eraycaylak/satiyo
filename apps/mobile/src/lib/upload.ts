import { api, tokenStore } from "./client";

// expo-image-manipulator native modülü yalnız build 34'te gömülü; OTA ile eski (1.1.0)
// binary'ye düşerse `require` çöker → try/catch ile yakala, yoksa orijinali kullan.
let ImageManipulator: typeof import("expo-image-manipulator") | null = null;
try { ImageManipulator = require("expo-image-manipulator"); } catch { ImageManipulator = null; }

export interface UploadedImage { imageId: string; url: string; localUri: string; }

const MAX_EDGE = 1600; // uzun kenar üst sınırı (px)
const JPEG_QUALITY = 0.7;

/**
 * Yükleme öncesi client-side resize: uzun kenarı MAX_EDGE'e indirir, %70 JPEG'e çevirir.
 * Ağ + R2 depolama tasarrufu; başarısız olursa orijinali kullanır (yükleme akışını bozmaz).
 */
async function shrink(localUri: string): Promise<{ uri: string; mime: string }> {
  if (!ImageManipulator) return { uri: localUri, mime: "image/jpeg" }; // modül yok (eski binary) → orijinal
  try {
    const out = await ImageManipulator.manipulateAsync(
      localUri,
      [{ resize: { width: MAX_EDGE } }],
      { compress: JPEG_QUALITY, format: ImageManipulator.SaveFormat.JPEG },
    );
    return { uri: out.uri, mime: "image/jpeg" };
  } catch {
    return { uri: localUri, mime: "image/jpeg" };
  }
}

/** Yerel görsel uri'sini küçültüp R2'ye yükler. */
export async function uploadImage(localUri: string, _mime = "image/jpeg"): Promise<UploadedImage> {
  const { uri, mime } = await shrink(localUri);
  const { imageId, uploadUrl, publicUrl } = await api.requestUpload(mime);
  const fileRes = await fetch(uri);
  const blob = await fileRes.blob();
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "content-type": mime, authorization: `Bearer ${tokenStore.get() ?? ""}` },
    body: blob,
  });
  if (!res.ok) throw new Error("Görsel yüklenemedi");
  return { imageId, url: publicUrl, localUri };
}
