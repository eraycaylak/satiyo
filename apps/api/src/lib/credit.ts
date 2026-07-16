import { newId, now } from "./id.js";

// Reklam kredisi sabitleri (kuruş). 100 TL = 10000.
export const SIGNUP_BONUS_MINOR = 10000;      // üye ol → 100 TL reklam kredisi
export const REFERRAL_REWARD_MINOR = 5000;    // davet edilen gerçek ilan verince davet edene 50 TL

type Ref = { type: string; id: string };

/**
 * Krediyi atomik + idempotent ekler. Aynı idempotency_key ile ikinci çağrı NO-OP döner.
 * Ledger insert + wallet upsert tek D1 batch'inde; ledger UNIQUE çakışırsa batch komple düşer
 * (bakiye çift artmaz). Best-effort: hata login/ana akışı bozmaz.
 */
export async function grantCredit(
  db: D1Database,
  userId: string,
  type: "signup_bonus" | "referral_reward" | "adjustment",
  amountMinor: number,
  idempotencyKey: string,
  ref?: Ref,
): Promise<boolean> {
  if (amountMinor <= 0) return false;
  const ts = now();
  try {
    await db.batch([
      db.prepare(
        `INSERT INTO credit_ledger (id, idempotency_key, user_id, txn_type, amount_minor, ref_type, ref_id, created_at)
         VALUES (?,?,?,?,?,?,?,?)`,
      ).bind(newId("cl"), idempotencyKey, userId, type, amountMinor, ref?.type ?? null, ref?.id ?? null, ts),
      db.prepare(
        `INSERT INTO credit_wallets (user_id, balance_minor, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET balance_minor = balance_minor + ?, updated_at = ?`,
      ).bind(userId, amountMinor, ts, amountMinor, ts),
    ]);
    return true;
  } catch {
    // idempotency_key UNIQUE çakışması → zaten verilmiş, sessiz geç.
    return false;
  }
}

/** Krediyi harcar (boost). Yetersiz bakiye → false. Idempotent (aynı key ikinci kez düşmez). */
export async function spendCredit(
  db: D1Database,
  userId: string,
  amountMinor: number,
  idempotencyKey: string,
  ref?: Ref,
): Promise<boolean> {
  if (amountMinor <= 0) return true;
  const already = await db.prepare(`SELECT 1 FROM credit_ledger WHERE idempotency_key = ?`).bind(idempotencyKey).first();
  if (already) return true; // zaten harcandı
  const ts = now();
  const upd = await db.prepare(
    `UPDATE credit_wallets SET balance_minor = balance_minor - ?, updated_at = ? WHERE user_id = ? AND balance_minor >= ?`,
  ).bind(amountMinor, ts, userId, amountMinor).run();
  if (!upd.meta.changes) return false; // yetersiz bakiye
  await db.prepare(
    `INSERT INTO credit_ledger (id, idempotency_key, user_id, txn_type, amount_minor, ref_type, ref_id, created_at)
     VALUES (?,?,?, 'boost_spend', ?, ?, ?, ?)`,
  ).bind(newId("cl"), idempotencyKey, userId, -amountMinor, ref?.type ?? null, ref?.id ?? null, ts).run();
  return true;
}

export async function getBalance(db: D1Database, userId: string): Promise<number> {
  const w = await db.prepare(`SELECT balance_minor FROM credit_wallets WHERE user_id = ?`).bind(userId).first();
  return Number(w?.balance_minor ?? 0);
}

/**
 * Signup bonusunu numara başına 1 kez verir (anti-abuse). phone_verified sonrası çağrılmalı.
 * signup_claims phone_hash PK → hesap silip yeniden açsa bile ikinci bonus çıkmaz.
 */
export async function grantSignupBonusOnce(db: D1Database, userId: string, phone: string): Promise<void> {
  try {
    const phoneHash = await sha256Hex(phone);
    const res = await db.prepare(
      `INSERT INTO signup_claims (phone_hash, user_id, created_at) VALUES (?, ?, ?) ON CONFLICT(phone_hash) DO NOTHING`,
    ).bind(phoneHash, userId, now()).run();
    if (res.meta.changes > 0) {
      await grantCredit(db, userId, "signup_bonus", SIGNUP_BONUS_MINOR, `signup:${userId}`);
    }
  } catch {
    // Bonus başarısızsa giriş akışını bozma.
  }
}

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Davet edilen kullanıcı İLK ilanını verince ödülü tetikler: davet edene + davet
 * edilene REFERRAL_REWARD_MINOR kredi (karşılıklı). Idempotent (grantCredit anahtarı +
 * referral status). Best-effort: ilan oluşturmayı asla bozmaz. createListing sonunda çağrılır.
 */
export async function rewardReferralOnFirstListing(db: D1Database, userId: string): Promise<void> {
  try {
    const ref = await db
      .prepare(`SELECT referrer_user_id FROM referrals WHERE referred_user_id = ? AND status = 'pending'`)
      .bind(userId)
      .first<{ referrer_user_id: string }>();
    if (!ref) return;
    const referrer = ref.referrer_user_id;
    await grantCredit(db, referrer, "referral_reward", REFERRAL_REWARD_MINOR, `ref:${userId}:referrer`, { type: "referral", id: userId });
    await grantCredit(db, userId, "referral_reward", REFERRAL_REWARD_MINOR, `ref:${userId}:referred`, { type: "referral", id: referrer });
    await db
      .prepare(`UPDATE referrals SET status = 'rewarded', rewarded_at = ? WHERE referred_user_id = ? AND status = 'pending'`)
      .bind(now(), userId)
      .run();
  } catch {
    // ödül verilemezse ilan akışını bozma
  }
}
