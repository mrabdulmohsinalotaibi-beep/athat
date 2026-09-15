export interface KpiInput {
  planTasks: { exec_status?: string | null }[];
  cases: { case_status?: string | null; last_followup?: string | null; followup_at?: string | null }[];
  attendance: { case_type?: string | null; count_days?: number | null }[];
  interviews: { itype?: string | null }[];
  students: { id: string }[];
  schoolDays?: number;
}

export interface Kpi {
  key: string;
  label: string;
  value: number;
  hint: string;
  status?: "success" | "warning" | "info";
}

const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

export function computeKpis(input: KpiInput): Kpi[] {
  const { planTasks, cases, attendance, interviews, students, schoolDays = 20 } = input;

  const planDone = planTasks.filter((t) => t.exec_status === "مكتمل").length;
  const followed = cases.filter((c) => c.last_followup || c.case_status === "مغلقة").length;

  const absences = attendance
    .filter((a) => a.case_type === "غياب" || a.case_type === "هروب")
    .reduce((sum, a) => sum + (Number(a.count_days) || 1), 0);

  const totalPossibleDays = students.length * schoolDays;
  const attendanceRate = totalPossibleDays ? Math.max(0, 100 - Math.round((absences / totalPossibleDays) * 100)) : 0;

  const sessions = interviews.length;
  const guardianContacts = interviews.filter((i) => i.itype === "ولي أمر").length;

  const planPct = pct(planDone, planTasks.length);
  const casesPct = pct(followed, cases.length);
  const guardianPct = pct(guardianContacts, sessions || 1);

  return [
    {
      key: "plan",
      label: "نسبة إنجاز الخطة التشغيلية",
      value: planPct,
      hint: `${planDone} من ${planTasks.length} مهمة`,
      status: planPct >= 80 ? "success" : planPct >= 50 ? "warning" : "info",
    },
    {
      key: "cases",
      label: "نسبة حصر ومتابعة الحالات",
      value: casesPct,
      hint: `${followed} من ${cases.length} حالة`,
      status: casesPct >= 80 ? "success" : "warning",
    },
    {
      key: "attendance",
      label: "متوسط الانضباط والمواظبة",
      value: attendanceRate,
      hint: `${absences} حالة غياب/هروب مرصودة`,
      status: attendanceRate >= 90 ? "success" : attendanceRate >= 75 ? "warning" : "info",
    },
    {
      key: "sessions",
      label: "الجلسات والاستشارات المنفذة",
      value: sessions,
      hint: "إجمالي المقابلات والجلسات",
      status: sessions > 0 ? "success" : "info",
    },
    {
      key: "guardians",
      label: "نسبة الشراكة مع أولياء الأمور",
      value: guardianPct,
      hint: `${guardianContacts} لقاء مع أولياء الأمور`,
      status: guardianPct >= 50 ? "success" : "warning",
    },
  ];
}

export const isPercentKpi = (key: string) => key !== "sessions";

// ==========================================
// 🤖 دالة تحليل الملفات باستخدام DeepSeek API الحقيقي
// ==========================================

export interface ParsedImportResult {
  dataType: "students" | "attendance" | "cases" | "interviews" | "planTasks";
  mappedData: Record<string, any>[];
  confidenceScore: number;
}

/**
 * ترسل محتوى الملف أو رؤوس الأعمدة إلى DeepSeek لتصنيفها وتوزيعها تلقائياً
 */
export async function parseImportedFileWithDeepSeek(fileContentSnippet: string): Promise<ParsedImportResult> {
  const DEEPSEEK_API_KEY = process.env["DEEPSEEK_API_KEY"]; // مفتاح اشتراكك في ديب سيك

  if (!DEEPSEEK_API_KEY) {
    throw new Error("مفتاح DeepSeek API غير موجود في متغيرات البيئة (Environment Variables).");
  }

  const systemPrompt = `
  أنت مساعد ذكي متخصص في تحليل البيانات المدرسية وملفات الإكسيل الخاصة بالتوجيه والإرشاد.
  مهتك هي قراءة النصوص أو عينة الأعمدة المستوردة، وتحديد نوع البيانات من الأنواع التالية حصراً:
  ("students", "attendance", "cases", "interviews", "planTasks")
  ثم إعادة البيانات مطابقة لهياكل النظام بـ JSON نقي حصراً بدون أي نصوص إضافية، بالشكل التالي:
  {
    "dataType": "نوع_البيانات",
    "mappedData": [...],
    "confidenceScore": 0.95
  }
  `;

  try {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat", // أو deepseek-reasoner حسب المتاح في حسابك
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `قم بتحليل وتوزيع هذه البيانات:\n${fileContentSnippet}` },
        ],
        response_format: { type: "json_object" }, // لضمان إرجاع النتائج بصيغة JSON نظيفة
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`خطأ في الاتصال بخادم DeepSeek: ${response.statusText}`);
    }

    const data = await response.json();
    const parsedResult: ParsedImportResult = JSON.parse(data.choices[0].message.content);

    return parsedResult;
  } catch (error) {
    console.error("فشل التحليل الذكي عبر DeepSeek:", error);
    throw error;
  }
}
