import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export const THEMES = [
  { id: "thaat", name: "عنابي الذات", swatches: ["bg-theme-primary", "bg-theme-deep", "bg-theme-soft"] },
  { id: "royal", name: "الكحلي الملكي", swatches: ["bg-theme-primary", "bg-theme-deep", "bg-theme-soft"] },
  { id: "sage", name: "الأخضر المهدئ", swatches: ["bg-theme-primary", "bg-theme-deep", "bg-theme-soft"] },
  { id: "amber", name: "العنبري الدافئ", swatches: ["bg-theme-primary", "bg-theme-deep", "bg-theme-soft"] },
] as const;

export type AppTheme = (typeof THEMES)[number]["id"];
const STORAGE_KEY = "thaat-theme";

type ThemeContextValue = { theme: AppTheme; setTheme: (theme: AppTheme) => void };
const ThemeContext = createContext<ThemeContextValue | null>(null);

function isTheme(value: string | null | undefined): value is AppTheme {
  return THEMES.some((theme) => theme.id === value);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, updateTheme] = useState<AppTheme>("thaat");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (isTheme(saved)) updateTheme(saved);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  return <ThemeContext.Provider value={{ theme, setTheme: updateTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}

export function isAppTheme(value: unknown): value is AppTheme {
  return typeof value === "string" && isTheme(value);
}