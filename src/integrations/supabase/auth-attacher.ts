import { createMiddleware } from '@tanstack/react-start'
import { supabase } from './client'

/**
 * وسيط مخصص ومطور لإرفاق توكن Supabase مع إدارة الحالات الاستثنائية وتحديث الجلسة
 */
export const EnhancedAuthMiddleware = createMiddleware({ type: 'function' }).client(
  async ({ next }) => {
    try {
      // 1. جلب الجلسة الحالية
      let { data: { session }, error } = await supabase.auth.getSession()

      // 2. محاولة إعادة تجديد الجلسة تلقائياً إذا كانت منتهية الصلاحية
      if (error || !session) {
        const refreshResult = await supabase.auth.refreshSession()
        session = refreshResult.data.session
      }

      const token = session?.access_token

      // 3. تمرير التوكن في الهيدر لتطبيق سياسات RLS على السيرفر
      return await next({
        headers: token
          ? {
              Authorization: `Bearer ${token}`,
              'X-User-ID': session?.user?.id ?? '',
            }
          : {},
      })
    } catch (err) {
      console.error('[Auth Middleware Error]: تعذر استخراج توكن المصادقة', err)
      return await next({ headers: {} })
    }
  },
)