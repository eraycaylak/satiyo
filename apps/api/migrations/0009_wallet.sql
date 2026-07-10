-- Reklam kredisi cüzdanı — CLOSED-LOOP puan (nakit değil, çekilemez, yalnız boost'ta harcanır).
-- E-para/ödeme lisansı ve IAP GEREKTİRMEZ. Tüm tutarlar "minor" = kuruş.

-- Materialized bakiye (hız). Negatif YASAK.
CREATE TABLE IF NOT EXISTS credit_wallets (
  user_id       TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  balance_minor INTEGER NOT NULL DEFAULT 0 CHECK (balance_minor >= 0),
  updated_at    INTEGER NOT NULL
);

-- Append-only defter (denetim izi; asla UPDATE/DELETE edilmez).
CREATE TABLE IF NOT EXISTS credit_ledger (
  id              TEXT PRIMARY KEY,
  idempotency_key TEXT NOT NULL UNIQUE,        -- çift-kredi/çift-harcama engeli
  user_id         TEXT NOT NULL,
  txn_type        TEXT NOT NULL,               -- signup_bonus|referral_reward|boost_spend|expiry|adjustment
  amount_minor    INTEGER NOT NULL,            -- + kazanç, - harcama
  ref_type        TEXT,
  ref_id          TEXT,
  created_at      INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_credit_ledger_user ON credit_ledger(user_id, created_at DESC);

-- Anti-abuse: numara başına 1 signup bonusu (hesap silip yeniden açmayı engeller).
CREATE TABLE IF NOT EXISTS signup_claims (
  phone_hash TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- Referans: her davet edilen 1 kez; ödül KAYITTA DEĞİL, davet edilen GERÇEK aktivite yapınca verilir.
CREATE TABLE IF NOT EXISTS referrals (
  referred_user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  referrer_user_id TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'pending', -- pending|rewarded|rejected
  created_at       INTEGER NOT NULL,
  rewarded_at      INTEGER
);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_user_id);
