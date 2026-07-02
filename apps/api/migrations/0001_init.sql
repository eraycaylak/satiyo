-- Zınk — Faz 1 şeması (SQLite / Cloudflare D1)
-- Para birimi: kuruş (INTEGER). Zaman: epoch ms (INTEGER).

-- ============ users ============
CREATE TABLE IF NOT EXISTS users (
  id                TEXT PRIMARY KEY,
  phone             TEXT NOT NULL UNIQUE,
  email             TEXT UNIQUE,
  name              TEXT NOT NULL DEFAULT 'Zınk Kullanıcısı',
  avatar_url        TEXT,
  city              TEXT,
  district          TEXT,
  created_at        INTEGER NOT NULL,
  phone_verified    INTEGER NOT NULL DEFAULT 0,
  email_verified    INTEGER NOT NULL DEFAULT 0,
  identity_verified INTEGER NOT NULL DEFAULT 0,
  trust_score       INTEGER NOT NULL DEFAULT 0,
  response_time_avg INTEGER,
  is_store          INTEGER NOT NULL DEFAULT 0,
  store_name        TEXT
);

-- Telefon OTP doğrulama kodları
CREATE TABLE IF NOT EXISTS otp_codes (
  phone       TEXT PRIMARY KEY,
  code_hash   TEXT NOT NULL,
  expires_at  INTEGER NOT NULL,
  attempts    INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL
);

-- Oturum jetonları (JWT jti iptal listesi / opsiyonel)
CREATE TABLE IF NOT EXISTS sessions (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  INTEGER NOT NULL,
  expires_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- ============ categories ============
CREATE TABLE IF NOT EXISTS categories (
  id                TEXT PRIMARY KEY,
  parent_id         TEXT REFERENCES categories(id),
  name              TEXT NOT NULL,
  slug              TEXT NOT NULL UNIQUE,
  icon              TEXT,
  attribute_schema  TEXT  -- JSON
);

-- ============ listings ============
CREATE TABLE IF NOT EXISTS listings (
  id            TEXT PRIMARY KEY,
  seller_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  category_id   TEXT NOT NULL,
  price         INTEGER NOT NULL DEFAULT 0,        -- kuruş
  price_type    TEXT NOT NULL DEFAULT 'fixed',     -- fixed|negotiable|trade|free
  condition     TEXT NOT NULL DEFAULT 'used',      -- new|used
  city          TEXT,
  district      TEXT,
  lat           REAL,
  lng           REAL,
  status        TEXT NOT NULL DEFAULT 'active',     -- active|sold|reserved|removed|draft
  view_count    INTEGER NOT NULL DEFAULT 0,
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL,
  boosted_until INTEGER
);
CREATE INDEX IF NOT EXISTS idx_listings_status_created ON listings(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_category       ON listings(category_id, status);
CREATE INDEX IF NOT EXISTS idx_listings_seller         ON listings(seller_id, status);
CREATE INDEX IF NOT EXISTS idx_listings_city           ON listings(city, status);
CREATE INDEX IF NOT EXISTS idx_listings_price          ON listings(price);

-- İlan görselleri (listing_id, ilan oluşana kadar NULL olabilir — önce yükle, sonra bağla)
CREATE TABLE IF NOT EXISTS listing_images (
  id          TEXT PRIMARY KEY,
  listing_id  TEXT REFERENCES listings(id) ON DELETE CASCADE,
  owner_id    TEXT REFERENCES users(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  r2_key      TEXT,
  position    INTEGER NOT NULL DEFAULT 0,
  blurhash    TEXT,
  created_at  INTEGER
);
CREATE INDEX IF NOT EXISTS idx_images_listing ON listing_images(listing_id, position);

-- Dinamik kategori öznitelikleri
CREATE TABLE IF NOT EXISTS listing_attributes (
  listing_id  TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  key         TEXT NOT NULL,
  value       TEXT NOT NULL,
  PRIMARY KEY (listing_id, key)
);

-- ============ arama (FTS5) ============
-- Gövde, uygulama tarafında Türkçe fold edilmiş (ASCII) metinle doldurulur.
-- title alanı bm25'te daha yüksek ağırlık alır (başlık > açıklama).
CREATE VIRTUAL TABLE IF NOT EXISTS listings_fts USING fts5(
  listing_id UNINDEXED,
  title,
  body,
  tokenize = 'unicode61 remove_diacritics 2'
);

-- ============ favorites ============
CREATE TABLE IF NOT EXISTS favorites (
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_id  TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  created_at  INTEGER NOT NULL,
  PRIMARY KEY (user_id, listing_id)
);
CREATE INDEX IF NOT EXISTS idx_favorites_listing ON favorites(listing_id);

-- ============ conversations / messages ============
CREATE TABLE IF NOT EXISTS conversations (
  id              TEXT PRIMARY KEY,
  listing_id      TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  buyer_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seller_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_message_at INTEGER NOT NULL,
  created_at      INTEGER NOT NULL,
  UNIQUE (listing_id, buyer_id)
);
CREATE INDEX IF NOT EXISTS idx_conv_buyer  ON conversations(buyer_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conv_seller ON conversations(seller_id, last_message_at DESC);

CREATE TABLE IF NOT EXISTS messages (
  id              TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type            TEXT NOT NULL DEFAULT 'text',   -- text|image|location|offer
  body            TEXT,
  offer_amount    INTEGER,
  offer_status    TEXT,                            -- pending|accepted|rejected
  read_at         INTEGER,
  created_at      INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id, created_at);

-- ============ reviews ============
CREATE TABLE IF NOT EXISTS reviews (
  id           TEXT PRIMARY KEY,
  listing_id   TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  reviewer_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reviewed_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating       INTEGER NOT NULL,
  comment      TEXT,
  created_at   INTEGER NOT NULL,
  UNIQUE (listing_id, reviewer_id)
);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewed ON reviews(reviewed_id);

-- ============ reports ============
CREATE TABLE IF NOT EXISTS reports (
  id           TEXT PRIMARY KEY,
  reporter_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type  TEXT NOT NULL,   -- listing|user|message
  target_id    TEXT NOT NULL,
  reason       TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'open',
  created_at   INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status, created_at);

-- ============ saved_searches ============
CREATE TABLE IF NOT EXISTS saved_searches (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  query_json  TEXT NOT NULL,
  notify      INTEGER NOT NULL DEFAULT 1,
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_saved_user ON saved_searches(user_id);
