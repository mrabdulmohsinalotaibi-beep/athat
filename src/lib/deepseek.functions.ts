import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({
  topic: z.string().trim().min(2).max(200),
  tone: z
    .enum(["تربوية هادئة", "تحفيزية حماسية", "دينية وجدانية", "توعوية مباشرة"])
    .default("تربوية هادئة"),
});

export type WeeklyGuidanceDraft = {
  title: string;
  intro: string;
  body: string;
  reminder: string;
};

/**
 * توليد نص "التوجيه الطلابي الأسبوعي" عبر DeepSeek.
 * يتطلّب متغيّر البيئة DEEPSEEK_API_KEY (أضِفه في .env ولوحة تحكم الاستضافة، ولا تكتبه في الواجهة أبداً).
 */
export const draftWeeklyGuidance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }): Promise<WeeklyGuidanceDraft> => {
    const apiKey = process.env["DEEPSEEK_API_KEY"];
    if (!apiKey) {
      throw new Error("مفتاح DeepSeek غير مُهيأ. أضِف DEEPSEEK_API_KEY في متغيرات البيئة على الخادم.");
    }

    const prompt = `أنت مساعد صياغة تربوي لمكتب التوجيه الطلابي بمدرسة سعودية.
اكتب "توجيه طلابي أسبوعي" حول موضوع: "${data.topic}"، بأسلوب ${data.tone}.
الأسلوب: فصيح، دافئ، مباشر، بدون رموز تعبيرية وبدون عناوين فرعية وبدون تنسيق Markdown.

المطلوب أربعة عناصر منفصلة:
1) title: كلمة أو عبارة قصيرة جداً (1-3 كلمات) هي القيمة المحورية، مثل "الانضباط" أو "احترام الوقت".
2) intro: جملة تمهيدية واحدة (20-30 كلمة) تمهّد لأهمية القيمة، تبدأ أسلوبها بمثل "مع انطلاقة هذا الأسبوع...".
3) body: فقرة ثانية (35-55 كلمة) تشرح الفكرة بعمق وتربطها بشخصية الطالب وحياته.
4) reminder: جملة ختامية تحفيزية واحدة (20-35 كلمة) تبدأ فكرتها بمعنى "تذكّر دائماً"، موجهة للطلاب مباشرة بصيغة الجمع.

لا تكرر القيمة المحورية حرفياً أكثر من مرة واحدة في كل عنصر. لا تضع علامات تنصيص داخل النصوص.
أعد النتيجة بصيغة JSON فقط بدون أي نص إضافي وبالمفاتيح التالية بالضبط:
{"title": "...", "intro": "...", "body": "...", "reminder": "..."}`;

    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        temperature: 0.8,
        max_tokens: 500,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "أنت مساعد كتابة عربي محترف متخصص في التوجيه الطلابي المدرسي." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`تعذّر الاتصال بخدمة DeepSeek (${response.status}): ${errText.slice(0, 200)}`);
    }

    const json = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = json.choices?.[0]?.message?.content;
    if (!raw) throw new Error("لم تُرجع الخدمة أي نص. حاول مرة أخرى.");

    try {
      const parsed = JSON.parse(raw) as Partial<WeeklyGuidanceDraft>;
      if (!parsed.intro && !parsed.body) throw new Error("empty");
      return {
        title: (parsed.title || data.topic).trim(),
        intro: (parsed.intro || "").trim(),
        body: (parsed.body || "").trim(),
        reminder: (parsed.reminder || "").trim(),
      };
    } catch {
      // نص احتياطي في حال لم يلتزم النموذج بصيغة JSON
      return { title: data.topic, intro: raw.trim(), body: "", reminder: "" };
    }
  });
