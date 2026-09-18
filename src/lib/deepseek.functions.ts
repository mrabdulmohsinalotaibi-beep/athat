import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({
  topic: z.string().trim().min(1).max(200),
  tone: z.string().optional(),
});

export type WeeklyGuidanceDraft = {
  title: string;
  intro: string;
  body: string;
  reminder: string;
};

const weeklySchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "intro", "body", "reminder"],
  properties: {
    title: { type: "string" },
    intro: { type: "string" },
    body: { type: "string" },
    reminder: { type: "string" },
  },
} as const;

export const draftWeeklyGuidance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data }): Promise<WeeklyGuidanceDraft> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("خدمة الذكاء الاصطناعي غير مهيأة حالياً.");

    const prompt = `أنت موجه طلابي خبير في مدارس المملكة العربية السعودية.
اكتب لوحة توجيه أسبوعية للطلاب حول موضوع: "${data.topic}".
النبرة المطلوبة: ${data.tone || "تربوية هادئة"}.
اجعل العنوان قصيراً وقوياً، والتمهيد جملتين، والفقرة التفصيلية موجزة وعملية، والتذكير جملة واحدة ملهمة.
أعد JSON مطابقاً للمخطط فقط.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        input: prompt,
        text: {
          format: { type: "json_schema", name: "weekly_guidance", strict: true, schema: weeklySchema },
        },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) throw new Error("تم تجاوز حد الاستخدام مؤقتاً، أعد المحاولة بعد قليل.");
      if (response.status === 402) throw new Error("الرصيد المخصص للذكاء الاصطناعي غير كافٍ.");
      throw new Error("تعذّر توليد محتوى اللوحة الأسبوعية.");
    }

    const payload = (await response.json()) as {
      output_text?: string;
      output?: { content?: { text?: string }[] }[];
    };
    const text =
      payload.output_text ?? payload.output?.flatMap((item) => item.content ?? []).find((c) => c.text)?.text ?? "";
    if (!text.trim()) throw new Error("لم تُرجع خدمة الذكاء الاصطناعي محتوى.");

    let parsed: Partial<WeeklyGuidanceDraft>;
    try {
      parsed = JSON.parse(text) as Partial<WeeklyGuidanceDraft>;
    } catch {
      throw new Error("تعذّرت قراءة المحتوى الناتج. حاول مرة أخرى.");
    }

    return {
      title: parsed.title || data.topic,
      intro: parsed.intro || "",
      body: parsed.body || "",
      reminder: parsed.reminder || "",
    };
  });
