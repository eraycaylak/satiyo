-- Birinci-parti uygulama olay günlüğü (mobil + web analytics).
-- Zaman: epoch ms. user_id nullable (anonim olaylar da kabul edilir), FK yok (kullanıcı silinse de olay kalır).
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  name TEXT NOT NULL,
  props TEXT,
  platform TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at);
CREATE INDEX IF NOT EXISTS idx_events_name_created ON events(name, created_at);
CREATE INDEX IF NOT EXISTS idx_events_user ON events(user_id);
