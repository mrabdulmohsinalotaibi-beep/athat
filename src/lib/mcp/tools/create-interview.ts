import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "create_interview",
  title: "تسجيل مقابلة",
  description: "Record a new interview or contact (student, guardian, or teacher) for the signed-in counselor.",
  inputSchema: {
    student_name: z.string().trim().max(120).optional(),
    idate: z.string().trim().max(10).optional().describe("Interview date, YYYY-MM-DD"),
    itype: z.string().trim().max(40).default("مقابلة فردية"),
    participant: z.string().trim().max(120).optional(),
    channel: z.string().trim().max(40).optional().describe("e.g. مقابلة، اتصال هاتفي، واتساب"),
    topic: z.string().trim().max(200).optional(),
    result: z.string().trim().max(4000).optional(),
    recommendations: z.string().trim().max(4000).optional(),
    followup_at: z.string().trim().max(10).optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const { data, error } = await supabaseForUser(ctx)
      .from("interviews")
      .insert({ ...input, user_id: ctx.getUserId() })
      .select("id, idate, itype, student_name, topic")
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `تم تسجيل المقابلة بتاريخ ${data?.idate ?? "غير محدد"}.` }],
      structuredContent: { interview: data },
    };
  },
});
