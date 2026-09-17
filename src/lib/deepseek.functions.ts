import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({
  topic: z.string().trim().min(2).max(200),
  tone: z
    .enum(["تربوية هادئة", "تحفيزية حماسية", "دينية وجدانية", "توعوية مباشرة"])
    .default("تربوية هادئة"),
});

const THEME_KEYS = [
  "formal",
  "calm",
  "energetic",
  "spiritual",
  "creative",
] as const;

type ThemeKey = (typeof THEME_KEYS)[number];

export type WeeklyGuidanceDraft = {
  title: string;
  intro: string;
  body: string;
  reminder: string;
  theme: ThemeKey;
};

export const draftWeeklyGuidance = createServerFn({ method: "POST" })
  .validator((data: unknown) => Input.parse(data))
  .handler(async ({ data }) => {
    // التأكد من توثيق المستخدم قبل السماح للذكاء الاصطناعي بالعمل
    await requireSupabaseAuth();

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      throw new Error("مفتاح ربط DeepSeek غير متوفر في إعدادات البيئة (Environment Variables).");
    }

    const prompt = `أنت موجه طلابي تربوي خبير في المملكة العربية السعودية. اكتب رسالة توجيه طلابية أسبوعية مميزة ومؤثرة موجهة للطلاب داخل المدرسة حول الموضوع التالي: "${data.topic}"
    
    الرجاء الرد حصرياً بصيغة JSON مطابقة للشكل التالي بدون أي نصوص إضافية:
    {
      "title": "عنوان قصير وقوي للموضوع (كلمة محورية)",
      "intro": "فقرة تمهيدية جذابة ومناسبة لبداية الأسبوع الدراسي",
      "body": "الفقرة التفصيلية والتربوية التي توضح قيمة الموضوع وأثره الإيجابي على الطالب",
      "reminder": "تذكير ختامي أو نصيحة مركزة تبدأ بعبارة تذكر دائماً",
      "theme": "formal"
    }`;

    try {
      const response = "https://api.deepseek.com/v1/chat/completions"; // أو الرابط المعتمد لـ DeepSeek API
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
              content: "أنت مساعد ذكي متخصص في صياغة المحتوى التربوي والتوجيهي للمدارس باللغة العربية الفصحى.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0.7,
        }),
      });

      if (!res.ok) {
        throw new Error("فشل الاتصال بخدمة DeepSeek الذكية.");
      }

      const json = await res.json();
      const content = json.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error("لم يتم استرجاع محتوى صالح من نموذج الذكاء الاصطناعي.");
      }

      const parsed: WeeklyGuidanceDraft = JSON.parse(content);
      return parsed;
    } catch (error) {
      console.error("DeepSeek Error:", error);
      throw new Error("تعذّر توليد محتوى التوجيه الأسبوعي حالياً. حاول مرة أخرى.");
    }
  });
