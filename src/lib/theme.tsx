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
@tailwind base;
@tailwind components;
@tailwind utilities;

/* المتغيرات الخاصة باللون الداكن الثابت المطابق للواجهة */
:root,
[data-theme="thaat-navy"] {
  --theme-primary: #1f3a52;
  --theme-primary-hover: #152838;
  --theme-bg-soft: #f8fafc;
  --theme-card-bg: #ffffff;
  --theme-text-primary: #1e293b;
  --theme-border: #e2e8f0;
}

/* التنسيق العام للصفحة */
body {
  background-color: var(--theme-bg-soft);
  color: var(--theme-text-primary);
  font-family: inherit;
  margin: 0;
  padding: 0;
}

/* تنسيقات الأزرار المطابقة للتصميم (دخول القسم) */
.btn-primary {
  background-color: var(--theme-primary);
  color: #ffffff;
  border: none;
  border-radius: 9999px; /* شكل بيضاوي دائري بالكامل */
  padding: 0.5rem 1.75rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s ease-in-out, transform 0.1s ease;
}

.btn-primary:hover {
  background-color: var(--theme-primary-hover);
}

.btn-primary:active {
  transform: scale(0.98);
}

/* تنسيق بطاقة الخدمة */
.card-theme {
  background-color: var(--theme-card-bg);
  border: 1px solid var(--theme-border);
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
}