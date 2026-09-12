import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface NoorStudentPayload {
  full_name: string;
  national_id: string;
  nationality?: string | null;
  grade?: string | null;
  classroom?: string | null;
  guardian_name?: string | null;
  guardian_phone?: string | null;
}

export interface NoorImportResult {
  mode: "live" | "sandbox";
  fetched: number;
  inserted: number;
  skipped: { name: string; reason: string }[];
  message: string;
}

const GRADES = ["الأول المتوسط", "الثاني المتوسط", "الثالث المتوسط"];
const CLASSROOMS = ["أ", "ب", "ج"];
const NATIONALITIES = ["سعودي", "سعودي", "سعودي", "يمني", "مصري"];
const FIRST = ["عبدالله", "محمد", "فهد", "سلمان", "تركي", "ريان", "خالد", "نايف", "بدر", "ماجد"];
const FAMILY = ["القحطاني", "الغامدي", "العتيبي", "الشهري", "الحربي", "الزهراني", "الدوسري", "المالكي"];

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length] as T;
}

function sandboxStudents(count: number): NoorStudentPayload[] {
  return Array.from({ length: count }, (_, i) => {
    const name = `${pick(FIRST, i)} ${pick(FAMILY, i + 3)} ${pick(FAMILY, i + 5)}`;
    return {
      full_name: name,
      national_id: String(1080000000 + i * 137 + 11),
      nationality: pick(NATIONALITIES, i),
      grade: pick(GRADES, i),
      classroom: pick(CLASSROOMS, i),
      guardian_name: `${pick(FIRST, i + 2)} ${pick(FAMILY, i + 3)}`,
      guardian_phone: `05${String(50000000 + i * 4321).slice(0, 8)}`,
    };
  });
}

function cleanDigits(value: unknown): string {
  return String(value ?? "")
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/\D/g, "");
}

/**
 * نقطة النهاية «import-noor-students»:
 * - إن تم ضبط خدمة أتمتة خارجية (NOOR_AUTOMATION_URL) تُمرَّر لها بيانات الدخول لجلب كشف الطلاب.
 * - وإلا يعمل النظام في وضع المحاكاة (Sandbox) لعرض تجربة الربط كاملة.
 */
export const importNoorStudents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { username: string; password: string; otp?: string }) => {
    if (!input?.username?.trim()) throw new Error("اسم المستخدم في نظام نور مطلوب");
    if (!input?.password?.trim()) throw new Error("كلمة المرور مطلوبة");
    return input;
  })
  .handler(async ({ data, context }): Promise<NoorImportResult> => {
    const endpoint = process.env["NOOR_AUTOMATION_URL"];
    let students: NoorStudentPayload[] = [];
    let mode: "live" | "sandbox" = "sandbox";

    if (endpoint) {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(process.env["NOOR_AUTOMATION_TOKEN"]
            ? { authorization: `Bearer ${process.env["NOOR_AUTOMATION_TOKEN"]}` }
            : {}),
        },
        body: JSON.stringify({ username: data.username, password: data.password, otp: data.otp ?? "" }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`تعذّر الاتصال بخدمة نور: ${res.status} ${text.slice(0, 160)}`);
      }
      const body = (await res.json()) as { students?: NoorStudentPayload[] };
      students = body.students ?? [];
      mode = "live";
    } else {
      await new Promise((r) => setTimeout(r, 600));
      students = sandboxStudents(12);
    }

    const { supabase, userId } = context;
    const { data: existing } = await supabase.from("students").select("national_id");
    const known = new Set((existing ?? []).map((s) => cleanDigits(s.national_id)).filter(Boolean));

    const skipped: { name: string; reason: string }[] = [];
    const payloads = [];

    for (const s of students) {
      const name = String(s.full_name ?? "").trim();
      const id = cleanDigits(s.national_id);
      if (!name) {
        skipped.push({ name: "—", reason: "اسم الطالب مفقود" });
        continue;
      }
      if (!id || id.length < 8) {
        skipped.push({ name, reason: "رقم هوية مفقود أو غير صالح" });
        continue;
      }
      if (known.has(id)) {
        skipped.push({ name, reason: "رقم الهوية موجود مسبقاً" });
        continue;
      }
      known.add(id);
      payloads.push({
        user_id: userId,
        full_name: name,
        national_id: id,
        student_no: id,
        nationality: s.nationality ?? null,
        grade: s.grade ?? null,
        classroom: s.classroom ?? null,
        guardian_name: s.guardian_name ?? null,
        guardian_phone: s.guardian_phone ? cleanDigits(s.guardian_phone) : null,
        status: "نشط",
      });
    }

    let inserted = 0;
    for (let i = 0; i < payloads.length; i += 200) {
      const chunk = payloads.slice(i, i + 200);
      const { error } = await supabase.from("students").insert(chunk);
      if (error) throw new Error(`تعذّر حفظ البيانات: ${error.message}`);
      inserted += chunk.length;
    }

    return {
      mode,
      fetched: students.length,
      inserted,
      skipped,
      message:
        mode === "sandbox"
          ? "تم تشغيل الربط في وضع المحاكاة (بيانات تجريبية) لعدم توفر خادم أتمتة نور."
          : "تمت المزامنة مع نظام نور بنجاح.",
    };
  });
