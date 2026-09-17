import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_interviews",
  title: "قائمة المقابلات",
  description: "List the signed-in counselor's interviews and contacts with students, guardians, or teachers.",
  inputSchema: {
    student_name: z.string().trim().max(120).optional(),
    itype: z.string().trim().max(40).optional().describe("e.g. مقابلة فردية، ولي أمر، معلم"),
    limit: z.number().int().min(1).max(100).default(25),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ student_name, itype, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    let query = supabaseForUser(ctx)
      .from("interviews")
      .select("id, idate, itype, student_name, participant, channel, topic, result, recommendations, followup_at")
      .order("idate", { ascending: false })
      .limit(limit);
    if (student_name) query = query.ilike("student_name", `%${student_name}%`);
    if (itype) query = query.eq("itype", itype);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { interviews: data ?? [], count: data?.length ?? 0 },
    };
  },
});
