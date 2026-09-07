import { api, tokenStore } from "./client";

export interface UploadedImage {
  imageId: string;
  url: string;
}

const MAX_EDGE = 1600; // uzun kenar üst sınırı (px) — mobildeki upload.ts ile aynı
const JPEG_QUALITY = 0.7;

/**
 * Yükleme öncesi tarayıcı tarafında küçültme: telefon kamerası 24 MP (5712x4284)
 * fotoğraf üretebiliyor; ham hâli hem yüklemeyi hem sonraki görüntülemeyi yavaşlatır
 * (sunucu tarafı thumb üretimi de bu boyutta belleğe sığmıyor). Başarısız olursa
 * (HEIC, decode hatası) orijinal dosyayı olduğu gibi yükler — akış bozulmaz.
 */
async function shrink(file: File): Promise<{ body: Blob; mime: string }> {
  if (typeof createImageBitmap !== "function") return { body: file, mime: file.type };
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 600_000) {
      bitmap.close();
      return { body: file, mime: file.type };
    }
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas ctx yok");
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
    );
    if (!blob || blob.size >= file.size) return { body: file, mime: file.type };
    return { body: blob, mime: "image/jpeg" };
  } catch {
    return { body: file, mime: file.type };
  }
}

/** Görseli küçültüp R2'ye yükler: requestUpload → PUT (Bearer ile). */
export async function uploadImage(file: File): Promise<UploadedImage> {
  const { body, mime } = await shrink(file);
  const { imageId, uploadUrl, publicUrl } = await api.requestUpload(mime);
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "content-type": mime,
      authorization: `Bearer ${tokenStore.get() ?? ""}`,
    },
    body,
  });
  if (!res.ok) throw new Error("Görsel yüklenemedi");
  return { imageId, url: publicUrl };
}
