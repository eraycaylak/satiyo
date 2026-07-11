-- A1 presence/son görülme + A3 satış meta verisi

-- Son görülme (gerçek aktivite; requireAuth'ta koşullu güncellenir)
ALTER TABLE users ADD COLUMN last_seen INTEGER;
CREATE INDEX IF NOT EXISTS idx_users_last_seen ON users(last_seen);

-- Satış meta verisi: kime/ne zaman/nereden satıldı
ALTER TABLE listings ADD COLUMN sold_to TEXT;        -- alıcı user id (opsiyonel; Satıyo içi satışsa)
ALTER TABLE listings ADD COLUMN sold_at INTEGER;     -- satış zamanı (epoch ms)
ALTER TABLE listings ADD COLUMN sold_channel TEXT;   -- 'satiyo' | 'disarida'
