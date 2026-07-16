-- Kısa paylaşım linkleri: satiyo.app/s/<code> -> ilan
CREATE TABLE IF NOT EXISTS short_links (
  code       TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_short_links_listing ON short_links(listing_id);
