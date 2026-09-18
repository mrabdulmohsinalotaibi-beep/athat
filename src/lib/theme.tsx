import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export const THEMES = [
  { id: "thaat", name: "العنابي (الذات)", primary: "#7E2320" },
  { id: "royal", name: "الكحلي الملكي", primary: "#1F3A52" },
  { id: "sage", name: "الأخضر الهادئ", primary: "#2F6B52" },
  { id: "amber", name: "العنبري الدافئ", primary: "#8A5A16" },
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
  // استخدام التهيئة الابتدائية لمنع وميض الشاشة عند التحميل
  const [theme, setTheme] = useState<AppTheme>(() => {
    if (typeof window === "undefined") return "thaat";
    try {
      const saved = localStorage.getItem("app-theme");
      return isAppTheme(saved) ? saved : "thaat";
    } catch {
      return "thaat";
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    root.dataset["theme"] = theme;

    try {
      localStorage.setItem("app-theme", theme);
    } catch (e) {
      console.warn("Failed to save theme:", e);
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}