import { HTTPException } from "hono/http-exception";

/** Tutarlı JSON hata gövdesi üretir. */
export function fail(status: 400 | 401 | 402 | 403 | 404 | 409 | 422 | 429 | 500, code: string, message: string, details?: unknown): never {
  throw new HTTPException(status, {
    res: new Response(JSON.stringify({ error: code, message, details }), {
      status,
      headers: { "content-type": "application/json" },
    }),
  });
}

export const notFound = (msg = "Bulunamadı") => fail(404, "not_found", msg);
export const forbidden = (msg = "Yetkiniz yok") => fail(403, "forbidden", msg);
export const unauthorized = (msg = "Giriş gerekli") => fail(401, "unauthorized", msg);
export const badRequest = (msg: string, details?: unknown) => fail(400, "bad_request", msg, details);
export const conflict = (msg: string) => fail(409, "conflict", msg);
