/**
 * Ödeme sağlayıcı soyutlaması.
 * MVP'de `mock` sağlayıcı kullanılır (anında başarılı). Prod'da iyzico/PayTR
 * aynı arayüzü implemente eder; route'lar değişmez.
 */
import type { Env } from "../env.js";

export interface ChargeInput {
  amount: number; // kuruş
  currency: string;
  purpose: "boost" | "premium" | "store";
  userId: string;
  description: string;
}

export interface ChargeResult {
  status: "paid" | "failed";
  providerRef: string;
}

export interface PaymentProvider {
  readonly name: string;
  charge(input: ChargeInput): Promise<ChargeResult>;
}

/** Geliştirme/test sağlayıcısı — gerçek tahsilat yapmaz, başarılı döner. */
class MockProvider implements PaymentProvider {
  readonly name = "mock";
  async charge(_input: ChargeInput): Promise<ChargeResult> {
    return { status: "paid", providerRef: `mock_${crypto.randomUUID().slice(0, 12)}` };
  }
}

// Prod iskeleti — gerçek entegrasyon eklenince doldurulur:
// class IyzicoProvider implements PaymentProvider { ... }
// class PaytrProvider  implements PaymentProvider { ... }

export function getPaymentProvider(env: Env): PaymentProvider {
  switch (env.PAYMENT_PROVIDER) {
    // case "iyzico": return new IyzicoProvider(env);
    // case "paytr":  return new PaytrProvider(env);
    default:
      return new MockProvider();
  }
}
