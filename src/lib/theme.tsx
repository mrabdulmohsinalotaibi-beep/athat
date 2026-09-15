import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

// تثبيت الثيم الكحلي الملكي المطابق للصورة
export const THEMES = [
  { id: "royal", name: "الكحلي الملكي", primary: "#1F3A52" },
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
    if (typeof window === "undefined") return "royal";
    try {
      const saved = localStorage.getItem("app-theme");
      return isAppTheme(saved) ? saved : "royal";
    } catch {
      return "royal";
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    root.dataset["theme"] = theme;
    
    // تطبيق الألوان كمتغيرات CSS مباشرة فور التحميل
    root.style.setProperty("--theme-primary", "#1F3A52");
    root.style.setProperty("--theme-primary-hover", "#152838");
    
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