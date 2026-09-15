import { lovable } from "./lovable/index"; // مسار الملف المولد
import { supabase } from "../supabase/client";
import type { OAuthProvider } from "@lovable.dev/cloud-auth-js";

export interface AuthState {
  loading: boolean;
  error: string | null;
}

/**
 * خدمة المصادقة المطورة المخصصة لتطبيقك
 */
export const AuthService = {
  /**
   * تسجيل الدخول عبر مزودي الخدمة (Google, Microsoft, etc.) مع دعم معالجة الأخطاء
   */
  async loginWithProvider(provider: OAuthProvider, redirectUrl?: string) {
    try {
      const response = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: redirectUrl ?? `${window.location.origin}/auth/callback`,
      });

      if ("error" in response && response.error) {
        console.error(`[Auth Error]: فشل تسجيل الدخول عبر ${provider}`, response.error);
        return { success: false, error: response.error.message };
      }

      return { success: true, response };
    } catch (err) {
      const message = err instanceof Error ? err.message : "حدث خطأ غير متوقع أثناء تسجيل الدخول";
      console.error("[Auth System Exception]:", err);
      return { success: false, error: message };
    }
  },

  /**
   * تسجيل الخروج وإلغاء الجلسة من Supabase
   */
  async logout() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      window.location.href = "/login";
    } catch (err) {
      console.error("خطأ أثناء تسجيل الخروج:", err);
    }
  },

  /**
   * جلب معلومات المستخدم الحالي الموثق
   */
  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  }
};