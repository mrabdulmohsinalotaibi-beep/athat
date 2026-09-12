export type FieldType = "text" | "textarea" | "date" | "number" | "select";

export interface FieldDef {
  name: string;
  label: string;
  type?: FieldType;
  options?: string[];
  list?: boolean; // show in table
}

export interface RecordConfig {
  key: string;
  table: string;
  title: string;
  singular: string;
  fields: FieldDef[];
}

export const DOMAINS = ["وقائي", "إنمائي", "علاجي", "تنظيمي", "أكاديمي", "سلوكي", "اجتماعي", "نفسي", "صحي"];
export const PRIORITIES = ["منخفضة", "متوسطة", "عالية"];
export const EXEC_STATUS = ["لم يبدأ", "قيد التنفيذ", "مكتمل", "مؤجل"];
export const DOC_STATUS = ["ناقص", "قيد المراجعة", "معتمد"];
export const CHANNELS = ["مقابلة", "اتصال هاتفي", "رسالة نصية", "واتساب", "بريد إلكتروني", "زيارة منزلية"];
export const STAGES = ["ابتدائي", "متوسط", "ثانوي"];
export const EVIDENCE_TYPES = ["PDF", "صورة", "تقرير", "كشف حضور", "محضر"];
export const PROGRAM_TYPES = ["وقائي", "إنمائي", "علاجي"];

const notes: FieldDef = { name: "notes", label: "ملاحظات", type: "textarea" };

export const RECORDS: RecordConfig[] = [
  {
    key: "students",
    table: "students",
    title: "سجل الطلاب",
    singular: "طالب",
    fields: [
      { name: "student_no", label: "رقم الطالب", list: true },
      { name: "full_name", label: "اسم الطالب", list: true },
      { name: "national_id", label: "رقم الهوية" },
      { name: "gender", label: "الجنس", type: "select", options: ["ذكر", "أنثى"] },
      { name: "stage", label: "المرحلة", type: "select", options: STAGES, list: true },
      { name: "grade", label: "الصف", list: true },
      { name: "classroom", label: "الفصل", list: true },
      { name: "guardian_name", label: "ولي الأمر" },
      { name: "guardian_phone", label: "جوال ولي الأمر", list: true },
      { name: "address", label: "السكن" },
      { name: "health_status", label: "الحالة الصحية", type: "textarea" },
      { name: "social_status", label: "الحالة الاجتماعية", type: "textarea" },
      { name: "status", label: "الحالة", type: "select", options: ["نشط", "منقول", "منقطع"] },
      notes,
    ],
  },
  {
    key: "cases",
    table: "counseling_cases",
    title: "الحالات الإرشادية",
    singular: "حالة",
    fields: [
      { name: "case_no", label: "رقم الحالة", list: true },
      { name: "student_no", label: "رقم الطالب" },
      { name: "student_name", label: "اسم الطالب", list: true },
      { name: "domain", label: "المجال", type: "select", options: DOMAINS, list: true },
      { name: "referral_source", label: "مصدر الإحالة" },
      { name: "case_status", label: "حالة الحالة", type: "select", options: ["مفتوحة", "قيد المتابعة", "مغلقة"], list: true },
      { name: "priority", label: "الأولوية", type: "select", options: PRIORITIES, list: true },
      { name: "summary", label: "ملخص الحالة", type: "textarea" },
      { name: "intervention_plan", label: "خطة التدخل", type: "textarea" },
      { name: "opened_at", label: "تاريخ الفتح", type: "date" },
      { name: "followup_at", label: "موعد المتابعة", type: "date", list: true },
      { name: "last_followup", label: "آخر متابعة", type: "date" },
      { name: "next_action", label: "الإجراء القادم" },
      { name: "closed_at", label: "تاريخ الإغلاق", type: "date" },
      notes,
    ],
  },
  {
    key: "plan",
    table: "plan_tasks",
    title: "الخطة التشغيلية",
    singular: "مهمة",
    fields: [
      { name: "seq", label: "رقم", list: true },
      { name: "task", label: "المهمة/النشاط", list: true },
      { name: "domain", label: "المجال", type: "select", options: DOMAINS, list: true },
      { name: "target_group", label: "الفئة المستهدفة" },
      { name: "term", label: "الفصل الدراسي" },
      { name: "indicator", label: "المؤشر/المعيار" },
      { name: "exec_status", label: "حالة التنفيذ", type: "select", options: EXEC_STATUS, list: true },
      { name: "doc_status", label: "حالة التوثيق", type: "select", options: DOC_STATUS, list: true },
      { name: "required_evidence", label: "الشواهد المطلوبة" },
      { name: "due_date", label: "تاريخ الاستحقاق", type: "date", list: true },
      { name: "done_date", label: "تاريخ التنفيذ", type: "date" },
      notes,
    ],
  },
  {
    key: "programs",
    table: "programs",
    title: "البرامج والأنشطة",
    singular: "برنامج",
    fields: [
      { name: "program_no", label: "رقم البرنامج", list: true },
      { name: "name", label: "اسم البرنامج", list: true },
      { name: "ptype", label: "النوع", type: "select", options: PROGRAM_TYPES, list: true },
      { name: "domain", label: "المجال", type: "select", options: DOMAINS },
      { name: "target_group", label: "الفئة المستهدفة", list: true },
      { name: "term", label: "الفصل الدراسي" },
      { name: "goal", label: "الهدف", type: "textarea" },
      { name: "indicator", label: "المؤشر" },
      { name: "start_date", label: "تاريخ البداية", type: "date" },
      { name: "end_date", label: "تاريخ النهاية", type: "date" },
      { name: "exec_status", label: "حالة التنفيذ", type: "select", options: EXEC_STATUS, list: true },
      { name: "beneficiaries", label: "عدد المستفيدين", type: "number", list: true },
      { name: "required_evidence", label: "الشواهد المطلوبة" },
      notes,
    ],
  },
  {
    key: "interviews",
    table: "interviews",
    title: "المقابلات والتواصل",
    singular: "مقابلة",
    fields: [
      { name: "seq", label: "رقم السجل" },
      { name: "idate", label: "التاريخ", type: "date", list: true },
      { name: "itype", label: "النوع", type: "select", options: ["مقابلة فردية", "مقابلة جماعية", "ولي أمر", "معلم"], list: true },
      { name: "student_no", label: "رقم الطالب" },
      { name: "student_name", label: "اسم الطالب", list: true },
      { name: "participant", label: "المشارك/ولي الأمر" },
      { name: "channel", label: "وسيلة التواصل", type: "select", options: CHANNELS, list: true },
      { name: "topic", label: "موضوع اللقاء", list: true },
      { name: "result", label: "النتيجة", type: "textarea" },
      { name: "recommendations", label: "التوصيات", type: "textarea" },
      { name: "followup_at", label: "موعد المتابعة", type: "date" },
      { name: "evidence_url", label: "الشاهد/الرابط" },
      notes,
    ],
  },
  {
    key: "attendance",
    table: "attendance",
    title: "الحضور والمواظبة",
    singular: "سجل مواظبة",
    fields: [
      { name: "seq", label: "رقم السجل" },
      { name: "student_no", label: "رقم الطالب" },
      { name: "student_name", label: "اسم الطالب", list: true },
      { name: "adate", label: "التاريخ", type: "date", list: true },
      { name: "case_type", label: "نوع الحالة", type: "select", options: ["غياب", "تأخر", "هروب", "غياب بعذر"], list: true },
      { name: "count_days", label: "عدد الأيام/المرات", type: "number", list: true },
      { name: "action", label: "الإجراء الإرشادي", list: true },
      { name: "guardian_name", label: "ولي الأمر" },
      { name: "evidence_url", label: "الشاهد/الرابط" },
      notes,
    ],
  },
  {
    key: "behavior",
    table: "behavior",
    title: "السلوك والمتابعة",
    singular: "مخالفة",
    fields: [
      { name: "seq", label: "رقم السجل" },
      { name: "student_no", label: "رقم الطالب" },
      { name: "student_name", label: "اسم الطالب", list: true },
      { name: "bdate", label: "التاريخ", type: "date", list: true },
      { name: "observation", label: "الملاحظة/المخالفة", list: true },
      { name: "referral_source", label: "مصدر الإحالة" },
      { name: "action", label: "الإجراء", list: true },
      { name: "result", label: "النتيجة", list: true },
      { name: "followup_at", label: "موعد المتابعة", type: "date" },
      { name: "evidence_url", label: "الشاهد/الرابط" },
      notes,
    ],
  },
  {
    key: "referrals",
    table: "referrals",
    title: "سجل الإحالات",
    singular: "إحالة",
    fields: [
      { name: "referral_no", label: "رقم الإحالة", list: true },
      { name: "student_no", label: "رقم الطالب" },
      { name: "student_name", label: "اسم الطالب", list: true },
      { name: "referral_date", label: "تاريخ الإحالة", type: "date", list: true },
      { name: "referred_to", label: "الجهة المحال إليها", type: "select", options: ["وحدة الخدمات الإرشادية", "إدارة التعليم", "جهة صحية", "جهة أمنية", "جهة مختصة"], list: true },
      { name: "reason", label: "سبب الإحالة", type: "textarea" },
      { name: "attachments", label: "المستندات المرفقة" },
      { name: "status", label: "الحالة", type: "select", options: ["مرسلة", "قيد المتابعة", "منتهية"], list: true },
      { name: "reply_date", label: "تاريخ الرد", type: "date" },
      { name: "result", label: "النتيجة", type: "textarea" },
      notes,
    ],
  },
  {
    key: "committees",
    table: "committees",
    title: "اللجان والاجتماعات",
    singular: "اجتماع",
    fields: [
      { name: "seq", label: "رقم" },
      { name: "mdate", label: "التاريخ", type: "date", list: true },
      { name: "meeting_type", label: "نوع الاجتماع", type: "select", options: ["لجنة التوجيه الطلابي", "لجنة الحالات", "اجتماع أولياء الأمور", "اجتماع المعلمين"], list: true },
      { name: "attendees", label: "الحضور", type: "textarea" },
      { name: "topic", label: "موضوع الاجتماع", list: true },
      { name: "decisions", label: "القرارات والتوصيات", type: "textarea", list: true },
      { name: "responsible", label: "المسؤول" },
      { name: "due_date", label: "موعد التنفيذ", type: "date" },
      { name: "evidence_url", label: "الشاهد/المحضر" },
      notes,
    ],
  },
  {
    key: "evidences",
    table: "evidences",
    title: "الشواهد والتوثيق",
    singular: "شاهد",
    fields: [
      { name: "seq", label: "رقم الشاهد" },
      { name: "name", label: "اسم الشاهد", list: true },
      { name: "etype", label: "نوع الشاهد", type: "select", options: EVIDENCE_TYPES, list: true },
      { name: "linked_type", label: "مرتبط بنوع", type: "select", options: ["برنامج", "حالة", "مقابلة", "اجتماع", "مهمة"], list: true },
      { name: "linked_ref", label: "رقم السجل المرتبط" },
      { name: "edate", label: "تاريخ الشاهد", type: "date", list: true },
      { name: "doc_status", label: "حالة التوثيق", type: "select", options: DOC_STATUS, list: true },
      { name: "file_url", label: "رابط/مسار الملف" },
      { name: "description", label: "وصف الشاهد", type: "textarea" },
      { name: "reviewed_by", label: "تمت المراجعة بواسطة" },
      notes,
    ],
  },
  {
    key: "reports",
    table: "reports",
    title: "سجل التقارير",
    singular: "تقرير",
    fields: [
      { name: "report_no", label: "رقم التقرير", list: true },
      { name: "report_type", label: "نوع التقرير", type: "select", options: ["التقرير الشهري", "تقرير الفصل الدراسي", "التقرير الختامي", "تقرير برنامج"], list: true },
      { name: "period", label: "الفترة", list: true },
      { name: "report_date", label: "تاريخ التقرير", type: "date", list: true },
      { name: "prepared_by", label: "المُعد" },
      { name: "status", label: "الحالة", type: "select", options: ["مسودة", "معتمد", "مرسل"], list: true },
      { name: "file_url", label: "الرابط/الملف" },
      notes,
    ],
  },
  {
    key: "calendar",
    table: "calendar_events",
    title: "التقويم والمتابعة",
    singular: "موعد",
    fields: [
      { name: "seq", label: "رقم" },
      { name: "edate", label: "التاريخ", type: "date", list: true },
      { name: "etime", label: "الوقت", list: true },
      { name: "title", label: "المهمة/الموعد", list: true },
      { name: "etype", label: "النوع", type: "select", options: ["متابعة", "مقابلة", "برنامج", "اجتماع", "تقرير"], list: true },
      { name: "linked_ref", label: "مرتبط بسجل" },
      { name: "priority", label: "الأولوية", type: "select", options: PRIORITIES, list: true },
      { name: "status", label: "حالة الموعد", type: "select", options: ["مجدول", "منفذ", "مؤجل", "ملغي"], list: true },
      notes,
    ],
  },
];

export const recordByKey = (key: string) => RECORDS.find((r) => r.key === key)!;
