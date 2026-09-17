import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "create_case",
  title: "إنشاء حالة إرشادية",
  description: "Create a new counseling case for the signed-in counselor. The case number is generated automatically.",
  inputSchema: {
    student_name: z.string().trim().min(1).max(120),
    domain: z.string().trim().max(40).optional().describe("e.g. سلوكي، أكاديمي، نفسي"),
    case_status: z.string().trim().max(40).default("مفتوحة"),
    priority: z.string().trim().max(40).optional().describe("منخفضة، متوسطة، عالية"),
    summary: z.string().trim().max(4000).optional(),
    intervention_plan: z.string().trim().max(200).optional(),
    followup_at: z.string().trim().max(10).optional().describe("Follow-up date, YYYY-MM-DD"),
    notes: z.string().trim().max(4000).optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const { data, error } = await supabaseForUser(ctx)
      .from("counseling_cases")
      .insert({ ...input, user_id: ctx.getUserId() })
      .select("id, case_no, student_name, case_status, priority")
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `تم إنشاء الحالة ${data?.case_no ?? ""} للطالب ${data?.student_name ?? ""}.` }],
      structuredContent: { case: data },
    };
  },
});
