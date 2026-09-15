import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export const THEMES = [
  { id: "thaat", name: "ذات العنابي" },
  { id: "royal", name: "الكحلي الملكي" },
  { id: "sage", name: "الأخضر الهادئ" },
  { id: "amber", name: "العنبري الدافئ" },
] as const;

export type AppTheme = (typeof THEMES)[number]["id"];

export function isAppTheme(value: unknown): value is AppTheme {
  return typeof value === "string" && THEMES.some((t) => t.id === value);
}

type ThemeContextType = {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<AppTheme>("thaat");

  useEffect(() => {
    const saved = localStorage.getItem("app-theme");
    if (isAppTheme(saved)) setTheme(saved);
  }, []);

  useEffect(() => {
    document.documentElement.dataset["theme"] = theme;
    localStorage.setItem("app-theme", theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
