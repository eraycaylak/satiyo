# Zınk

Reklamsız, yerel odaklı ikinci-el ilan ve alışveriş platformu. **"Evinde para var."**

## Yığın

| Katman | Teknoloji |
|--------|-----------|
| Monorepo | Turborepo + pnpm |
| Dil | TypeScript (strict) |
| Backend | Cloudflare Workers + Hono |
| Veritabanı | D1 (SQLite) |
| Arama | D1 FTS5 + Türkçe normalizasyon + synonym (Meilisearch'e taşınabilir) |
| Görsel | R2 |
| Gerçek-zamanlı mesaj | Durable Objects (WebSocket) |
| Auth | Telefon OTP + JWT (HS256, Web Crypto) |

## Yapı

```
apps/
  api/        Cloudflare Worker — REST + WebSocket API
  web/        (Faz 1 sonraki adım) Next.js
  mobile/     (Faz 1 sonraki adım) Expo
packages/
  shared/     Tipler, zod şemaları, arama çekirdeği, kategoriler, API istemcisi
```

## Çalıştırma (yerel)

```bash
pnpm install
pnpm api:migrate:local   # D1 şemasını yerel uygula
pnpm api:seed:local      # örnek ilanlar
pnpm api:dev             # http://localhost:8787
```

## Faz 1 — Backend durumu

| Özellik | Durum |
|---------|-------|
| Telefon OTP auth + JWT | ✅ |
| İlan ver / listele / detay / güncelle / sil | ✅ |
| Arama (FTS5, Türkçe, synonym, typo, filtre, sıralama, boost) | ✅ |
| Favori | ✅ |
| Realtime mesaj + teklif sistemi | ✅ |
| Profil / satıcı / değerlendirme | ✅ |
| Görsel yükleme (R2) | ✅ |
| Dolandırıcılık/yasaklı içerik filtresi | ✅ |
| Web (Next.js) arayüz — keşfet/arama/detay/auth/ilan-ver/mesaj/favori/profil | ✅ |
| Mobil (Expo) arayüz — aynı ekranlar, tab navigasyon, realtime sohbet | ✅ |

## Faz 2 — Güven & Gelir & Moderasyon durumu

| Özellik | Durum |
|---------|-------|
| Boost/öne çıkarma + ödeme (mock provider, iyzico/PayTR takılabilir) | ✅ |
| Değerlendirme & rozet UI (yıldız+yorum, satıcı puanı) | ✅ |
| Kaydedilen arama + eşleşme bildirimi | ✅ |
| Moderasyon + Admin paneli (şikayet kuyruğu, ilan kaldır, ban, synonym yönetimi) | ✅ |
| Kullanıcı ban (giriş engeli + ilanları kaldırma) | ✅ |

> Admin paneli web'de `/admin` (yalnız `is_admin=1` kullanıcı). Bir kullanıcıyı admin yapmak:
> `wrangler d1 execute zink --local --command "UPDATE users SET is_admin=1 WHERE phone='+90...'"`
> Ödeme sağlayıcı: `PAYMENT_PROVIDER` değişkeni (`mock` varsayılan; `iyzico`/`paytr` iskeleti `src/lib/payments.ts`).

## Faz 3 — Büyüme durumu

| Özellik | Durum |
|---------|-------|
| Mağaza/kurumsal üyelik (ödeme + vitrin + rozet) | ✅ |
| Öneriler / kişiselleştirme ("Senin için") | ✅ |
| Harita görünümü (web: Leaflet/OSM; mobil: react-native-maps) | ✅ |
| Çoklu dil i18n (TR/EN, `@zink/shared/i18n`) | ✅ |

> Harita yaklaşık konumu `@zink/shared/geo` (TR şehir koordinatları) ile çizer — tam adres asla paylaşılmaz.
> i18n: `createT(locale)` + TR/EN sözlükleri; web header & mobil profilde dil değiştirici. Yeni metinler aynı `t()` desenini izler.

## Web çalıştırma

```bash
cd apps/web && cp .env.example .env.local   # API adresi
pnpm --filter @zink/web dev                  # http://localhost:3000
```

> Web ekranları: `/` keşfet+arama · `/ilan/[id]` detay · `/giris` OTP · `/ilan-ver` sihirbaz · `/mesajlar` + `/mesajlar/[id]` realtime sohbet · `/favoriler` · `/ilanlarim` · `/profil` · `/satici/[id]`

## Mobil çalıştırma

```bash
cd apps/mobile && pnpm dev    # Expo — QR ile cihaz / simülatör
```

> Expo Router (tab: Keşfet/Favoriler/İlan Ver/Mesajlar/Profil) + ilan detay, OTP giriş, ilan-ver (expo-image-picker), realtime sohbet (WebSocket), satıcı, ilanlarım. `@zink/shared`'ı web ile aynı paylaşır.

## Monorepo notu

- Tüm paketler **React 18.3.1** (Expo SDK 52 ile uyum).
- pnpm `node-linker=hoisted` (`.npmrc`) — Expo/Metro uyumu için zorunlu.

## API uçları (özet)

- `POST /auth/otp/request` · `POST /auth/otp/verify`
- `GET|POST /listings` · `GET|PATCH|DELETE /listings/:id`
- `POST|DELETE /listings/:id/favorite`
- `GET|PATCH /me` · `GET /me/listings` · `GET /me/favorites`
- `GET /sellers/:id` · `/sellers/:id/listings` · `/sellers/:id/reviews`
- `GET|POST /conversations` · `/conversations/:id/messages` · `/conversations/:id/socket` (WS)
- `POST /reviews` · `POST /reports` · `GET /categories`

## Prod kurulum notları

```bash
cd apps/api
wrangler d1 create zink            # çıkan id'yi wrangler.toml'a yaz
wrangler r2 bucket create zink-media
wrangler secret put JWT_SECRET
pnpm migrate:remote && wrangler deploy
```

> Felsefe: **Reklam yok.** Gelir öne çıkarma (boost) + mağaza üyeliği + premium'dan. Gizlilik/KVKK ve arama kalitesinden taviz yok.
