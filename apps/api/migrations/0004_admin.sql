-- Faz 2 — moderasyon: ban + yönetilebilir synonym sözlüğü

ALTER TABLE users ADD COLUMN banned INTEGER NOT NULL DEFAULT 0;

-- Arama eş anlamlıları (admin panelinden yönetilir; koddaki varsayılanlarla birleşir)
CREATE TABLE IF NOT EXISTS synonyms (
  id          TEXT PRIMARY KEY,
  term        TEXT NOT NULL,          -- folded anahtar
  aliases     TEXT NOT NULL,          -- virgülle ayrılmış folded eşler
  created_at  INTEGER NOT NULL
);
