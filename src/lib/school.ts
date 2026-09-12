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
      if (error) throw error;
      return data as SchoolSettings | null;
    },
  });
}
