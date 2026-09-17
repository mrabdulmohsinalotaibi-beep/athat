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

export const draftWeeklyGuidance = createServerFn({ method: "POST" })
  .validator((data: unknown) => Input.parse(data))
  .handler(async ({ data }) => {
    await requireSupabaseAuth();

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      throw new Error("مفتاح ربط DeepSeek غير متوفر في إعدادات البيئة.");
    }

    const prompt = `أنت موجه طلابي خبير. اكتب رسالة توجيهية أسبوعية للطلاب حول موضوع: "${data.topic}"
    
    يجب أن تكون الإجابة بصيغة JSON فقط بهذا الشكل وبدون أي شي آخر:
    {
      "title": "عنوان قصير وقوي",
      "intro": "فقرة تمهيدية",
      "body": "الفقرة التفصيلية",
      "reminder": "تذكر دائماً: النص هنا"
    }`;

    try {
      const res = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            {
              role: "system",
              content: "أنت مساعد تربوي تصيغ المحتوى بصيغة JSON فقط.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.7,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error("DeepSeek API Error Response:", errText);
        throw new Error("فشل الاتصال بخدمة DeepSeek.");
      }

      const json = await res.json();
      let content = json.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error("لم يتم استرجاع محتوى من الذكاء الاصطناعي.");
      }

      // تنظيف النص في حال أضاف النموذج علامات markdown للـ json
      content = content.replace(/```json/g, "").replace(/```/g, "").trim();

      const parsed: WeeklyGuidanceDraft = JSON.parse(content);
      
      // التأكد من وجود الحقائب لمنع أي خطأ مستقبلي
      return {
        title: parsed.title || data.topic,
        intro: parsed.intro || "",
        body: parsed.body || "",
        reminder: parsed.reminder || "",
      };
    } catch (error) {
      console.error("DeepSeek Processing Error:", error);
      throw new Error("حدث خطأ أثناء معالجة الرد من الذكاء الاصطناعي. تأكد من صحة المفتاح.");
    }
  });
