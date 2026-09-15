import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

// قائمة الثيمات المتاحة مع ربط ألوان الـ HEX الخاصة بكل ثيم
export const THEMES = [
  { id: "royal", name: "الكحلي الملكي", primary: "#1F3A52", hover: "#152838" },
  { id: "thaat", name: "ذات العنابي", primary: "#800020", hover: "#4A0012" },
  { id: "sage", name: "الأخضر الهادئ", primary: "#2E5A44", hover: "#14281D" },
  { id: "amber", name: "العنبري الدافئ", primary: "#C25900", hover: "#5C2B00" },
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
  // القراءة الابتدائية لمنع الوميض والجعل "الكحلي الملكي" افتراضياً
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

    // استخراج بيانات ألوان الثيم الحالي وتطبيقها مباشرة كمتغيرات CSS
    const currentThemeData = THEMES.find((t) => t.id === theme) ?? THEMES[0];
    root.style.setProperty("--theme-primary", currentThemeData.primary);
    root.style.setProperty("--theme-primary-hover", currentThemeData.hover);

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