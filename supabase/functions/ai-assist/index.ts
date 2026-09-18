import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_INPUT_LENGTH = 12_000;
const SENSITIVE_KEYS =
  /national.?id|student.?no|student.?name|full.?name|guardian.?name|guardian.?phone|participant|attendees|phone|mobile|contact|address|email|هوية|جوال|هاتف|عنوان|بريد|اسم الطالب|ولي الأمر|المشارك|الحضور/i;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

function redactText(value: string) {
  return value
    .replace(/[0-9٠-٩]{8,}/g, "[بيانات رقمية محجوبة]")
    .replace(/\b\+?966?[-\s]?(?:5\d{8}|\d{9,10})\b/g, "[رقم تواصل محجوب]")
    .slice(0, MAX_INPUT_LENGTH);
}

function redactValue(value: unknown, key = ""): unknown {
  if (SENSITIVE_KEYS.test(key)) return "[بيانات حساسة محجوبة]";
  if (typeof value === "string") return redactText(value);
  if (Array.isArray(value)) return value.map((item) => redactValue(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([itemKey, itemValue]) => [
        itemKey,
        redactValue(itemValue, itemKey),
      ]),
    );
  }
  return value;
}

function buildInstruction(action: string, payload: Record<string, unknown>) {
  const common = `أنت مساعد إداري عربي متخصص في التوجيه الطلابي داخل مدرسة. أجب بلغة عربية رسمية واضحة. لا تنشئ تشخيصاً طبياً أو نفسياً أو قانونياً، ولا تكرر أي بيانات حساسة محجوبة. لا تستخدم Markdown. أعد JSON صحيحاً فقط بالمفاتيح المطلوبة.`;

  if (action === "feedback") {
    return `${common}\nالمطلوب: لخّص الرسالة في جملة، صنّفها ضمن (رأي، مقترح، استفسار، طلب مساعدة، شكر، ملاحظة)، وقدّم إجراء متابعة عملياً ومحايداً.\nالمفاتيح: summary, category, suggestion.\nالمدخلات: ${JSON.stringify(payload)}`;
  }
  if (action === "weekly") {
    return `${common}\nالمطلوب: إعداد نص موجز للتوجيه الطلابي الأسبوعي عن الموضوع المعطى.\nالمفاتيح: intro, summary, suggestion.\nالمقصود بـ summary الرسالة الإرشادية الأساسية، وبـ suggestion تذكير ختامي.\nالمدخلات: ${JSON.stringify(payload)}`;
  }
  if (action === "document") {
    return `${common}\nالمطلوب: تحسين مسودة مستند إداري أو إرشادي مع الالتزام بالخانات المسموح تعبئتها فقط. لا تغيّر الحقول المعرفية أو التواريخ ولا تضف حقولاً جديدة.\nالمفاتيح: fields, summary, suggestion. يجب أن يكون fields كائناً من أسماء الحقول النصية المسموح بها وقيم عربية محسنة.\nالمدخلات: ${JSON.stringify(payload)}`;
  }
  if (action === "import") {
    return `${common}\nالمطلوب: مراجعة عناوين ملف الاستيراد فقط، واقتراح الربط بين أسماء الحقول وعناوين الأعمدة المتاحة. لا تستنتج أو تطلب بيانات الأشخاص.\nالمفاتيح: mapping, summary, warnings. يجب أن يكون mapping كائناً من اسم الحقل إلى عنوان موجود حرفياً ضمن headers.\nالمدخلات: ${JSON.stringify(payload)}`;
  }
  return `${common}\nالمفاتيح: summary, suggestion.\nالمدخلات: ${JSON.stringify(payload)}`;
}

serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "الطريقة غير مدعومة" }, 405);

  try {
    const authorization = request.headers.get("Authorization") ?? "";
    const token = authorization.replace(/^Bearer\s+/i, "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!token || !supabaseUrl || !supabaseKey)
      return json({ error: "تعذّر التحقق من جلسة المستخدم" }, 401);

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData.user)
      return json({ error: "يلزم تسجيل الدخول لاستخدام المساعدة الذكية" }, 401);

    const apiKey = Deno.env.get("DEEPSEEK_API_KEY");
    if (!apiKey) return json({ error: "لم تتم إضافة مفتاح DeepSeek في أسرار Supabase بعد" }, 503);

    const rawBody = await request.json();
    const action = ["feedback", "weekly", "document", "import"].includes(String(rawBody.action))
      ? String(rawBody.action)
      : "document";
    const safePayload = redactValue(rawBody.payload ?? rawBody) as Record<string, unknown>;
    const model = Deno.env.get("DEEPSEEK_MODEL") || "deepseek-flash";
    const userId = Deno.env.get("DEEPSEEK_USER_ID");

    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: buildInstruction(action, safePayload) }],
        thinking: { type: "disabled" },
        response_format: { type: "json_object" },
        temperature: 0.25,
        max_tokens: 1200,
        ...(userId ? { user_id: userId } : {}),
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      console.error(
        "DeepSeek request failed",
        response.status,
        result?.error?.message ?? "unknown error",
      );
      return json(
        { error: "تعذّر تنفيذ طلب DeepSeek. راجع المفتاح أو الرصيد أو إعدادات النموذج." },
        502,
      );
    }

    const content = result?.choices?.[0]?.message?.content;
    if (!content) return json({ error: "لم يرجع DeepSeek محتوى صالحاً" }, 502);
    try {
      return json(JSON.parse(content));
    } catch {
      return json({ summary: String(content), suggestion: "راجع النص قبل اعتماده." });
    }
  } catch (error) {
    console.error("ai-assist failure", error);
    return json({ error: "تعذّرت معالجة طلب الذكاء الاصطناعي" }, 500);
  }
});
