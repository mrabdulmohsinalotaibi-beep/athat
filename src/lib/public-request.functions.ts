import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const requestSchema = z.object({
  kind: z.enum(["استشارة فردية", "إحالة طالب", "إبلاغ سري"]),
  details: z.string().min(10).max(5000),
  requesterName: z.string().max(120).nullable().optional(),
  requesterRole: z.string().max(80).nullable().optional(),
  requesterContact: z.string().max(160).nullable().optional(),
  studentName: z.string().max(120).nullable().optional(),
  studentGrade: z.string().max(80).nullable().optional(),
  classroom: z.string().max(80).nullable().optional(),
  topic: z.string().max(120).nullable().optional(),
  urgency: z.enum(["عادي", "مهم", "عاجل"]).default("عادي"),
  preferredTime: z.string().max(120).nullable().optional(),
  isAnonymous: z.boolean().default(false),
  schoolSlug: z.string().max(160).nullable().optional(),
  portalToken: z.string().max(220).nullable().optional(),
});

function clean(value: string | null | undefined) {
  const text = value?.trim() ?? "";
  return text || null;
}

export const submitPublicRequestFallback = createServerFn({ method: "POST" })
  .inputValidator(requestSchema)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let settings = null as { user_id: string; public_requests_enabled: boolean | null } | null;
    let settingsError: Error | null = null;

    if (data.portalToken?.trim()) {
      const result = await supabaseAdmin
        .from("school_settings")
        .select("user_id,public_requests_enabled")
        .eq("private_blog_token", data.portalToken.trim())
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      settings = result.data;
      settingsError = result.error;
    }

    if (!settings && !settingsError && data.schoolSlug?.trim()) {
      const result = await supabaseAdmin
        .from("school_settings")
        .select("user_id,public_requests_enabled")
        .eq("public_slug", data.schoolSlug.trim())
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      settings = result.data;
      settingsError = result.error;
    }
    if (settingsError) throw settingsError;
    if (!settings?.user_id) {
      throw new Error("لم يتم تفعيل استقبال الطلبات لهذه المدرسة بعد.");
    }
    if (settings.public_requests_enabled === false) {
      throw new Error("استقبال الطلبات متوقف حالياً لدى المدرسة.");
    }

    const { data: row, error } = await supabaseAdmin
      .from("public_requests")
      .insert({
        user_id: settings.user_id,
        kind: data.kind,
        requester_name: data.isAnonymous ? null : clean(data.requesterName),
        requester_role: clean(data.requesterRole),
        requester_contact: data.isAnonymous ? null : clean(data.requesterContact),
        student_name: clean(data.studentName),
        student_grade: clean(data.studentGrade),
        classroom: clean(data.classroom),
        topic: clean(data.topic),
        urgency: data.urgency,
        preferred_time: clean(data.preferredTime),
        details: data.details.trim(),
        is_anonymous: data.isAnonymous,
      })
      .select("request_no")
      .single();

    if (error) throw error;
    return row.request_no ?? "تم الاستلام";
  });
