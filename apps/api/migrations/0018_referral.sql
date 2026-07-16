-- Referans kodu: her kullanıcıya kısa paylaşılabilir kod (satiyo.app/?ref=<code>).
-- Kod GET /me/referral'da tembel üretilir; kolon burada açılır.
ALTER TABLE users ADD COLUMN ref_code TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_ref_code ON users(ref_code);
