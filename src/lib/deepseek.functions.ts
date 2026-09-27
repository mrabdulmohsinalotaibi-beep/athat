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
  brief: z.string().min(2).max(2000),
  mode: z.enum(["fill", "rewrite"]).default("fill"),
  targetField: z.string().max(100).optional(),
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
- في وضع التعبئة: اعتبر "المختصر" الذي يكتبه الموجه المصدر الأساسي للمحتوى، ثم وزّع معناه على الحقول النصية الناقصة بصورة مترابطة.
- في وضع تحسين الصياغة: أعد صياغة النص الموجود في الحقل المستهدف فقط ليصبح أكثر مهنية ووضوحًا، مع الحفاظ على معناه وعدم إضافة أي معلومة جديدة.
- يمكنك تحويل المختصر أو النص الموجود إلى صياغة رسمية وتوسيع العبارة تربويًا، لكن لا تضف واقعة أو تشخيصًا أو نتيجة محددة أو رقمًا أو تاريخًا أو اسمًا غير موجود في البيانات.
- إذا كان الحقل توصية أو إجراءً تربويًا، يمكنك اقتراح إجراء عام مناسب مشتق من المختصر، على أن يكون واضحًا أنه توصية وليس واقعة حدثت.
- إذا كان الحقل يحتاج معلومة واقعية غير موجودة ولا يمكن صياغته بأمان، أعد قيمة فارغة لذلك الحقل.
- لا تقترح قيمًا لحقول الاختيار أو الأرقام أو التواريخ؛ المطلوب فقط الحقول النصية المرسلة.
- استخدم صياغة تربوية رسمية، عملية، واضحة ومختصرة، قابلة للمراجعة من الموجه الطلابي.
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

    if (data.mode === "rewrite" && !data.targetField) {
      throw new Error("لم يتم تحديد الحقل المطلوب تحسين صياغته.");
    }

    const allowedFields =
      data.mode === "rewrite"
        ? data.fields.filter((field) => field.name === data.targetField)
        : data.fields.filter((field) => !data.values[field.name]?.trim());
    if (!allowedFields.length) {
      return { suggestions: {} };
    }

    const sensitiveFieldPattern =
      /(^|_)(id|student_id|national_id|phone|mobile|email|guardian_phone)($|_)/i;
    const allowedContextNames = new Set(
      data.fields
        .filter((field) => field.type === "text" || field.type === "textarea")
        .map((field) => field.name),
    );
    const contextEntries =
      data.mode === "rewrite"
        ? []
        : Object.entries(data.values)
            .filter(
              ([name, value]) =>
                allowedContextNames.has(name) &&
                !sensitiveFieldPattern.test(name) &&
                value.trim(),
            )
            .slice(0, 30);

    const userPrompt = JSON.stringify(
      {
        نوع_السجل: data.recordTitle,
        المفتاح_البرمجي: data.recordType,
        المدرسة: data.schoolName || "",
        وضع_العمل: data.mode === "rewrite" ? "تحسين صياغة حقل موجود" : "تعبئة الحقول الناقصة",
        الحقل_المستهدف: data.targetField || "",
        المختصر_الذي_كتبه_الموجه: data.brief.trim(),
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

      if (response.status === 401 || response.status === 403) {
        throw new Error("مفتاح DeepSeek غير صحيح أو غير متاح للخدمة. تأكد من إضافة DEEPSEEK_API_KEY في Cloudflare ثم أعد نشر الموقع.");
      }
      if (response.status === 402) {
        throw new Error("حساب DeepSeek لا يملك رصيدًا كافيًا لاستخدام واجهة API.");
      }
      if (response.status === 429) {
        throw new Error("تم تجاوز حد طلبات DeepSeek مؤقتًا. انتظر قليلًا ثم حاول مرة أخرى.");
      }

      throw new Error("تعذّر الاتصال بخدمة DeepSeek. تأكد من DEEPSEEK_API_KEY وإعادة نشر الموقع بعد إضافته.");
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
      error?: { message?: string };
    };
    const rawContent = payload.choices?.[0]?.message?.content?.trim();

    if (!rawContent) {
      throw new Error(payload.error?.message || "لم تُرجع خدمة DeepSeek اقتراحات.");
    }

    // DeepSeek normally returns strict JSON with response_format=json_object,
    // but some deployments may still wrap it in a markdown code fence.
    const normalizedContent = rawContent
      .replace(/^\s*```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/i, "")
      .trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(normalizedContent);
    } catch {
      throw new Error("تعذّر قراءة استجابة الذكاء الاصطناعي. حاول مرة أخرى.");
    }

    const suggestions = cleanSuggestions(
      (parsed as { suggestions?: unknown })?.suggestions ?? parsed,
      new Set(allowedFields.map((field) => field.name)),
    );

    return outputSchema.parse({ suggestions });
  });
