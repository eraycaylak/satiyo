import { api, tokenStore } from "./client";

export interface UploadedImage {
  imageId: string;
  url: string;
}

/** Görseli R2'ye yükler: requestUpload → PUT (Bearer ile). */
export async function uploadImage(file: File): Promise<UploadedImage> {
  const { imageId, uploadUrl, publicUrl } = await api.requestUpload(file.type);
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "content-type": file.type,
      authorization: `Bearer ${tokenStore.get() ?? ""}`,
    },
    body: file,
  });
  if (!res.ok) throw new Error("Görsel yüklenemedi");
  return { imageId, url: publicUrl };
}
