import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_students",
  title: "قائمة الطلاب",
  description: "List or search the signed-in counselor's students by name, grade, or classroom.",
  inputSchema: {
    search: z.string().trim().max(120).optional().describe("Partial student name to search for."),
    grade: z.string().trim().max(40).optional().describe("Filter by grade (الصف)."),
    classroom: z.string().trim().max(40).optional().describe("Filter by classroom (الفصل)."),
    limit: z.number().int().min(1).max(100).default(25),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search, grade, classroom, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    let query = supabaseForUser(ctx)
      .from("students")
      .select("id, student_no, full_name, stage, grade, classroom, guardian_name, status")
      .order("full_name", { ascending: true })
      .limit(limit);
    if (search) query = query.ilike("full_name", `%${search}%`);
    if (grade) query = query.eq("grade", grade);
    if (classroom) query = query.eq("classroom", classroom);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { students: data ?? [], count: data?.length ?? 0 },
    };
  },
});
