export type SchoolRole =
  | "principal"
  | "vice_principal"
  | "counselor"
  | "teacher"
  | "admin_staff"
  | "guard"
  | "observer";

export type SchoolTaskCadence = "مرة واحدة" | "يومية" | "أسبوعية" | "شهرية" | "سنوية";
export type SchoolTaskPriority = "منخفضة" | "متوسطة" | "عالية";

export type SchoolTaskTemplate = {
  key: string;
  role: SchoolRole;
  title: string;
  description: string;
  category: string;
  priority: SchoolTaskPriority;
  cadence: SchoolTaskCadence;
};

/**
 * قوالب تشغيلية استرشادية مبنية على طبيعة الأدوار الوظيفية في المدرسة.
 * تبقى قابلة للتعديل عند الإسناد، ولا تستبدل أي تكليف أو تعميم رسمي خاص بالمدرسة.
 */
export const SCHOOL_TASK_TEMPLATES: SchoolTaskTemplate[] = [
  { key: "principal-daily-school-flow", role: "principal", title: "متابعة سير اليوم الدراسي", description: "مراجعة انتظام بداية اليوم الدراسي وسير الحصص والخدمات المدرسية ومعالجة ما يحتاج تدخلاً إداريًا.", category: "قيادة مدرسية", priority: "عالية", cadence: "يومية" },
  { key: "principal-weekly-plan", role: "principal", title: "مراجعة تقدم خطة المدرسة", description: "مراجعة الأعمال المنفذة والمتأخرة في خطة المدرسة وتحديد الإجراء والمسؤول عن المتابعة.", category: "تخطيط", priority: "عالية", cadence: "أسبوعية" },
  { key: "principal-weekly-committees", role: "principal", title: "متابعة قرارات اللجان وفرق العمل", description: "مراجعة القرارات المفتوحة في مجالس ولجان المدرسة والتأكد من إسنادها ومتابعة تنفيذها.", category: "حوكمة", priority: "متوسطة", cadence: "أسبوعية" },
  { key: "principal-monthly-performance", role: "principal", title: "مراجعة مؤشرات الأداء ونواتج التعلم", description: "مراجعة مؤشرات المدرسة والتحصيل والانضباط والبرامج واتخاذ إجراءات التحسين اللازمة.", category: "أداء مدرسي", priority: "عالية", cadence: "شهرية" },
  { key: "principal-annual-readiness", role: "principal", title: "الاستعداد التشغيلي للعام الدراسي", description: "التحقق من جاهزية الكادر والمرافق والخطط والجداول واللجان قبل بداية العام الدراسي.", category: "استعداد مدرسي", priority: "عالية", cadence: "سنوية" },
  { key: "principal-annual-final-report", role: "principal", title: "التقرير الختامي لأداء المدرسة", description: "تجميع نتائج التنفيذ والمؤشرات والتحديات وفرص التحسين وإقفال أعمال العام.", category: "تقارير", priority: "عالية", cadence: "سنوية" },

  { key: "vice-daily-discipline", role: "vice_principal", title: "متابعة الانضباط وسير الحصص", description: "متابعة انتظام الطلاب والحصص والمناوبات ومعالجة الملاحظات اليومية ورفع ما يتطلب قرارًا.", category: "تشغيل مدرسي", priority: "عالية", cadence: "يومية" },
  { key: "vice-weekly-student-services", role: "vice_principal", title: "مراجعة الخدمات والحالات الطلابية", description: "مراجعة الحالات والإحالات والغياب والخدمات المقدمة للطلاب والتأكد من استكمال إجراءات المتابعة.", category: "شؤون الطلاب", priority: "عالية", cadence: "أسبوعية" },
  { key: "vice-weekly-teaching-followup", role: "vice_principal", title: "متابعة تنفيذ الأعمال التعليمية", description: "مراجعة تقدم الأعمال التعليمية والجداول والتكليفات والصعوبات التي تحتاج دعمًا أو معالجة.", category: "شؤون تعليمية", priority: "متوسطة", cadence: "أسبوعية" },
  { key: "vice-monthly-achievement", role: "vice_principal", title: "تحليل مستوى التحصيل الدراسي", description: "مراجعة نتائج الطلاب وتحديد مواطن التعثر والحاجة للبرامج العلاجية أو الإثرائية.", category: "تحصيل دراسي", priority: "عالية", cadence: "شهرية" },
  { key: "vice-monthly-staff-followup", role: "vice_principal", title: "متابعة تقدم تكليفات الموظفين", description: "مراجعة المهام المسندة للموظفين ونسب الإنجاز وإعادة توزيع الأولويات عند الحاجة.", category: "متابعة إدارية", priority: "متوسطة", cadence: "شهرية" },
  { key: "vice-annual-readiness", role: "vice_principal", title: "مراجعة جاهزية الجداول والمرافق والخدمات", description: "التحقق من اكتمال الجداول والتجهيزات والخدمات المرتبطة بمجال العمل قبل بداية العام.", category: "استعداد مدرسي", priority: "عالية", cadence: "سنوية" },

  { key: "counselor-daily-new-cases", role: "counselor", title: "متابعة الحالات والإحالات الجديدة", description: "مراجعة الحالات والإحالات الواردة وتحديد الأولوية والإجراء الأول وموعد المتابعة.", category: "حالات طلابية", priority: "عالية", cadence: "يومية" },
  { key: "counselor-weekly-attendance-behavior", role: "counselor", title: "مراجعة الغياب والسلوك والحالات ذات الأولوية", description: "تحليل الحالات المتكررة في الغياب أو السلوك وربطها بخطة متابعة إرشادية عند الحاجة.", category: "متابعة طلاب", priority: "عالية", cadence: "أسبوعية" },
  { key: "counselor-weekly-followups", role: "counselor", title: "تنفيذ جلسات المتابعة المجدولة", description: "مراجعة المواعيد القادمة وتنفيذ جلسات المتابعة وتوثيق الإجراء والخطوة التالية.", category: "جلسات إرشادية", priority: "عالية", cadence: "أسبوعية" },
  { key: "counselor-monthly-family-contact", role: "counselor", title: "مراجعة التواصل مع أولياء الأمور", description: "التأكد من استكمال التواصل المطلوب للحالات التي تحتاج شراكة أسرية وتوثيق نتائج التواصل.", category: "شراكة أسرية", priority: "متوسطة", cadence: "شهرية" },
  { key: "counselor-monthly-program-report", role: "counselor", title: "تقرير البرامج والخدمات الإرشادية", description: "تلخيص البرامج والخدمات المنفذة والشواهد ومؤشرات الاستفادة والأعمال التي تحتاج استكمالاً.", category: "تقارير إرشادية", priority: "متوسطة", cadence: "شهرية" },
  { key: "counselor-annual-final-report", role: "counselor", title: "التقرير الختامي للتوجيه الطلابي", description: "إعداد التقرير الختامي للبرامج والخدمات والحالات والمتابعات والمرئيات وفرص التحسين.", category: "تقارير إرشادية", priority: "عالية", cadence: "سنوية" },

  { key: "teacher-daily-preparation", role: "teacher", title: "تحديث التحضير ومتابعة تنفيذ الدروس", description: "التأكد من جاهزية التحضير والمواد التعليمية وتسجيل الملاحظات المرتبطة بتنفيذ الدروس.", category: "تعليم", priority: "عالية", cadence: "يومية" },
  { key: "teacher-daily-student-observations", role: "teacher", title: "رصد الملاحظات الأكاديمية والسلوكية المهمة", description: "تسجيل الملاحظات التي تتطلب متابعة تعليمية أو إحالة للموجه الطلابي وفق الحاجة.", category: "متابعة طلاب", priority: "متوسطة", cadence: "يومية" },
  { key: "teacher-weekly-progress", role: "teacher", title: "مراجعة تقدم الطلاب والتعثر", description: "مراجعة تقدم الطلاب وتحديد من يحتاج دعمًا أو إثراءً أو تواصلاً مع الأسرة.", category: "تحصيل دراسي", priority: "عالية", cadence: "أسبوعية" },
  { key: "teacher-weekly-assignments", role: "teacher", title: "مراجعة التقويم والواجبات والتغذية الراجعة", description: "التحقق من انتظام أدوات التقويم والواجبات وتقديم تغذية راجعة مناسبة للطلاب.", category: "تقويم", priority: "متوسطة", cadence: "أسبوعية" },
  { key: "teacher-monthly-results", role: "teacher", title: "تحليل نتائج التقويم", description: "تحليل نتائج التقويم وتحديد المهارات غير المتقنة والإجراءات العلاجية المناسبة.", category: "تحصيل دراسي", priority: "عالية", cadence: "شهرية" },
  { key: "teacher-annual-closeout", role: "teacher", title: "إقفال أعمال المادة والسجلات", description: "استكمال السجلات والنتائج والوثائق المرتبطة بالمادة قبل إقفال العام الدراسي.", category: "تقارير", priority: "عالية", cadence: "سنوية" },

  { key: "admin-daily-correspondence", role: "admin_staff", title: "تحديث المراسلات والسجلات الإدارية", description: "استلام وفرز وتوثيق المراسلات وتحديث السجلات والملفات المطلوبة خلال يوم العمل.", category: "إدارة مكتبية", priority: "عالية", cadence: "يومية" },
  { key: "admin-daily-attendance", role: "admin_staff", title: "متابعة الحضور والتأخر والغياب", description: "تحديث بيانات الحضور والتأخر والغياب وتنفيذ إجراءات الإبلاغ والتوثيق المطلوبة.", category: "مواظبة", priority: "عالية", cadence: "يومية" },
  { key: "admin-weekly-files", role: "admin_staff", title: "مراجعة اكتمال ملفات الطلاب والموظفين", description: "مراجعة الملفات التي تحتاج وثائق أو تحديثات واستكمال النواقص مع الجهة المعنية.", category: "ملفات وسجلات", priority: "متوسطة", cadence: "أسبوعية" },
  { key: "admin-monthly-reports", role: "admin_staff", title: "إعداد ملخص الأعمال الإدارية", description: "تلخيص الأعمال المنجزة والمراسلات والسجلات والنواقص التي تحتاج متابعة من الإدارة.", category: "تقارير", priority: "متوسطة", cadence: "شهرية" },
  { key: "admin-monthly-assets", role: "admin_staff", title: "مراجعة العهد والتجهيزات", description: "مراجعة حركة العهد والتجهيزات وتسجيل الملاحظات والاحتياجات والصيانة المطلوبة.", category: "عهد وتجهيزات", priority: "متوسطة", cadence: "شهرية" },
  { key: "admin-annual-inventory", role: "admin_staff", title: "الجرد السنوي وتسليم العهد", description: "تنفيذ الجرد السنوي ومطابقة العهد والسجلات واستكمال إجراءات التسليم والاستلام.", category: "عهد وتجهيزات", priority: "عالية", cadence: "سنوية" },

  { key: "guard-daily-gates", role: "guard", title: "متابعة بوابات المدرسة والدخول والخروج", description: "متابعة فتح وإغلاق البوابات وتنظيم الدخول والخروج وفق تعليمات المدرسة.", category: "أمن مدرسي", priority: "عالية", cadence: "يومية" },
  { key: "guard-daily-visitors", role: "guard", title: "تنظيم دخول الزوار والمراجعين", description: "التحقق من تنظيم دخول الزوار وتوجيههم والإبلاغ عن أي حالة غير اعتيادية.", category: "أمن مدرسي", priority: "عالية", cadence: "يومية" },
  { key: "guard-daily-perimeter", role: "guard", title: "رصد الملاحظات الأمنية حول المبنى", description: "رصد الملاحظات المتعلقة بالبوابات ومحيط المدرسة ورفع ما يحتاج معالجة للإدارة.", category: "سلامة", priority: "متوسطة", cadence: "يومية" },
  { key: "guard-weekly-safety", role: "guard", title: "مراجعة ملاحظات الأمن والسلامة", description: "رفع ملخص بالملاحظات المتكررة أو المخاطر الظاهرة في نقاط الدخول ومحيط المدرسة.", category: "سلامة", priority: "متوسطة", cadence: "أسبوعية" },
  { key: "guard-monthly-security-report", role: "guard", title: "تقرير الملاحظات الأمنية", description: "تجميع الملاحظات الأمنية والتشغيلية التي تحتاج متابعة أو صيانة ورفعها للإدارة.", category: "تقارير", priority: "متوسطة", cadence: "شهرية" },
  { key: "guard-annual-procedures", role: "guard", title: "مراجعة إجراءات الدخول والطوارئ", description: "مراجعة تعليمات الدخول والخروج ونقاط التجمع وإجراءات الطوارئ قبل بداية العام.", category: "سلامة", priority: "عالية", cadence: "سنوية" },
];

export function templatesForRole(role?: string | null) {
  if (!role || role === "observer") return [];
  return SCHOOL_TASK_TEMPLATES.filter((template) => template.role === role);
}

export function initialDueDateForCadence(cadence: SchoolTaskCadence) {
  const date = new Date();
  if (cadence === "أسبوعية") date.setDate(date.getDate() + 7);
  if (cadence === "شهرية") date.setMonth(date.getMonth() + 1);
  if (cadence === "سنوية") date.setFullYear(date.getFullYear() + 1);
  return date.toISOString().slice(0, 10);
}
