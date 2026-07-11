-- AI moderasyon: ilan risk skoru (dolandırıcılık/sahtekârlık/şüpheli tespiti)
ALTER TABLE listings ADD COLUMN risk_score INTEGER;            -- 0-100 (Gemini)
ALTER TABLE listings ADD COLUMN risk_flag INTEGER NOT NULL DEFAULT 0; -- 1 = admin incelemesi öneriliyor
ALTER TABLE listings ADD COLUMN risk_category TEXT;            -- sahtekarlik|yasak_urun|spam|supheli_fiyat|iletisim_disari|temiz
ALTER TABLE listings ADD COLUMN risk_reasons TEXT;            -- JSON: kısa gerekçeler
CREATE INDEX IF NOT EXISTS idx_listings_risk ON listings(risk_flag, risk_score DESC);
