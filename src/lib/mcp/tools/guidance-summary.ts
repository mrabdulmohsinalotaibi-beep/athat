import { defineTool } from "@lovable.dev/mcp-js";

import { supabaseForUser } from "../supabase";

const TABLES = [
  { table: "students", label: "الطلاب" },
  { table: "counseling_cases", label: "الحالات الإرشادية" },
  { table: "interviews", label: "المقابلات" },
  { table: "referrals", label: "الإحالات" },
  { table: "programs", label: "البرامج" },
  { table: "plan_tasks", label: "مهام الخطة" },
  { table: "evidences", label: "الشواهد" },
] as const;

export default defineTool({
  name: "guidance_summary",
  title: "ملخص سجلات التوجيه",
  description: "Return record counts across the signed-in counselor's records plus open counseling cases.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_args, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);

    const counts: Record<string, number> = {};
    for (const { table, label } of TABLES) {
      const { count, error } = await supabase.from(table).select("id", { count: "exact", head: true });
      if (error) return { content: [{ type: "text", text: error.message }], isError: true };
      counts[label] = count ?? 0;
    }

    const { data: openCases, error: openError } = await supabase
      .from("counseling_cases")
      .select("case_no, student_name, priority, followup_at")
      .neq("case_status", "مغلقة")
      .order("followup_at", { ascending: true })
      .limit(10);
    if (openError) return { content: [{ type: "text", text: openError.message }], isError: true };

    const lines = Object.entries(counts).map(([label, value]) => `${label}: ${value}`);
    return {
      content: [
        {
          type: "text",
          text: `${lines.join("\n")}\n\nحالات مفتوحة (حتى 10):\n${JSON.stringify(openCases ?? [], null, 2)}`,
        },
      ],
      structuredContent: { counts, openCases: openCases ?? [] },
    };
  },
});
