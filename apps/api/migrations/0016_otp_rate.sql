-- 0016 — OTP istek hız sınırı (SMS bombardımanı / maliyet istismarı önlemi)
-- Numara başına: 60 sn cooldown + saatlik pencere içinde en fazla N istek.
CREATE TABLE IF NOT EXISTS otp_rate (
  phone        TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  count        INTEGER NOT NULL,
  last_sent    INTEGER NOT NULL
);
