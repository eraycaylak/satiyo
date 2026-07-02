-- Boost (öne çıkarma) kayıtları — 0001'de atlanmıştı.
CREATE TABLE IF NOT EXISTS boosts (
  id          TEXT PRIMARY KEY,
  listing_id  TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  package     TEXT NOT NULL,
  amount      INTEGER NOT NULL,
  starts_at   INTEGER NOT NULL,
  ends_at     INTEGER NOT NULL,
  payment_id  TEXT REFERENCES payments(id),
  created_at  INTEGER
);
CREATE INDEX IF NOT EXISTS idx_boosts_listing ON boosts(listing_id);
