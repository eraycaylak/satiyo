import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { HTTPException } from "hono/http-exception";
import type { Env, Variables } from "./env.js";
import { authRoutes } from "./routes/auth.js";
import { listingRoutes } from "./routes/listings.js";
import { favoriteRoutes } from "./routes/favorites.js";
import { boostRoutes } from "./routes/boost.js";
import { meRoutes } from "./routes/me.js";
import { sellerRoutes } from "./routes/sellers.js";
import { categoryRoutes } from "./routes/categories.js";
import { uploadRoutes } from "./routes/uploads.js";
import { conversationRoutes } from "./routes/conversations.js";
import { reviewRoutes } from "./routes/reviews.js";
import { reportRoutes } from "./routes/reports.js";
import { adminRoutes } from "./routes/admin.js";
import { eventRoutes } from "./routes/events.js";
import { aiRoutes } from "./routes/ai.js";
import { getSetting } from "./lib/settings.js";

export { ChatRoom } from "./durable/ChatRoom.js";

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// İzinli tarayıcı origin'leri (native uygulama Origin göndermez → CORS'a tabi değil).
const ALLOWED_ORIGINS = new Set([
  "https://satiyo.app",
  "https://www.satiyo.app",
  "http://localhost:3000",
  "http://localhost:8081",
]);
const PRIMARY_ORIGIN = "https://satiyo.app";

// Güvenlik başlıkları — medya çapraz-origin yüklenebilsin diye CORP açık.
app.use("*", secureHeaders({
  crossOriginResourcePolicy: "cross-origin",
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: undefined,
  xFrameOptions: "DENY",
  strictTransportSecurity: "max-age=63072000; includeSubDomains; preload",
}));

app.use("*", cors({
  origin: (o) => {
    if (!o) return PRIMARY_ORIGIN;               // native / sunucu-içi istek
    return ALLOWED_ORIGINS.has(o) ? o : PRIMARY_ORIGIN; // eşleşmeyen origin engellenir
  },
  allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders: ["authorization", "content-type"],
  maxAge: 86400,
}));

app.get("/", (c) => c.json({ name: "Satıyo API", version: "0.1.0", ok: true }));
app.get("/health", async (c) => {
  const r = await c.env.DB.prepare("SELECT 1 AS ok").first();
  return c.json({ ok: r?.ok === 1, env: c.env.ENVIRONMENT });
});

// Zorunlu güncelleme / uygulama config (public — auth yok). Anahtar yoksa fail-open (0.0.0 = kimseyi bloklama).
app.get("/config", async (c) => {
  const g = async (k: string) => (await getSetting(c.env.DB, k)) || "";
  return c.json({
    minVersion: { ios: (await g("min_version_ios")) || "0.0.0", android: (await g("min_version_android")) || "0.0.0" },
    latestVersion: { ios: (await g("latest_version_ios")) || "0.0.0", android: (await g("latest_version_android")) || "0.0.0" },
    storeUrl: {
      ios: (await g("store_url_ios")) || "https://apps.apple.com/app/id6786818121",
      android: (await g("store_url_android")) || "https://satiyo.app",
    },
    message: (await g("update_message")) || null,
  });
});

// R2 medya servisi (MVP — prod'da CDN/Images önüne alınır)
app.get("/media/*", async (c) => {
  const key = c.req.path.replace(/^\/media\//, "");
  const obj = await c.env.MEDIA.get(key);
  if (!obj) return c.notFound();
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("cache-control", "public, max-age=31536000, immutable");
  headers.set("etag", obj.httpEtag);
  return new Response(obj.body, { headers });
});

// API route'ları
app.route("/auth", authRoutes);
app.route("/me", meRoutes);
app.route("/listings", boostRoutes);
app.route("/listings", listingRoutes);
app.route("/listings", favoriteRoutes);
app.route("/sellers", sellerRoutes);
app.route("/categories", categoryRoutes);
app.route("/uploads", uploadRoutes);
app.route("/conversations", conversationRoutes);
app.route("/reviews", reviewRoutes);
app.route("/reports", reportRoutes);
app.route("/admin", adminRoutes);
app.route("/events", eventRoutes);
app.route("/ai", aiRoutes);

app.onError((err, c) => {
  if (err instanceof HTTPException && err.res) return err.res;
  console.error("Beklenmeyen hata:", err);
  return c.json({ error: "internal", message: "Sunucu hatası" }, 500);
});

app.notFound((c) => c.json({ error: "not_found", message: "Kaynak bulunamadı" }, 404));

export default app;
