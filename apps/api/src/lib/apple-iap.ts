/**
 * Apple IAP makbuz doğrulama (legacy verifyReceipt — StoreKit 1 makbuzu).
 * Önce production'a sorar; 21007 dönerse (sandbox makbuzu) sandbox'a düşer.
 * Böylece TestFlight (sandbox) ve canlı satın alımlar aynı akışla doğrulanır.
 */

const PROD_URL = "https://buy.itunes.apple.com/verifyReceipt";
const SANDBOX_URL = "https://sandbox.itunes.apple.com/verifyReceipt";

export interface AppleInApp {
  productId: string;
  transactionId: string;
  originalTransactionId: string;
  quantity: number;
}

export interface VerifyResult {
  ok: boolean;
  status: number;
  environment: "Production" | "Sandbox" | "Unknown";
  inApp: AppleInApp[];
}

interface AppleRaw {
  status: number;
  environment?: string;
  receipt?: { in_app?: RawTxn[] };
  latest_receipt_info?: RawTxn[];
}
interface RawTxn {
  product_id?: string;
  transaction_id?: string;
  original_transaction_id?: string;
  quantity?: string;
}

async function callApple(url: string, receiptData: string, sharedSecret: string): Promise<AppleRaw> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      "receipt-data": receiptData,
      password: sharedSecret,
      "exclude-old-transactions": false,
    }),
  });
  return (await res.json()) as AppleRaw;
}

function mapTxns(raw: AppleRaw): AppleInApp[] {
  const list = raw.receipt?.in_app ?? raw.latest_receipt_info ?? [];
  return list
    .filter((t) => t.product_id && t.transaction_id)
    .map((t) => ({
      productId: t.product_id!,
      transactionId: t.transaction_id!,
      originalTransactionId: t.original_transaction_id ?? t.transaction_id!,
      quantity: Number(t.quantity ?? "1") || 1,
    }));
}

/**
 * Makbuzu doğrular. `sharedSecret` App Store Connect > App > App-Specific Shared Secret.
 * status 0 → geçerli. 21007 → sandbox makbuzu, sandbox'a yeniden sor.
 */
export async function verifyAppleReceipt(receiptData: string, sharedSecret: string): Promise<VerifyResult> {
  let raw = await callApple(PROD_URL, receiptData, sharedSecret);
  if (raw.status === 21007) {
    raw = await callApple(SANDBOX_URL, receiptData, sharedSecret);
  }
  const env = raw.environment === "Sandbox" ? "Sandbox" : raw.environment === "Production" ? "Production" : "Unknown";
  return { ok: raw.status === 0, status: raw.status, environment: env, inApp: raw.status === 0 ? mapTxns(raw) : [] };
}
