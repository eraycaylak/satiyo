-- Satıyo — kullanıcı engelleme (App Store Guideline 1.2 — UGC güvenliği)
-- Bir kullanıcının başka bir kullanıcıyı engellemesi. Engelli çift birbirine mesaj atamaz.
CREATE TABLE IF NOT EXISTS blocks (
  blocker_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  INTEGER NOT NULL,
  PRIMARY KEY (blocker_id, blocked_id)
);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked ON blocks(blocked_id);
