import { createServerFn } from '@tanstack/react-start'
import { requireSupabaseAuth } from './server-auth-middleware' // استدعاء الملف المولد

/**
 * دالة مساعدة لإنشاء دوال سيرفر محمية تلقائياً بشرط وجود تسجيل دخول
 */
export const createProtectedServerFn = () => {
  return createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth])
}

/**
 * دالة جلب بيانات المستخدم الحالي مباشرة على السيرفر
 */
export const getUserProfile = createProtectedServerFn().handler(async ({ context }) => {
  const { supabase, userId } = context

  // استخدام عميل Supabase الموثق بجلسة المستخدم الحالية
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    throw new Error(`تعذر جلب بيانات الملف الشخصي: ${error.message}`)
  }

  return profile
})