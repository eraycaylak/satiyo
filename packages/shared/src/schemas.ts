/** Sistem sınırlarında girdi doğrulama — zod şemaları (API + istemci ortak). */
import { z } from "zod";

// E.164 benzeri TR telefon: +90 5XX XXX XX XX → +905xxxxxxxxx
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+90\d{10}$/, "Telefon +905XXXXXXXXX biçiminde olmalı");

export const requestOtpSchema = z.object({
  phone: phoneSchema,
});

export const verifyOtpSchema = z.object({
  phone: phoneSchema,
  code: z.string().regex(/^\d{6}$/, "6 haneli kod"),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  email: z.string().email().optional().nullable(),
  city: z.string().trim().max(60).optional().nullable(),
  district: z.string().trim().max(60).optional().nullable(),
  avatarUrl: z.string().url().optional().nullable(),
});

export const priceTypeSchema = z.enum(["fixed", "negotiable", "trade", "free"]);
export const conditionSchema = z.enum(["new", "used"]);

const listingFields = z.object({
  title: z.string().trim().min(3, "Başlık en az 3 karakter").max(120),
  description: z.string().trim().max(4000).default(""),
  categoryId: z.string().trim().min(1),
  price: z.number().int().nonnegative().max(100_000_000),
  priceType: priceTypeSchema.default("fixed"),
  condition: conditionSchema.default("used"),
  city: z.string().trim().max(60).optional(),
  district: z.string().trim().max(60).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  attributes: z.record(z.string()).default({}),
  imageIds: z.array(z.string()).max(12).default([]),
  status: z.enum(["active", "draft"]).default("active"),
});

export const createListingSchema = listingFields.refine(
  (d) => d.priceType !== "fixed" || d.price > 0,
  { message: "Sabit fiyatlı ilanda fiyat 0'dan büyük olmalı", path: ["price"] },
);

export const updateListingSchema = listingFields.partial();

export const searchQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  categoryId: z.string().optional(),
  minPrice: z.coerce.number().int().nonnegative().optional(),
  maxPrice: z.coerce.number().int().nonnegative().optional(),
  city: z.string().optional(),
  district: z.string().optional(),
  condition: conditionSchema.optional(),
  sellerType: z.enum(["individual", "store"]).optional(),
  withImageOnly: z.coerce.boolean().optional(),
  sort: z
    .enum(["relevance", "newest", "price_asc", "price_desc", "nearest"])
    .default("relevance"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
});

export const sendMessageSchema = z.object({
  type: z.enum(["text", "image", "location", "offer"]).default("text"),
  body: z.string().trim().max(2000).optional(),
  offerAmount: z.number().int().positive().optional(),
});

export const startConversationSchema = z.object({
  listingId: z.string().min(1),
  body: z.string().trim().min(1).max(2000),
});

export const offerActionSchema = z.object({
  action: z.enum(["accept", "reject", "counter"]),
  counterAmount: z.number().int().positive().optional(),
});

export const createReviewSchema = z.object({
  listingId: z.string().min(1),
  reviewedId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional(),
});

export const createReportSchema = z.object({
  targetType: z.enum(["listing", "user", "message"]),
  targetId: z.string().min(1),
  reason: z.string().trim().min(3).max(500),
});

export const savedSearchSchema = z.object({
  query: searchQuerySchema.partial(),
  notify: z.boolean().default(true),
});

export type RequestOtpInput = z.infer<typeof requestOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type CreateListingInput = z.infer<typeof createListingSchema>;
export type SearchQueryInput = z.infer<typeof searchQuerySchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type CreateReviewInput = z.infer<typeof createReviewSchema>;
