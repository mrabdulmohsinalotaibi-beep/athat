import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({
  topic: z.string().trim().min(2).max(200),
  tone: z
    .enum(["تربوية هادئة", "تحفيزية حماسية", "دينية وجدانية", "توعوية مباشرة"])
    .default("تربوية هادئة"),
});

/**
 * مفاتيح الثيمات المدعومة في الواجهة.
 * يجب أن تتطابق مع مفاتيح THEMES في WeeklyGuidancePoster.tsx
 */
const THEME_KEYS = ["formal", "calm", "energetic", "spiritual", "creative"] as const;
type ThemeKey = (typeof THEME_KEYS)[number];

export type WeeklyGuidanceDraft = {
  title: string;
  intro: string;
  body: string;
  reminder: string;
  theme: ThemeKey;
};

const weeklySchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    intro: { type: "string" },
    body: { type: "string" },
    reminder: { type: "string" },
    theme: {
      type: "string",
      enum: THEME_KEYS,
      description:
        "الثيم البصري الأنسب للموضوع. formal = رسمي/انضباط، calm = هادئ/رفق، energetic = نشيط/حماس، spiritual = روحاني/قيم، creative = إبداعي/فنون",
    },
  },
  required: ["title", "intro", "body", "reminder", "theme"],
  additionalProperties: false,
} as const;

function readGatewayMessage(raw: string, fallback: string) {
  try {
    const parsed = JSON.parse(raw) as { error?: { message?: string }; message?: string };
    return parsed.error?.message || parsed.message || fallback;
  } catch {
    return fallback;
  }
}

async function wait(milliseconds: number) {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function generate(apiKey: string, prompt: string) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        stream: true,
        reasoning: { effort: "low", summary: "auto" },
        include: ["reasoning.encrypted_content"],
        input: prompt,
        text: {
          format: { type: "json_schema", name: "weekly_guidance", strict: true, schema: weeklySchema },
        },
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      const message = readGatewayMessage(body, "تعذّر توليد التوجيه الأسبوعي.");
      if ((response.status === 429 || response.status >= 500) && attempt < 2) {
        const retryAfter = Number(response.headers.get("Retry-After") || 0);
        await wait(Math.max(retryAfter * 1000, 700 * 2 ** attempt));
        continue;
      }
      if (response.status === 401) throw new Error("خدمة الذكاء الاصطناعي غير مهيأة حالياً.");
      if (response.status === 402) throw new Error(message || "الرصيد المخصص للذكاء الاصطناعي غير كافٍ.");
      throw new Error(message);
    }

    if (!response.body) throw new Error("لم تُرجع خدمة الذكاء الاصطناعي محتوى.");
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let output = "";
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      buffer += decoder.decode(chunk.value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const payload = line.slice(6).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const event = JSON.parse(payload) as { type?: string; delta?: string };
          if (event.type === "response.output_text.delta" && event.delta) output += event.delta;
        } catch {
          // تجاهل رسائل البث غير النصية
        }
      }
    }
    if (!output.trim()) throw new Error("اكتملت المعالجة دون نص قابل للاستخدام. حاول مرة أخرى.");
    return output;
  }
  throw new Error("تعذّر توليد التوجيه بعد عدة محاولات.");
}

/** توليد نص "التوجيه الطلابي الأسبوعي" عبر الذكاء الاصطناعي المدمج في المنصة. */
export const draftWeeklyGuidance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }): Promise<WeeklyGuidanceDraft> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("خدمة الذكاء الاصطناعي غير مهيأة حالياً.");

    const prompt = `أنت مساعد صياغة تربوي لمكتب التوجيه الطلابي بمدرسة سعودية.
اكتب "توجيه طلابي أسبوعي" حول موضوع: "${data.topic}"، بأسلوب ${data.tone}.
الأسلوب: فصيح، دافئ، مباشر، بدون رموز تعبيرية وبدون عناوين فرعية وبدون تنسيق Markdown.

المطلوب خمسة عناصر منفصلة:
1) title: كلمة أو عبارة قصيرة جداً (1-3 كلمات) هي القيمة المحورية.
2) intro: جملة تمهيدية واحدة (20-30 كلمة).
3) body: فقرة (35-55 كلمة) تشرح الفكرة وتربطها بشخصية الطالب وحياته.
4) reminder: جملة ختامية تحفيزية (20-35 كلمة) موجهة للطلاب بصيغة الجمع.
5) theme: الثيم البصري الأنسب لموضوع التوجيه، واختر واحداً فقط من هذه القيم:

   - "formal"    → رسمي ذهبي: يناسب الانضباط، المسؤولية، الجدية، احترام الأنظمة، المواظبة.
   - "calm"      → هادئ أزرق: يناسب الرفق، الصبر، التعاون، الهدوء، التسامح، إدارة الغضب.
   - "energetic" → نشيط برتقالي: يناسب الحماس، الإنجاز، الرياضة، النشاط، المبادرة، التفوق.
   - "spiritual" → روحاني أخضر: يناسب الأمانة، الصدق، بر الوالدين، الأخلاق، الصلاة، القرآن.
   - "creative"  → إبداعي بنفسجي: يناسب الإبداع، المواهب، التفكير، الفنون، الابتكار، القراءة.

   اختر الثيم الأقرب لمعنى الموضوع، وأعد قيمته بالإنجليزية فقط.

لا تكرر القيمة المحورية حرفياً أكثر من مرة في كل عنصر، ولا تضع علامات تنصيص داخل النصوص.`;

    const raw = await generate(apiKey, prompt);
    try {
      const parsed = JSON.parse(raw) as Partial<WeeklyGuidanceDraft>;

      const rawTheme = String(parsed.theme ?? "formal").toLowerCase().trim();
      const theme: ThemeKey = (THEME_KEYS as readonly string[]).includes(rawTheme)
        ? (rawTheme as ThemeKey)
        : "formal";

      return {
        title: (parsed.title || data.topic).trim(),
        intro: (parsed.intro || "").trim(),
        body: (parsed.body || "").trim(),
        reminder: (parsed.reminder || "").trim(),
        theme,
      };
    } catch {
      return {
        title: data.topic,
        intro: raw.trim(),
        body: "",
        reminder: "",
        theme: "formal",
      };
    }
  });