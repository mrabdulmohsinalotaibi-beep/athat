import { supabase } from "@/integrations/supabase/client";

type AiAction = "feedback" | "weekly" | "document" | "import";

export type AiResult = {
  summary?: string;
  category?: string;
  suggestion?: string;
  intro?: string;
  fields?: Record<string, string>;
  mapping?: Record<string, string>;
  warnings?: string[] | string;
};

export async function requestAi(action: AiAction, payload: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("ai-assist", {
    body: { action, payload },
  });
  if (error) throw error;
  if (data?.error) throw new Error(String(data.error));
  return (data ?? {}) as AiResult;
}

export function aiErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "تعذّر الاتصال بالمساعد الذكي.";
  if (message.includes("مفتاح DeepSeek")) return "أضف DEEPSEEK_API_KEY في أسرار Supabase أولاً.";
  return message;
}
