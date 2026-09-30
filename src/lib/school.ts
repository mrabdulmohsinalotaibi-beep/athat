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
  logo_url?: string | null;
  ministry_logo_url?: string | null;
  vision?: string | null;
  mission?: string | null;
  announcement?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  office_hours?: string | null;
  public_requests_enabled?: boolean | null;
  updated_at?: string | null;
}

export function useSchool() {
  return useQuery({
    queryKey: ["school_settings"],
    queryFn: async (): Promise<SchoolSettings | null> => {
      const { data: sessionData } = await supabase.auth.getSession();
      let userId = sessionData.session?.user.id ?? "";

      try {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (!authError && authData.user) userId = authData.user.id;
      } catch {
        // Keep using the locally persisted session during a transient auth/network failure.
      }

      if (!userId) return null;

      const { data, error } = await supabase
        .from("school_settings")
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("خطأ في جلب إعدادات المدرسة:", error.message);
        throw error;
      }

      return data as SchoolSettings | null;
    },
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
}
