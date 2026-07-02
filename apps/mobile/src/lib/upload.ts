import { api, tokenStore } from "./client";

export interface UploadedImage { imageId: string; url: string; localUri: string; }

/** Yerel görsel uri'sini R2'ye yükler. */
export async function uploadImage(localUri: string, mime = "image/jpeg"): Promise<UploadedImage> {
  const { imageId, uploadUrl, publicUrl } = await api.requestUpload(mime);
  const fileRes = await fetch(localUri);
  const blob = await fileRes.blob();
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "content-type": mime, authorization: `Bearer ${tokenStore.get() ?? ""}` },
    body: blob,
  });
  if (!res.ok) throw new Error("Görsel yüklenemedi");
  return { imageId, url: publicUrl, localUri };
}
