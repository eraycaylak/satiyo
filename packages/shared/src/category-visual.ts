/**
 * Kategori kök görselleri — mobil (Ionicons) + web (lucide-react) ORTAK kaynak.
 * B2 derin taksonomi kökleri eklendikçe buraya genişletilir.
 * Renkli daire + beyaz ikon (letgo tarzı).
 */
export interface CategoryVisual {
  ionicon: string; // @expo/vector-icons/Ionicons adı (mobil)
  lucide: string; // lucide-react bileşen adı (web)
  color: string; // daire arka plan rengi
}

export const CATEGORY_VISUAL: Record<string, CategoryVisual> = {
  elektronik: { ionicon: "hardware-chip", lucide: "Cpu", color: "#14b8a6" },
  "ev-yasam": { ionicon: "bed", lucide: "Sofa", color: "#f59e0b" },
  moda: { ionicon: "shirt", lucide: "Shirt", color: "#ec4899" },
  vasita: { ionicon: "car-sport", lucide: "Car", color: "#3b82f6" },
  emlak: { ionicon: "business", lucide: "Building2", color: "#0ea5e9" },
  hobi: { ionicon: "game-controller", lucide: "Gamepad2", color: "#8b5cf6" },
  "spor-outdoor": { ionicon: "basketball", lucide: "Dumbbell", color: "#f97316" },
  bebek: { ionicon: "balloon", lucide: "Baby", color: "#22c55e" },
  "is-sanayi": { ionicon: "construct", lucide: "Wrench", color: "#64748b" },
  "hayvanlar-alemi": { ionicon: "paw", lucide: "PawPrint", color: "#a16207" },
};

const FALLBACK: CategoryVisual = { ionicon: "grid", lucide: "LayoutGrid", color: "#64748b" };

/** Kök kategori id'sinden görsel (yoksa nötr fallback). */
export function categoryVisual(rootId: string | undefined | null): CategoryVisual {
  if (!rootId) return FALLBACK;
  return CATEGORY_VISUAL[rootId] ?? FALLBACK;
}
