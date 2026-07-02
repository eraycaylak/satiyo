-- Zınk yerel örnek veri (arama kalitesini test etmek için).
-- FTS gövdeleri Türkçe fold edilmiş (ASCII) — uygulamadaki foldTr ile aynı.

DELETE FROM listings_fts;
DELETE FROM listing_images;
DELETE FROM listing_attributes;
DELETE FROM listings;
DELETE FROM users WHERE id LIKE 'usr_seed%';

INSERT INTO users (id, phone, name, city, district, created_at, phone_verified, trust_score)
VALUES
  ('usr_seed1', '+905550000001', 'Ahmet Y.', 'İstanbul', 'Kadıköy', 1718000000000, 1, 84),
  ('usr_seed2', '+905550000002', 'Mağaza Teknoloji', 'Ankara', 'Çankaya', 1717000000000, 1, 120);
UPDATE users SET is_store = 1, store_name = 'Teknoloji Dünyası' WHERE id = 'usr_seed2';

-- 1) iPhone 13
INSERT INTO listings (id, seller_id, title, description, category_id, price, price_type, condition, city, district, status, view_count, created_at, updated_at)
VALUES ('lst_seed1', 'usr_seed1', 'iPhone 13 128 GB Temiz', 'Kutulu, faturalı, az kullanılmış iPhone 13.', 'telefon', 2750000, 'negotiable', 'used', 'İstanbul', 'Kadıköy', 'active', 42, 1718100000000, 1718100000000);
INSERT INTO listing_attributes (listing_id, key, value) VALUES ('lst_seed1','brand','Apple'),('lst_seed1','model','iPhone 13'),('lst_seed1','storage','128 GB');
INSERT INTO listings_fts (listing_id, title, body) VALUES ('lst_seed1', 'iphone 13 128 gb temiz', 'cep telefonu apple iphone 13 128 gb kutulu faturali az kullanilmis');

-- 2) RAM (bellek) — "ram" araması bunu bulmalı, ekran kartını DEĞİL
INSERT INTO listings (id, seller_id, title, description, category_id, price, price_type, condition, city, district, status, view_count, created_at, updated_at)
VALUES ('lst_seed2', 'usr_seed2', '16 GB DDR4 RAM Bellek', 'Corsair 3200MHz masaüstü bellek.', 'bilgisayar', 90000, 'fixed', 'used', 'Ankara', 'Çankaya', 'active', 17, 1718200000000, 1718200000000);
INSERT INTO listing_attributes (listing_id, key, value) VALUES ('lst_seed2','type','Bileşen'),('lst_seed2','ram','16 GB');
INSERT INTO listings_fts (listing_id, title, body) VALUES ('lst_seed2', '16 gb ddr4 ram bellek', 'bilgisayar bilesen ram bellek corsair masaustu 3200mhz');

-- 3) Ekran kartı — "ram" aramasında ÇIKMAMALI
INSERT INTO listings (id, seller_id, title, description, category_id, price, price_type, condition, city, district, status, view_count, created_at, updated_at)
VALUES ('lst_seed3', 'usr_seed2', 'Nvidia RTX 3060 Ekran Kartı', 'Garantili ekran kartı, kutusunda.', 'bilgisayar', 1100000, 'fixed', 'used', 'Ankara', 'Çankaya', 'active', 88, 1718300000000, 1718300000000);
INSERT INTO listing_attributes (listing_id, key, value) VALUES ('lst_seed3','type','Bileşen');
INSERT INTO listings_fts (listing_id, title, body) VALUES ('lst_seed3', 'nvidia rtx 3060 ekran karti', 'bilgisayar ekran karti gpu grafik karti nvidia rtx garantili');

-- 4) Buzdolabı — "dolap" synonym'i ile bulunmalı
INSERT INTO listings (id, seller_id, title, description, category_id, price, price_type, condition, city, district, status, view_count, created_at, updated_at)
VALUES ('lst_seed4', 'usr_seed1', 'Arçelik No-Frost Buzdolabı', 'Az kullanılmış, A++ enerji.', 'beyaz-esya', 850000, 'negotiable', 'used', 'İstanbul', 'Kadıköy', 'active', 9, 1718400000000, 1718400000000);
INSERT INTO listing_attributes (listing_id, key, value) VALUES ('lst_seed4','type','Buzdolabı'),('lst_seed4','brand','Arçelik');
INSERT INTO listings_fts (listing_id, title, body) VALUES ('lst_seed4', 'arcelik no frost buzdolabi', 'beyaz esya buzdolabi dolap soguk hava arcelik a++ enerji');
