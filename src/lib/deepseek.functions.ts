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

function getServerSetting(name: string, context?: unknown) {
  const requestContext = context as
    | { cloudflareEnv?: Record<string, unknown> }
    | undefined;
  const cloudflareValue = requestContext?.cloudflareEnv?.[name];
  if (typeof cloudflareValue === "string" && cloudflareValue.trim()) {
    return cloudflareValue.trim();
  }

  // TanStack documents process.env as the normal server-function fallback.
  const processValue =
    typeof process !== "undefined" ? process.env[name]?.trim() : undefined;
  return processValue || undefined;
}

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

export const checkSmartFillReady = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => ({
    ready: Boolean(getServerSetting("DEEPSEEK_API_KEY", context)),
    model: getServerSetting("DEEPSEEK_MODEL", context) || "deepseek-chat",
  }));

export const generateSmartFill = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(inputSchema)
  .handler(async ({ data, context }) => {
    const apiKey = getServerSetting("DEEPSEEK_API_KEY", context);
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
                allowedContextNames.has(name) && !sensitiveFieldPattern.test(name) && value.trim(),
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
        model: getServerSetting("DEEPSEEK_MODEL", context) || "deepseek-chat",
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
        throw new Error(
          "مفتاح DeepSeek غير صحيح أو غير متاح للخدمة. تأكد من إضافة DEEPSEEK_API_KEY في Cloudflare ثم أعد نشر الموقع.",
        );
      }
      if (response.status === 402) {
        throw new Error("حساب DeepSeek لا يملك رصيدًا كافيًا لاستخدام واجهة API.");
      }
      if (response.status === 429) {
        throw new Error("تم تجاوز حد طلبات DeepSeek مؤقتًا. انتظر قليلًا ثم حاول مرة أخرى.");
      }

      throw new Error(
        "تعذّر الاتصال بخدمة DeepSeek. تأكد من DEEPSEEK_API_KEY وإعادة نشر الموقع بعد إضافته.",
      );
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
      error?: { message?: string };
    };
    const rawContent = payload.choices?.[0]?.message?.content?.trim();

    if (!rawContent) {
      throw new Error(payload.error?.message || "لم تُرجع خدمة DeepSeek اقتراحات.");
    }

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

const assistantInputSchema = z.object({
  task: z.enum(["message", "plan", "next_steps"]),
  audience: z.enum(["ولي أمر", "طالب", "معلم", "إدارة المدرسة", "الموجه الطلابي"]),
  brief: z.string().min(5).max(3000),
});
const assistantOutputSchema = z.object({
  answer: z.string().min(1).max(6000),
  bullets: z.array(z.string().min(1).max(500)).max(8),
});
const ASSISTANT_SYSTEM_PROMPT = `أنت مساعد مهني للموجه الطلابي في المدارس السعودية.
اكتب بالعربية الفصحى، وبأسلوب تربوي عملي قابل للمراجعة.
لا تشخّص حالة نفسية أو طبية، ولا تقرر إجراءً نظاميًا نيابة عن المدرسة.
لا تخترع أسماء أو تواريخ أو أرقامًا أو وقائع غير موجودة.
إذا كان الطلب يتضمن خطرًا على سلامة طالب، أو إيذاءً، أو تنمرًا شديدًا، فنبّه إلى اتباع إجراءات الحماية والإحالة الرسمية فورًا.
في الرسائل: اكتب نصًا مهنيًا قصيرًا قابلًا للنسخ.
في الخطط: اكتب هدفًا وخطوات ومؤشر نجاح ومتابعة، مع اعتبارها مقترحات لا وقائع.
في الخطوات التالية: رتّب إجراءات عملية مع تنبيه لما يحتاج توثيقًا أو إحالة.
أعد JSON فقط بالشكل: {"answer":"...","bullets":["..."]}.`;

function redactAssistantBrief(value: string) {
  return value
    .replace(/\b\d{8,}\b/g, "[بيانات رقمية محجوبة]")
    .replace(/(?:\+?966|05)\s?\d[\d\s-]{6,}\d/g, "[رقم هاتف محجوب]")
    .trim();
}

export const generateCounselorAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(assistantInputSchema)
  .handler(async ({ data, context }) => {
    const apiKey = getServerSetting("DEEPSEEK_API_KEY", context);
    if (!apiKey) throw new Error("لم يتم إعداد مفتاح DeepSeek في متغيرات البيئة.");
    const safeBrief = redactAssistantBrief(data.brief);
    const taskLabel =
      data.task === "message"
        ? "صياغة رسالة"
        : data.task === "plan"
          ? "بناء خطة إرشادية"
          : "اقتراح الخطوات التالية";
    const userPrompt = JSON.stringify(
      { نوع_المهمة: taskLabel, الجمهور: data.audience, وصف_منزوع_البيانات_الرقمية: safeBrief },
      null,
      2,
    );
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: getServerSetting("DEEPSEEK_MODEL", context) || "deepseek-chat",
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: ASSISTANT_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      }),
    });
    if (!response.ok) {
      if (response.status === 401 || response.status === 403)
        throw new Error("مفتاح DeepSeek غير صحيح أو غير متاح للخدمة.");
      if (response.status === 402)
        throw new Error("حساب DeepSeek لا يملك رصيدًا كافيًا لاستخدام الخدمة.");
      if (response.status === 429)
        throw new Error("تم تجاوز حد طلبات DeepSeek مؤقتًا. انتظر قليلًا ثم حاول مرة أخرى.");
      throw new Error("تعذّر الاتصال بخدمة DeepSeek. تحقق من إعداد المفتاح ثم حاول مرة أخرى.");
    }
    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };
    const rawContent = payload.choices?.[0]?.message?.content?.trim();
    if (!rawContent) throw new Error("لم تُرجع خدمة الذكاء الاصطناعي إجابة.");
    const normalizedContent = rawContent
      .replace(/^\s*```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/i, "")
      .trim();
    try {
      return assistantOutputSchema.parse(JSON.parse(normalizedContent));
    } catch {
      throw new Error("تعذّرت قراءة إجابة الذكاء الاصطناعي. حاول مرة أخرى.");
    }
  });


const freeDocumentInputSchema = z.object({
  instruction: z.string().min(3).max(4000),
  currentText: z.string().max(12000).default(""),
  mode: z.enum(["write", "rewrite", "expand", "shorten"]).default("write"),
});
const freeDocumentOutputSchema = z.object({ text: z.string().min(1).max(12000) });

export const generateFreeDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(freeDocumentInputSchema)
  .handler(async ({ data, context }) => {
    const apiKey = getServerSetting("DEEPSEEK_API_KEY", context);
    if (!apiKey) throw new Error("لم يتم إعداد مفتاح DeepSeek في متغيرات البيئة.");
    const modeLabel = {
      write: "اكتب مستندًا جديدًا بناءً على التعليمات",
      rewrite: "أعد صياغة النص الحالي صياغة رسمية دون إضافة وقائع جديدة",
      expand: "وسّع النص الحالي بصورة مهنية مع الحفاظ على المعلومات الموجودة فقط",
      shorten: "اختصر النص الحالي مع الحفاظ على المعنى والمعلومات الأساسية",
    }[data.mode];
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: getServerSetting("DEEPSEEK_MODEL", context) || "deepseek-chat",
        temperature: 0.25,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: `أنت مساعد كتابة رسمي لمنصة الذات في المدارس السعودية. اكتب عربية فصيحة مهنية. لا تختلق أسماء أو أرقامًا أو تواريخ أو وقائع. لا تضف تشخيصًا نفسيًا أو طبيًا. أعد JSON فقط بالشكل {"text":"..."}.` },
          { role: "user", content: JSON.stringify({ المهمة: modeLabel, تعليمات_المستخدم: data.instruction, النص_الحالي: data.currentText }) },
        ],
      }),
    });
    if (!response.ok) {
      if (response.status === 429) throw new Error("تم تجاوز حد طلبات DeepSeek مؤقتًا.");
      throw new Error("تعذّر الاتصال بخدمة DeepSeek.");
    }
    const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string | null } }> };
    const raw = payload.choices?.[0]?.message?.content?.trim();
    if (!raw) throw new Error("لم تُرجع خدمة الذكاء الاصطناعي نصًا.");
    try {
      const parsed = JSON.parse(raw.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, ""));
      return freeDocumentOutputSchema.parse(parsed);
    } catch {
      throw new Error("تعذّرت قراءة النص المقترح من الذكاء الاصطناعي.");
    }
  });



const studentImportMappingInputSchema = z.object({
  headers: z.array(z.string().min(1).max(200)).min(1).max(100),
});

const STUDENT_IMPORT_AI_FIELDS = [
  ["student_no", "رقم الطالب"],
  ["full_name", "اسم الطالب"],
  ["national_id", "رقم الهوية / السجل المدني"],
  ["nationality", "الجنسية"],
  ["gender", "الجنس"],
  ["stage", "المرحلة"],
  ["grade", "الصف الدراسي"],
  ["classroom", "الفصل / الشعبة"],
  ["guardian_name", "اسم ولي الأمر"],
  ["guardian_phone", "رقم جوال ولي الأمر"],
  ["address", "السكن / العنوان"],
  ["health_status", "الحالة الصحية"],
  ["social_status", "الحالة الاجتماعية"],
  ["status", "حالة القيد"],
  ["notes", "ملاحظات"],
] as const;

const studentImportMappingOutputSchema = z.object({
  mapping: z.record(z.string(), z.string()),
});

const STUDENT_IMPORT_MAPPING_SYSTEM_PROMPT = `أنت مساعد مطابقة أعمدة لملفات طلاب المدارس السعودية داخل منصة "الذات".
ستستقبل أسماء عناوين الأعمدة فقط، ولن تستقبل بيانات الطلاب.

المطلوب:
- اربط كل حقل مستهدف بعنوان واحد فقط من عناوين الملف الأصلية.
- أعد اسم عنوان العمود كما ورد حرفياً في القائمة، ولا تخترع عنواناً جديداً.
- افهم الأخطاء الإملائية البسيطة، الاختصارات، الشرطات، الشرطة السفلية، العربية والإنجليزية.
- لا تستخدم العمود نفسه لأكثر من حقل.
- إذا لم يوجد عنوان مناسب، أعد قيمة فارغة للحقل.
- "المرحلة" تعني ابتدائي/متوسط/ثانوي، و"الصف" يعني الصف الدراسي، و"الفصل" يعني الشعبة/الفصل.
- فرّق بين رقم الطالب ورقم الهوية قدر الإمكان.
- أعد JSON فقط بالشكل {"mapping":{"field_name":"original header"}}.`;

export const suggestStudentImportMapping = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(studentImportMappingInputSchema)
  .handler(async ({ data, context }) => {
    const apiKey = getServerSetting("DEEPSEEK_API_KEY", context);
    if (!apiKey) {
      throw new Error("لم يتم إعداد مفتاح DeepSeek في متغيرات البيئة.");
    }

    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: getServerSetting("DEEPSEEK_MODEL", context) || "deepseek-chat",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: STUDENT_IMPORT_MAPPING_SYSTEM_PROMPT },
          {
            role: "user",
            content: JSON.stringify(
              {
                عناوين_الملف: data.headers,
                الحقول_المستهدفة: STUDENT_IMPORT_AI_FIELDS.map(([name, label]) => ({
                  name,
                  label,
                })),
              },
              null,
              2,
            ),
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403)
        throw new Error("مفتاح DeepSeek غير صحيح أو غير متاح للخدمة.");
      if (response.status === 402)
        throw new Error("حساب DeepSeek لا يملك رصيدًا كافيًا لاستخدام الخدمة.");
      if (response.status === 429)
        throw new Error("تم تجاوز حد طلبات DeepSeek مؤقتًا. حاول بعد قليل.");
      throw new Error("تعذّر الاتصال بخدمة DeepSeek لمطابقة أعمدة الطلاب.");
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };
    const raw = payload.choices?.[0]?.message?.content?.trim();
    if (!raw) throw new Error("لم تُرجع خدمة DeepSeek مطابقة للأعمدة.");

    let parsed: unknown;
    try {
      parsed = JSON.parse(
        raw.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, ""),
      );
    } catch {
      throw new Error("تعذّر قراءة مطابقة الأعمدة من DeepSeek.");
    }

    const source =
      parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? ((parsed as { mapping?: unknown }).mapping ?? parsed)
        : {};

    const validHeaders = new Set(data.headers);
    const validFields = new Set<string>(STUDENT_IMPORT_AI_FIELDS.map(([name]) => name));
    const usedHeaders = new Set<string>();
    const mapping: Record<string, string> = {};

    if (source && typeof source === "object" && !Array.isArray(source)) {
      for (const [field, header] of Object.entries(source as Record<string, unknown>)) {
        if (!validFields.has(field) || typeof header !== "string") continue;
        const exactHeader = header.trim();
        if (!exactHeader || !validHeaders.has(exactHeader) || usedHeaders.has(exactHeader)) continue;
        mapping[field] = exactHeader;
        usedHeaders.add(exactHeader);
      }
    }

    return studentImportMappingOutputSchema.parse({ mapping });
  });

const attendanceAiInputSchema = z.object({
  text: z.string().min(1).max(50000),
});
const attendanceAiRowSchema = z.object({
  student_no: z.string().max(30).default(""),
  student_name: z.string().max(200).default(""),
  adate: z.string().max(20).default(""),
  case_type: z.literal("غياب").default("غياب"),
  count_days: z.number().int().min(1).max(365).default(1),
  action: z.string().max(300).default("متابعة الغياب"),
  source: z.string().max(1000).default(""),
});
const attendanceAiOutputSchema = z.object({
  records: z.array(attendanceAiRowSchema).max(1000),
});

const ATTENDANCE_AI_SYSTEM_PROMPT = `أنت محلل بيانات مخصص لمنصة "الذات" المدرسية.
ستستقبل نصًا مستخرجًا من كشف غياب PDF صادر من نظام إتقان أو من تنسيق مشابه.
مهمتك استخراج سجلات الغياب فقط وتحويلها إلى JSON منظم.

قواعد إلزامية:
- لا تخترع أي اسم أو رقم طالب أو تاريخ غير موجود في النص.
- لا تدمج طالبين في سجل واحد.
- إن كان رقم الطالب غير واضح أعده فارغًا.
- إن كان التاريخ غير واضح أعده فارغًا.
- حوّل الأرقام العربية والهندية إلى أرقام 0-9.
- التاريخ الميلادي يكون YYYY-MM-DD متى أمكن. لا تحوّل التاريخ الهجري إلى ميلادي بالتخمين.
- count_days يكون 1 ما لم يذكر النص عدد أيام صريحًا.
- case_type دائمًا "غياب".
- action دائمًا "متابعة الغياب".
- source ضع فيه مقتطفًا قصيرًا من السطر أو الجزء الذي استخرج منه السجل.
- تجاهل العناوين والتذييلات والإجماليات وأي صف ليس سجل طالب.
- أعد JSON فقط بالشكل: {"records":[{"student_no":"","student_name":"","adate":"","case_type":"غياب","count_days":1,"action":"متابعة الغياب","source":""}]}`;

export const parseAttendanceWithDeepSeek = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(attendanceAiInputSchema)
  .handler(async ({ data, context }) => {
    const apiKey = getServerSetting("DEEPSEEK_API_KEY", context);
    if (!apiKey) throw new Error("لم يتم إعداد مفتاح DeepSeek في متغيرات البيئة.");

    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: getServerSetting("DEEPSEEK_MODEL", context) || "deepseek-chat",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: ATTENDANCE_AI_SYSTEM_PROMPT },
          { role: "user", content: data.text },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403)
        throw new Error("مفتاح DeepSeek غير صحيح أو غير متاح للخدمة.");
      if (response.status === 402)
        throw new Error("حساب DeepSeek لا يملك رصيدًا كافيًا لاستخدام الخدمة.");
      if (response.status === 429)
        throw new Error("تم تجاوز حد طلبات DeepSeek مؤقتًا. حاول بعد قليل.");
      throw new Error("تعذّر الاتصال بخدمة DeepSeek لتحليل كشف الغياب.");
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };
    const raw = payload.choices?.[0]?.message?.content?.trim();
    if (!raw) throw new Error("لم تُرجع خدمة DeepSeek بيانات قابلة للقراءة.");

    try {
      const parsed = JSON.parse(
        raw.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, ""),
      );
      return attendanceAiOutputSchema.parse(parsed);
    } catch {
      throw new Error("تعذّر تفسير بيانات الغياب المستخرجة من DeepSeek.");
    }
  });
