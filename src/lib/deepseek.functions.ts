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
        "الثيم البصري الأنسب للموضوع: formal أو calm أو energetic أو spiritual أو creative",
    },
  },
  required: ["title", "intro", "body", "reminder", "theme"],
  additionalProperties: false,
} as const;

function readGatewayMessage(raw: string, fallback: string) {
  try {
    const parsed = JSON.parse(raw) as {
      error?: { message?: string };
      message?: string;
    };

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
    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/responses",
      {
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
            format: {
              type: "json_schema",
              name: "weekly_guidance",
              strict: true,
              schema: weeklySchema,
            },
          },
        }),
      }
    );

    if (!response.ok) {
      const body = await response.text();
      const message = readGatewayMessage(
        body,
        "تعذّر توليد التوجيه الأسبوعي."
      );

      if (
        (response.status === 429 || response.status >= 500) &&
        attempt < 2
      ) {
        const retryAfter = Number(
          response.headers.get("Retry-After") || 0
        );

        await wait(
          Math.max(retryAfter * 1000, 700 * 2 ** attempt)
        );

        continue;
      }

      if (response.status === 401) {
        throw new Error(
          "خدمة الذكاء الاصطناعي غير مهيأة حالياً."
        );
      }

      if (response.status === 402) {
        throw new Error(
          message || "الرصيد المخصص للذكاء الاصطناعي غير كافٍ."
        );
      }

      throw new Error(message);
    }

    if (!response.body) {
      throw new Error(
        "لم تُرجع خدمة الذكاء الاصطناعي محتوى."
      );
    }

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
          const event = JSON.parse(payload) as {
            type?: string;
            delta?: string;
          };

          if (
            event.type === "response.output_text.delta" &&
            event.delta
          ) {
            output += event.delta;
          }
        } catch {
          // تجاهل رسائل البث غير النصية.
        }
      }
    }

    if (!output.trim()) {
      throw new Error(
        "اكتملت المعالجة دون نص قابل للاستخدام. حاول مرة أخرى."
      );
    }

    return output;
  }

  throw new Error(
    "تعذّر توليد التوجيه بعد عدة محاولات."
  );
}

/**
 * توليد منشور التوجيه الطلابي الأسبوعي.
 *
 * الذكاء الاصطناعي لا يختار أكواد ألوان مباشرة؛
 * بل يختار ThemeKey، ثم تقوم الواجهة بتطبيق لوحة الألوان
 * المناسبة. هذا أكثر أماناً واتساقاً في التصميم.
 */
export const draftWeeklyGuidance = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }): Promise<WeeklyGuidanceDraft> => {
    const apiKey = process.env["LOVABLE_API_KEY"];

    if (!apiKey) {
      throw new Error(
        "خدمة الذكاء الاصطناعي غير مهيأة حالياً."
      );
    }

    const prompt = `أنت مساعد صياغة تربوي متخصص في التوجيه الطلابي لطلاب المرحلة المتوسطة في المملكة العربية السعودية.

أنشئ منشور "التوجيه الطلابي الأسبوعي" حول الموضوع التالي:
"${data.topic}"

أسلوب الصياغة المطلوب:
"${data.tone}"

اكتب باللغة العربية الفصحى المبسطة.

مواصفات المحتوى:
1) title:
- كلمة أو عبارة قصيرة جداً من 1 إلى 3 كلمات.
- تمثل القيمة أو الفكرة المحورية.
- لا تضع علامات تنصيص.

2) intro:
- جملة تمهيدية واحدة.
- من 20 إلى 30 كلمة تقريباً.
- جذابة ومناسبة لبداية منشور تربوي.

3) body:
- فقرة واحدة من 35 إلى 55 كلمة تقريباً.
- تشرح الفكرة بوضوح.
- تربط الموضوع بشخصية الطالب وسلوكه وحياته اليومية.
- اجعلها عملية وليست مجرد موعظة عامة.

4) reminder:
- جملة ختامية من 20 إلى 35 كلمة تقريباً.
- موجهة للطلاب بصيغة الجمع.
- تحفيزية ومحترمة.
- لا تستخدم التخويف أو التهديد.

5) theme:
اختر ثيماً بصرياً واحداً فقط من القائمة التالية:

formal:
رسمي وهادئ، مناسب للانضباط، المسؤولية، الجدية، احترام الأنظمة، المواظبة، الالتزام.

calm:
هادئ ومطمئن، مناسب للرفق، الصبر، التعاون، التسامح، الهدوء، إدارة الغضب.

energetic:
حيوي ومتحمس، مناسب للإنجاز، الرياضة، النشاط، المبادرة، التفوق، الحماس.

spiritual:
روحاني وقيمي، مناسب للأمانة، الصدق، بر الوالدين، الأخلاق، الصلاة، القرآن والقيم الإسلامية.

creative:
إبداعي وحديث، مناسب للإبداع، المواهب، التفكير، الفنون، الابتكار، القراءة.

قواعد مهمة:
- اختر theme واحداً فقط.
- أعد اسم theme بالإنجليزية كما هو.
- لا تُخرج أكواد ألوان.
- لا تستخدم Markdown.
- لا تستخدم Emojis.
- لا تضع عناوين فرعية داخل النص.
- لا تكرر القيمة المحورية بلا داعٍ.
- لا تستخدم عبارات مبالغاً فيها.
- لا تنسب نصوصاً دينية أو أحاديث دون حاجة.
- إذا كان الموضوع عاماً، اختر أقرب theme لمعناه التربوي.
- المحتوى يجب أن يكون مناسباً لمنشور A4 لطلاب المرحلة المتوسطة.

أعد JSON فقط وفق المخطط المطلوب.`;

    const raw = await generate(apiKey, prompt);

    try {
      const parsed = JSON.parse(raw) as Partial<WeeklyGuidanceDraft>;

      const rawTheme = String(
        parsed.theme ?? "formal"
      )
        .toLowerCase()
        .trim();

      const theme: ThemeKey = (
        THEME_KEYS as readonly string[]
      ).includes(rawTheme)
        ? (rawTheme as ThemeKey)
        : "formal";

      return {
        title: String(parsed.title || data.topic).trim(),
        intro: String(parsed.intro || "").trim(),
        body: String(parsed.body || "").trim(),
        reminder: String(parsed.reminder || "").trim(),
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
