/**
 * Kategori taksonomisi — data/*.ts kök alt-ağaçlarını birleştirir, O(1) indeks kurar.
 * Tipler category-types.ts'te; ağaç data/ dizininde. Bu dosya yükleyici + sorgu API'si.
 */
import type { AttributeDef, CategoryNode } from "./category-types";
import { ALL_CATEGORIES } from "./data";

export type { AttributeType, AttributeDef, CategoryNode } from "./category-types";
export { CONDITION, CLOTHING_SIZES } from "./category-types";

export const CATEGORIES: CategoryNode[] = ALL_CATEGORIES;

// --- İndeksler (yüzlerce düğümde linear find yerine O(1)) ---
const byId = new Map<string, CategoryNode>();
const byParent = new Map<string, CategoryNode[]>();
const ROOT_KEY = "__root__";
for (const c of CATEGORIES) {
  byId.set(c.id, c);
  const key = c.parentId ?? ROOT_KEY;
  const arr = byParent.get(key);
  if (arr) arr.push(c);
  else byParent.set(key, [c]);
}

export function getCategory(id: string): CategoryNode | undefined {
  return byId.get(id);
}

export function getChildren(parentId: string | null): CategoryNode[] {
  return byParent.get(parentId ?? ROOT_KEY) ?? [];
}

export function getAttributeSchema(categoryId: string): AttributeDef[] {
  return byId.get(categoryId)?.attributes ?? [];
}

/** Kökten verilen kategoriye kadar yol (breadcrumb için). */
export function getCategoryPath(id: string): CategoryNode[] {
  const path: CategoryNode[] = [];
  let cur = byId.get(id);
  let guard = 0;
  while (cur && guard++ < 20) {
    path.unshift(cur);
    cur = cur.parentId ? byId.get(cur.parentId) : undefined;
  }
  return path;
}

/** Kök kategoriler (parentId null). */
export function rootCategories(): CategoryNode[] {
  return byParent.get(ROOT_KEY) ?? [];
}

/** Yaprak kategoriler (alt kategorisi olmayan — ilan bunlardan birine düşer). */
export function leafCategories(): CategoryNode[] {
  return CATEGORIES.filter((c) => !byParent.has(c.id));
}

/** Bir kategorinin kök atası (renkli ikon eşlemesi CATEGORY_VISUAL için). */
export function rootOf(id: string): CategoryNode | undefined {
  const path = getCategoryPath(id);
  return path[0];
}
