-- Çalışma-zamanı ayarları (panelden değiştirilebilir; deploy/güncelleme gerektirmez).
-- Örn: gemini_api_key → AI anahtarını panelden döndürmek için.
CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
