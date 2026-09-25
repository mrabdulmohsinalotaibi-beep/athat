import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SchoolSettings {
  id?: string;
  school_name?: string | null;
  education_dept?: string | null;
  principal_name?: string | null;
  counselor_name?: string | null;
  academic_year?: string | null;
  semester?: string | null;
  counselor_signature?: string | null;
  principal_signature?: string | null;
  show_counselor_on_documents?: boolean | null;
  show_principal_on_documents?: boolean | null;
  public_feedback_token?: string | null;
  theme?: string | null;
}

export function useSchool() {
  return useQuery({
    queryKey: ["school_settings"],
    queryFn: async (): Promise<SchoolSettings | null> => {
      const { data, error } = await supabase
        .from("school_settings")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("خطأ في جلب إعدادات المدرسة:", error.message);
        throw error;
      }

      return data as SchoolSettings | null;
    },
    staleTime: 1000 * 60 * 30, // احتفاظ بالبيانات في الكاش لمدة 30 دقيقة بدون إعادة طلب
  });
}
