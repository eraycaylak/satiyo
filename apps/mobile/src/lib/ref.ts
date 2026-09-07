import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Linking from "expo-linking";

/**
 * Davet/referans kodu yakalama (mobil).
 *
 * Web'deki RefCapture ile aynı davranış: satiyo.app/?ref=CODE veya satiyo://?ref=CODE
 * ile açılan uygulamada kod yakalanır, 30 gün TTL ile saklanır ve ilk girişte
 * verifyOtp'a iletilir. Böylece davet linkiyle gelip uygulamayı kuran kullanıcının
 * referansı da (yalnız web değil) kaydedilir.
 */

const KEY = "satiyo_ref";
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 gün
const CODE_RE = /^[0-9A-Za-z]{4,40}$/;

type Stored = { code: string; at: number };

/** URL'den ref kodunu çıkarır (query param). Geçersizse null. */
export function refFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const { queryParams } = Linking.parse(url);
    const raw = queryParams?.ref;
    const code = Array.isArray(raw) ? raw[0] : raw;
    return typeof code === "string" && CODE_RE.test(code) ? code : null;
  } catch {
    return null;
  }
}

/** Kodu 30 gün TTL ile saklar (geçerli değilse yok sayar). */
export async function saveRef(code: string): Promise<void> {
  if (!CODE_RE.test(code)) return;
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify({ code, at: Date.now() } satisfies Stored));
  } catch {
    /* saklanamazsa akışı bozma */
  }
}

/** Saklı, süresi geçmemiş kodu döndürür; yoksa/expire ise null (expire olanı temizler). */
export async function readRef(): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Stored;
    if (!parsed?.code || !CODE_RE.test(parsed.code)) return null;
    if (Date.now() - parsed.at > TTL_MS) { await clearRef(); return null; }
    return parsed.code;
  } catch {
    return null;
  }
}

/** Kodu siler (giriş başarılı olunca çağrılır — tek kullanımlık). */
export async function clearRef(): Promise<void> {
  try { await AsyncStorage.removeItem(KEY); } catch { /* yok say */ }
}

/**
 * Uygulama açılış URL'inden + sonraki deep-link olaylarından ref kodunu yakalar.
 * RootLayout'ta bir kez çağrılır; aboneliği temizleyen fonksiyonu döndürür.
 */
export function startRefCapture(): () => void {
  Linking.getInitialURL().then((url) => {
    const code = refFromUrl(url);
    if (code) void saveRef(code);
  }).catch(() => {});
  const sub = Linking.addEventListener("url", ({ url }) => {
    const code = refFromUrl(url);
    if (code) void saveRef(code);
  });
  return () => sub.remove();
}
