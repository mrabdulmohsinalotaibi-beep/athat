import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey)
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY غير مضاف في أسرار Supabase" }), {
        status: 503,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    const body = await request.json();
    const text = String(body.text ?? "").slice(0, 7000);
    const action =
      body.action === "weekly" ? "اكتب نصًا إرشاديًا أسبوعيًا" : "لخّص الرسالة وصنّفها";
    const prompt = `${action} باللغة العربية الرسمية المناسبة للمدرسة. أعد JSON فقط بالمفاتيح: summary, category, suggestion. النص: ${text}`;
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.35 },
        }),
      },
    );
    const result = await response.json();
    if (!response.ok)
      return new Response(JSON.stringify({ error: "فشل اتصال Gemini" }), {
        status: 502,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    const raw = result?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { summary: raw, category: "عام", suggestion: "" };
    }
    return new Response(JSON.stringify(parsed), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "تعذّرت معالجة الطلب" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
