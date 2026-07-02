-- Faz 2 — admin, bildirimler, ödemeler

-- Admin bayrağı (moderasyon paneli erişimi)
ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0;

-- Bildirimler (kaydedilen arama eşleşmesi, teklif, mesaj vb.)
CREATE TABLE IF NOT EXISTS notifications (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,              -- saved_search|offer|message|system
  title       TEXT NOT NULL,
  body        TEXT,
  data        TEXT,                       -- JSON (ör. listing_id)
  read_at     INTEGER,
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, created_at DESC);

-- Ödemeler (boost/abonelik) — sağlayıcı bağımsız kayıt
CREATE TABLE IF NOT EXISTS payments (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount        INTEGER NOT NULL,         -- kuruş
  currency      TEXT NOT NULL DEFAULT 'TRY',
  provider      TEXT NOT NULL,            -- mock|iyzico|paytr
  provider_ref  TEXT,
  purpose       TEXT NOT NULL,            -- boost|premium|store
  status        TEXT NOT NULL DEFAULT 'pending', -- pending|paid|failed
  created_at    INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id, created_at DESC);
