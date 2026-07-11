-- Mesaj güvenlik işareti (IBAN/scam/link → admin moderasyon için riskli konuşma tespiti)
ALTER TABLE messages ADD COLUMN flagged INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_messages_flagged ON messages(flagged);
