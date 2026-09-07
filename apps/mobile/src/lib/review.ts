import AsyncStorage from "@react-native-async-storage/async-storage";

// expo-store-review native modülü eski (OTA 1.1.0) binary'de yoksa güvenli düş.
let StoreReview: typeof import("expo-store-review") | null = null;
try { StoreReview = require("expo-store-review"); } catch { StoreReview = null; }

// Kullanıcıdan App Store / Play puanı iste — yalnızca POZİTİF anlardan sonra
// (ör. ilan yayınlama). Apple/Google zaten yılda birkaç kez gösterir; bu yüzden
// sadece belirli eşiklerde ve uzun aralıkla tetikleriz. Asla akışı bloklamaz.
const KEY_COUNT = "review_positive_count";
const KEY_LAST = "review_last_ts";
const THRESHOLDS = [2, 8, 30]; // kaçıncı pozitif aksiyonda sorulacak
const MIN_INTERVAL_MS = 60 * 24 * 60 * 60 * 1000; // en az 60 gün ara

/** Pozitif bir aksiyondan sonra çağır. Uygun koşullarda native puanlama diyaloğunu açar. */
export async function maybeAskReview(): Promise<void> {
  try {
    if (!StoreReview) return; // modül yok (eski binary) → atla
    if (!(await StoreReview.isAvailableAsync())) return;
    if (!(await StoreReview.hasAction())) return;

    const raw = await AsyncStorage.getItem(KEY_COUNT);
    const count = (Number.parseInt(raw ?? "0", 10) || 0) + 1;
    await AsyncStorage.setItem(KEY_COUNT, String(count));
    if (!THRESHOLDS.includes(count)) return;

    const lastRaw = await AsyncStorage.getItem(KEY_LAST);
    const last = Number.parseInt(lastRaw ?? "0", 10) || 0;
    const nowMs = Date.now();
    if (nowMs - last < MIN_INTERVAL_MS) return;

    await AsyncStorage.setItem(KEY_LAST, String(nowMs));
    await StoreReview.requestReview();
  } catch {
    // Puanlama best-effort — hiçbir koşulda kullanıcı akışını etkilemez.
  }
}
