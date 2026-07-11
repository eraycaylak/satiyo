-- C4 dükkan doğrulama (belge + TC/vergi + manuel admin onayı)

-- Kullanıcı mağaza durumu
ALTER TABLE users ADD COLUMN store_status TEXT NOT NULL DEFAULT 'none'; -- none|pending|approved|rejected
ALTER TABLE users ADD COLUMN store_verified_at INTEGER;

-- Stok (mağaza ilanları >1 olabilir; satışta azalır, 0→sold)
ALTER TABLE listings ADD COLUMN quantity INTEGER NOT NULL DEFAULT 1;

-- Mağaza başvuruları (belge + kimlik + onay kuyruğu)
CREATE TABLE IF NOT EXISTS store_applications (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store_name   TEXT NOT NULL,
  legal_type   TEXT NOT NULL,            -- individual|company
  tc_hash      TEXT,                     -- sha256(TC) — düz TC ASLA saklanmaz
  tax_no       TEXT,                     -- vergi no (format doğrulanmış)
  doc_ids      TEXT NOT NULL,            -- JSON: yüklenen belge id'leri (listing_images.id)
  status       TEXT NOT NULL DEFAULT 'pending', -- pending|approved|rejected
  reviewer_id  TEXT,
  review_note  TEXT,
  created_at   INTEGER NOT NULL,
  reviewed_at  INTEGER
);
CREATE INDEX IF NOT EXISTS idx_store_apps_status ON store_applications(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_store_apps_user ON store_applications(user_id, created_at DESC);
