import { Hono } from "hono";
import { CATEGORIES } from "@satiyo/shared";
import type { Env, Variables } from "../env.js";

export const categoryRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// Kategori ağacı şimdilik koddan servis edilir (admin paneli DB'ye taşıyacak).
categoryRoutes.get("/", (c) => c.json(CATEGORIES));
