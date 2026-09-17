import { auth, defineMcp } from "@lovable.dev/mcp-js";

import createCaseTool from "./tools/create-case";
import createInterviewTool from "./tools/create-interview";
import guidanceSummaryTool from "./tools/guidance-summary";
import listCasesTool from "./tools/list-cases";
import listInterviewsTool from "./tools/list-interviews";
import listStudentsTool from "./tools/list-students";

const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "my-app-mcp",
  title: "مكتب التوجيه الطلابي",
  version: "0.1.0",
  instructions:
    "أدوات منصة الذات للموجه الطلابي. استخدم list_students للبحث عن الطلاب، list_cases و create_case للحالات الإرشادية، list_interviews و create_interview للمقابلات، و guidance_summary لملخص السجلات. كل الأدوات تعمل ضمن بيانات الموجه الذي سجّل الدخول فقط.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listStudentsTool,
    listCasesTool,
    createCaseTool,
    listInterviewsTool,
    createInterviewTool,
    guidanceSummaryTool,
  ],
});
