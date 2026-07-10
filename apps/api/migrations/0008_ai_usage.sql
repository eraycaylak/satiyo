-- AI ilan sihirbazı kullanım kotası (kullanıcı başına günlük) — maliyet/kötüye kullanım koruması.
CREATE TABLE IF NOT EXISTS ai_usage (
  user_id TEXT NOT NULL,
  day     TEXT NOT NULL,   -- YYYY-MM-DD
  count   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day)
);
