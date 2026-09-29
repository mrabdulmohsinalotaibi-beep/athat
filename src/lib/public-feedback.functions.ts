import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const feedbackSchema = z.object({
  token: z.string().min(8).max(200),
  senderName: z.string().max(120),
  senderContact: z.string().max(160),
  senderRole: z.string().max(80),
  category: z.string().max(80),
  satisfaction: z.number().int().min(1).max(5).nullable(),
  message: z.string().min(3).max(5000),
});

export const submitPublicFeedbackFallback = createServerFn({ method: "POST" })
  .inputValidator(feedbackSchema)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: settings, error: settingsError } = await supabaseAdmin
      .from("school_settings")
      .select("user_id")
      .eq("private_blog_token", data.token)
      .maybeSingle();

    if (settingsError) throw settingsError;
    if (!settings?.user_id) {
      throw new Error("رابط الموجه غير صالح أو لم يعد متاحًا.");
    }

    const { error } = await supabaseAdmin.from("feedback_messages").insert({
      user_id: settings.user_id,
      sender_name: data.senderName.trim() || "مستفيد",
      sender_contact: data.senderContact.trim() || null,
      sender_role: data.senderRole,
      category: data.category,
      satisfaction: data.satisfaction,
      message: data.message.trim(),
      status: "جديد",
    });
    if (error) throw error;

    return { ok: true };
  });
