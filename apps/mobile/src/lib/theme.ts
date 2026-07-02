import { useColorScheme } from "react-native";

export interface Palette {
  bg: string; surface: string; surface2: string; border: string;
  text: string; muted: string; brand: string; brandSoft: string;
  accent: string; danger: string; success: string;
}

const light: Palette = {
  bg: "#f6f7f9", surface: "#ffffff", surface2: "#eef1f4", border: "#e3e6ea",
  text: "#14181d", muted: "#67707a", brand: "#f0434c", brandSoft: "#fff1f2",
  accent: "#f97316", danger: "#e11d48", success: "#16a34a",
};

const dark: Palette = {
  bg: "#0d1117", surface: "#161b22", surface2: "#1c232c", border: "#2a313b",
  text: "#e7edf3", muted: "#9aa6b2", brand: "#ff5a63", brandSoft: "#3a0f12",
  accent: "#fb923c", danger: "#fb7185", success: "#4ade80",
};

export function useTheme(): Palette {
  return useColorScheme() === "dark" ? dark : light;
}

export const radius = { sm: 8, md: 14, lg: 22 };
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
