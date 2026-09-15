import { createContext, useContext, useEffect, type ReactNode } from "react";

// تعريف اللون الثابت واستخراج الدرجات
export const APP_THEME = {
  id: "thaat-navy",
  name: "ذات الكحلي",
  colors: {
    primary: "#1F3A52",       // لون الأزرار والهيدر العلوي
    primaryHover: "#152838",  // درجة أغمق عند التأشير بالماوس (Hover)
    bgSoft: "#F8FAFC",        // خلفية الصفحة الكلية
    cardBg: "#FFFFFF",        // خلفية البطاقات
  },
} as const;

export type AppTheme = typeof APP_THEME.id;

type ThemeContextType = {
  theme: AppTheme;
  colors: typeof APP_THEME.colors;
};

const ThemeContext = createContext<ThemeContextType>({
  theme: APP_THEME.id,
  colors: APP_THEME.colors,
});

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  useEffect(() => {
    // تطبيق سمة اللون الثابتة على HTML مباشرة
    document.documentElement.dataset["theme"] = APP_THEME.id;
  }, []);

  return (
    <ThemeContext.Provider value={{ theme: APP_THEME.id, colors: APP_THEME.colors }}>
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