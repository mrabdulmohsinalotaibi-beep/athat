import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const fieldSchema = z.object({
  name: z.string().min(1).max(100),
  label: z.string().min(1).max(200),
  type: z.enum(["text", "textarea"]),
});

const inputSchema = z.object({
  recordType: z.string().min(1).max(100),
  recordTitle: z.string().min(1).max(200),
  fields: z.array(fieldSchema).min(1).max(40),
  values: z.record(z.string(), z.string().max(4000)).default({}),
  schoolName: z.string().max(200).optional(),
});

const outputSchema = z.object({
  suggestions: z.record(z.string(), z.string()),
});

const SYSTEM_PROMPT = `أنت مساعد مهني لمنصة "الذات" للتوجيه الطلابي في المدارس السعودية.
مهمتك اقتراح نصوص إرشادية رسمية باللغة العربية لحقول النماذج التي لم تُعبّأ.

قواعد إلزامية:
- لا تختلق واقعة أو تشخيصًا أو سببًا أو نتيجة أو تاريخًا أو رقمًا أو اسمًا.
- لا تحوّل الاحتمال إلى حقيقة.
- اعتمد فقط على البيانات المقدمة في الطلب.
- إذا كانت المعلومات غير كافية لاقتراح نص مهني دقيق، أعد قيمة فارغة لذلك الحقل.
- لا تقترح قيمًا لحقول الاختيار أو الأرقام أو التواريخ؛ المطلوب فقط الحقول النصية المرسلة.
- استخدم صياغة تربوية رسمية، مختصرة، قابلة للمراجعة من الموجه الطلابي.
- لا تستخدم لغة لوم أو وصم للطالب.
- لا تضع عبارات مثل "حسب علمي" أو "ربما" داخل النص المقترح إلا إذا كانت ضرورية لحفظ عدم اليقين.
- أعد JSON فقط بالشكل: {"suggestions":{"field_name":"النص المقترح"}}.
- أعد فقط الحقول التي يمكن اقتراحها بثقة، ولا تكرر الحقول الموجودة أصلًا.`;

function cleanSuggestions(value: unknown, allowedNames: Set<string>) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  const result: Record<string, string> = {};
  for (const [name, text] of Object.entries(value as Record<string, unknown>)) {
    if (!allowedNames.has(name) || typeof text !== "string") continue;
    const cleaned = text.trim();
    if (cleaned) result[name] = cleaned.slice(0, 4000);
  }
  return result;
}

export const generateSmartFill = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(inputSchema)
  .handler(async ({ data }) => {
    const apiKey = process.env["DEEPSEEK_API_KEY"];
    if (!apiKey) {
      throw new Error("لم يتم إعداد مفتاح DeepSeek في متغيرات البيئة.");
    }

    const allowedFields = data.fields.filter(
      (field) => !data.values[field.name]?.trim(),
    );
    if (!allowedFields.length) {
      return { suggestions: {} };
    }

    const contextEntries = Object.entries(data.values)
      .filter(([, value]) => value.trim())
      .slice(0, 40);

    const userPrompt = JSON.stringify(
      {
        نوع_السجل: data.recordTitle,
        المفتاح_البرمجي: data.recordType,
        المدرسة: data.schoolName || "",
        الحقول_المطلوب_اقتراحها: allowedFields,
        البيانات_المعبأة_حاليًا: Object.fromEntries(contextEntries),
      },
      null,
      2,
    );

    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env["DEEPSEEK_MODEL"] || "deepseek-chat",
        temperature: 0.25,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const message = await response.text().catch(() => "");
      console.error("[DeepSeek] request failed", response.status, message);
      throw new Error("تعذّر الاتصال بخدمة DeepSeek. تحقق من إعداد المفتاح وحاول مرة أخرى.");
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };
    const rawContent = payload.choices?.[0]?.message?.content?.trim();

    if (!rawContent) {
      throw new Error("لم تُرجع خدمة DeepSeek اقتراحات.");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      throw new Error("تعذّر قراءة استجابة DeepSeek.");
    }

    const suggestions = cleanSuggestions(
      (parsed as { suggestions?: unknown })?.suggestions ?? parsed,
      new Set(allowedFields.map((field) => field.name)),
    );

    return outputSchema.parse({ suggestions });
  });
