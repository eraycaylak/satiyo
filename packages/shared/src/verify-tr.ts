// Türkiye kimlik/vergi doğrulama — format + checksum (resmi API DEĞİL).
// Dükkan başvurusunda (C4) anlık geri bildirim + server-side kontrol için.

/**
 * TC Kimlik No algoritma doğrulaması (11 hane).
 * - 11 hane, ilk hane 0 olamaz.
 * - 10. hane = ((1,3,5,7,9. toplamı × 7) − (2,4,6,8. toplamı)) mod 10.
 * - 11. hane = (ilk 10 hanenin toplamı) mod 10.
 */
export function isValidTcKimlik(tc: string): boolean {
  if (!/^[1-9][0-9]{10}$/.test(tc ?? "")) return false;
  const d = tc.split("").map(Number);
  const oddSum = d[0]! + d[2]! + d[4]! + d[6]! + d[8]!;
  const evenSum = d[1]! + d[3]! + d[5]! + d[7]!;
  const digit10 = ((oddSum * 7) - evenSum) % 10;
  if (((digit10 + 10) % 10) !== d[9]) return false;
  const sumFirst10 = d.slice(0, 10).reduce((a, b) => a + b, 0);
  return (sumFirst10 % 10) === d[10];
}

/**
 * Vergi Kimlik No (VKN) checksum doğrulaması (10 hane).
 * Resmi GİB algoritması.
 */
export function isValidVergiNo(no: string): boolean {
  if (!/^[0-9]{10}$/.test(no ?? "")) return false;
  const d = no.split("").map(Number);
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    const tmp = (d[i]! + (9 - i)) % 10;
    sum += tmp === 9 ? 9 : (tmp * (2 ** (9 - i))) % 9;
  }
  const check = (10 - (sum % 10)) % 10;
  return check === d[9];
}

/** legalType'a göre uygun kimlik alanını doğrular. */
export function isValidStoreIdentity(input: {
  legalType: "individual" | "company";
  tcNo?: string;
  taxNo?: string;
}): boolean {
  if (input.legalType === "company") return !!input.taxNo && isValidVergiNo(input.taxNo);
  return !!input.tcNo && isValidTcKimlik(input.tcNo);
}
