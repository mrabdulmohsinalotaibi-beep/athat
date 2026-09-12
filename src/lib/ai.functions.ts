import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const DraftInput = z.object({
  recordKey: z.enum(["cases", "interviews", "behavior", "reports"]),
  notes: z.string().trim().min(3).max(4000),
  context: z.record(z.string(), z.string().max(1000)).default({}),
});

const outputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "problemDescription", "causes", "goals", "actions", "interventionPlan", "recommendations", "result", "notes", "nextAction"],
  properties: {
    summary: { type: "string" },
    problemDescription: { type: "string" },
    causes: { type: "string" },
    goals: { type: "string" },
    actions: { type: "string" },
    interventionPlan: { type: "string" },
    recommendations: { type: "string" },
    result: { type: "string" },
    notes: { type: "string" },
    nextAction: { type: "string" },
  },
} as const;

export type GuidanceDraft = {
  summary: string;
  problemDescription: string;
  causes: string;
  goals: string;
  actions: string;
  interventionPlan: string;
  recommendations: string;
  result: string;
  notes: string;
  nextAction: string;
};

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

async function streamDraft(apiKey: string, prompt: string) {
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
          format: {
            type: "json_schema",
            name: "guidance_report",
            strict: true,
            schema: outputSchema,
          },
        },
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      const message = readGatewayMessage(body, "تعذّر توليد الصياغة الذكية.");
      if ((response.status === 429 || response.status >= 500) && attempt < 2) {
        const retryAfter = Number(response.headers.get("Retry-After") || 0);
        await wait(Math.max(retryAfter * 1000, 700 * 2 ** attempt));
        continue;
      }
      if (response.status === 401) throw new Error("خدمة الذكاء الاصطناعي غير مهيأة حالياً.");
      if (response.status === 402) throw new Error(message || "الرصيد المخصص للذكاء الاصطناعي غير كافٍ.");
      if (response.status === 403) throw new Error(message || "خدمة الذكاء الاصطناعي متوقفة وفق سياسة مساحة العمل.");
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
          // Ignore non-JSON stream keepalive events.
        }
      }
    }
    if (!output.trim()) throw new Error("اكتملت المعالجة دون نص قابل للاستخدام. حاول بصياغة ملاحظات أوضح.");
    return output;
  }
  throw new Error("تعذّر توليد الصياغة بعد عدة محاولات.");
}

export const draftGuidanceReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => DraftInput.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("خدمة الذكاء الاصطناعي غير مهيأة حالياً.");

    const safeContext = Object.entries(data.context)
      .filter(([key, value]) => value.trim() && !["national_id", "guardian_phone"].includes(key))
      .map(([key, value]) => `${key}: ${value.trim()}`)
      .join("\n");
    const prompt = `أنت مساعد مهني للموجه الطلابي في مدارس المملكة العربية السعودية.
صغ مسودة تربوية رصينة ومحايدة باللغة العربية، دون تشخيص طبي أو ادعاء حقائق غير مذكورة.
لا تذكر أرقام الهوية أو الجوال، ولا تضف أسماء أشخاص لم ترد في المدخلات.
يجب أن تكون الصياغة عملية، تحفظ خصوصية الطالب، وتشمل وصف المشكلة والأسباب المحتملة بصياغة غير جازمة والأهداف والإجراءات وخطة التدخل والنتائج والتوصيات والمتابعة والملخص.
نوع السجل: ${data.recordKey}
السياق المتاح:\n${safeContext || "لا يوجد"}
ملاحظات الموجه السريعة:\n${data.notes}
أعد JSON مطابقاً للمخطط فقط، واجعل كل قسم موجزاً وقابلاً للتعديل.`;

    const raw = await streamDraft(apiKey, prompt);
    try {
      return JSON.parse(raw) as GuidanceDraft;
    } catch {
      throw new Error("تعذّر قراءة الصياغة الناتجة. حاول مرة أخرى.");
    }
  });