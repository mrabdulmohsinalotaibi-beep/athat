import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_cases",
  title: "قائمة الحالات الإرشادية",
  description: "List the signed-in counselor's counseling cases, optionally filtered by status, domain, or student name.",
  inputSchema: {
    student_name: z.string().trim().max(120).optional(),
    case_status: z.string().trim().max(40).optional().describe("e.g. مفتوحة، قيد المتابعة، مغلقة"),
    domain: z.string().trim().max(40).optional().describe("e.g. سلوكي، أكاديمي، نفسي"),
    limit: z.number().int().min(1).max(100).default(25),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ student_name, case_status, domain, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    let query = supabaseForUser(ctx)
      .from("counseling_cases")
      .select(
        "id, case_no, student_name, domain, case_status, priority, summary, intervention_plan, opened_at, followup_at, next_action",
      )
      .order("created_at", { ascending: false })
      .limit(limit);
    if (student_name) query = query.ilike("student_name", `%${student_name}%`);
    if (case_status) query = query.eq("case_status", case_status);
    if (domain) query = query.eq("domain", domain);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { cases: data ?? [], count: data?.length ?? 0 },
    };
  },
});
