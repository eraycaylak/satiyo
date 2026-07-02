/** Kısa, sıralanabilir-olmayan benzersiz kimlikler (crypto.randomUUID temelli). */
export function newId(prefix = ""): string {
  const uuid = crypto.randomUUID().replace(/-/g, "");
  return prefix ? `${prefix}_${uuid}` : uuid;
}

export const now = () => Date.now();
