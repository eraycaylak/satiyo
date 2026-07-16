-- 0015 — Cihaz push bildirimi jetonları (Expo Push)
-- Her cihazın Expo push token'ı bir kullanıcıya bağlanır. Token global UNIQUE:
-- cihazda kullanıcı değişirse ON CONFLICT ile yeni kullanıcıya taşınır.
CREATE TABLE IF NOT EXISTS push_tokens (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  token      TEXT NOT NULL UNIQUE,
  platform   TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_tokens(user_id);
