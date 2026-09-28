import { useMemo, useState } from "react";
import {
  Download,
  FileText,
  HeartHandshake,
  MessageSquareText,
  PhoneCall,
  Search,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ElectronicTemplateDialog } from "@/components/ElectronicTemplateDialog";

const QUICK_TEMPLATES = [
  {
    id: "interview",
    title: "خطة مقابلة إرشادية",
    description: "هيكل مختصر لإدارة المقابلة وتوثيق الإجراء القادم.",
    icon: HeartHandshake,
    to: "/interviews",
    content: [
      "موضوع المقابلة:",
      "الهدف الإرشادي:",
      "أبرز الملاحظات:",
      "الإجراء المتفق عليه:",
      "موعد المتابعة:",
    ].join("\n"),
  },
  {
    id: "parent-message",
    title: "رسالة متابعة ولي أمر",
    description: "صياغة مهنية قابلة للتخصيص قبل الإرسال.",
    icon: PhoneCall,
    to: "/messages",
    content: [
      "السلام عليكم ورحمة الله وبركاته،",
      "نود إشعاركم بأنه تمت متابعة ابنكم/ابنتكم بشأن الموضوع محل الاهتمام، ونأمل تعاونكم في تنفيذ التوصيات التالية:",
      "",
      "التوصيات:",
      "موعد المتابعة القادم:",
      "شاكرين لكم تعاونكم.",
    ].join("\n"),
  },
  {
    id: "counseling-action",
    title: "محضر إجراء إرشادي",
    description: "قالب لتوثيق الإجراء والنتيجة والشاهد المرتبط.",
    icon: FileText,
    to: "/evidences",
    content: [
      "التاريخ:",
      "اسم الطالب/الفئة:",
      "نوع الإجراء:",
      "الجهة المشاركة:",
      "النتيجة:",
      "الشاهد أو المرفق:",
      "ملاحظات:",
    ].join("\n"),
  },
  {
    id: "preventive-activity",
    title: "خطة نشاط وقائي",
    description: "عناصر جاهزة لبناء برنامج توعوي قابل للقياس.",
    icon: Sparkles,
    to: "/programs",
    content: [
      "اسم النشاط:",
      "الفئة المستهدفة:",
      "الهدف:",
      "محاور التنفيذ:",
      "مؤشر النجاح:",
      "الشواهد المطلوبة:",
      "تاريخ التنفيذ:",
    ].join("\n"),
  },
];

const FORM_CATEGORIES = [
  { id: "all", label: "الكل" },
  { id: "students", label: "بيانات الطلاب" },
  { id: "cases", label: "المقابلات والحالات" },
  { id: "attendance", label: "السلوك والمواظبة" },
  { id: "reports", label: "البرامج والتقارير" },
  { id: "committees", label: "اللجان والمحاضر" },
] as const;

type FormCategory = Exclude<(typeof FORM_CATEGORIES)[number]["id"], "all">;
type FormCategoryFilter = FormCategory | "all";

const CATEGORY_LABELS: Record<FormCategory, string> = {
  students: "بيانات الطلاب",
  cases: "المقابلات والحالات",
  attendance: "السلوك والمواظبة",
  reports: "البرامج والتقارير",
  committees: "اللجان والمحاضر",
};

const ELECTRONIC_FIELDS: Record<
  string,
  { label: string; multiline?: boolean; placeholder?: string }[]
> = {
  "behavioral-contract": [
    { label: "اسم الطالب / الصف" },
    { label: "السلوك المستهدف ووصفه بموضوعية", multiline: true },
    { label: "الهدف السلوكي البديل ومؤشر قياسه", multiline: true },
    { label: "التزام الطالب", multiline: true },
    { label: "دعم المدرسة والموجه", multiline: true },
    { label: "دور ولي الأمر", multiline: true },
    { label: "مدة الاتفاق وموعد المراجعة" },
    { label: "توقيع الطالب وولي الأمر والموجه", multiline: true },
  ],
  "guidance-observation": [
    { label: "اسم الطالب / الصف" },
    { label: "تاريخ الملاحظة", placeholder: "اليوم / الشهر / السنة" },
    { label: "مصدر الملاحظة" },
    { label: "وصف موضوعي للملاحظة", multiline: true },
    { label: "الإجراء المقترح والمتابعة", multiline: true },
  ],
  "guidance-interview": [
    { label: "اسم الطالب" },
    { label: "تاريخ المقابلة" },
    { label: "موضوع المقابلة" },
    { label: "أبرز الملاحظات والنتيجة", multiline: true },
    { label: "التوصيات وموعد المتابعة", multiline: true },
  ],
  "case-follow-up-schedule": [
    { label: "رقم الحالة" },
    { label: "اسم الطالب" },
    { label: "هدف المتابعة" },
    { label: "الخطوات والمواعيد", multiline: true },
    { label: "نتيجة المتابعة القادمة", multiline: true },
  ],
  "guidance-committee-minutes": [
    { label: "تاريخ الاجتماع" },
    { label: "الحضور" },
    { label: "موضوعات الاجتماع", multiline: true },
    { label: "القرارات والتوصيات", multiline: true },
    { label: "مسؤول التنفيذ وموعده" },
  ],
};

const DOWNLOADABLE_FORMS: {
  id: string;
  title: string;
  description: string;
  category: FormCategory;
  file?: string;
}[] = [
  {
    id: "guidance-observation",
    title: "استمارة الملاحظة الإرشادية",
    description: "لتسجيل ملاحظات الحالة وما يتطلبه التدخل الإرشادي.",
    category: "cases",
    file: "guidance-observation.docx",
  },
  {
    id: "guidance-interview",
    title: "استمارة مقابلة إرشادية",
    description: "لتوثيق بيانات المقابلة وأهدافها وملاحظاتها وخلاصتها.",
    category: "cases",
    file: "guidance-interview.docx",
  },
  {
    id: "first-grade-observation",
    title: "ملاحظة الطالب المستجد بالصف الأول",
    description: "نموذج متابعة ميدانية للطالب المستجد خلال الأسابيع الأولى.",
    category: "students",
    file: "first-grade-observation.docx",
  },
  {
    id: "behavioral-contract",
    title: "عقد التعاون السلوكي",
    description: "اتفاق إلكتروني يحدد السلوك المستهدف، مسؤوليات الطالب والأسرة والمدرسة، وموعد المراجعة.",
    category: "cases",
  },
  {
    id: "case-follow-up-schedule",
    title: "الجدول الزمني لمتابعة الحالات",
    description: "لتنظيم المواعيد والخطوات المتتابعة في متابعة الحالات.",
    category: "cases",
    file: "case-follow-up-schedule.docx",
  },
  {
    id: "exam-period-services",
    title: "تقرير الخدمات خلال فترة الاختبارات",
    description: "لتوثيق الخدمات الإرشادية المقدمة أثناء الاختبارات.",
    category: "reports",
    file: "exam-period-services.docx",
  },
  {
    id: "international-days-report",
    title: "تقرير تنفيذ الأيام العالمية",
    description: "لتوثيق الإعداد والتنفيذ والشواهد والنتائج.",
    category: "reports",
    file: "international-days-report.docx",
  },
  {
    id: "group-guidance-log",
    title: "تقرير توثيق التوجيه الجمعي",
    description: "نموذج فارغ لتسجيل بيانات الجلسة ومحاورها وملاحظاتها.",
    category: "reports",
    file: "group-guidance-log.docx",
  },
  {
    id: "group-guidance-example",
    title: "نموذج توضيحي للتوجيه الجمعي",
    description: "مثال إرشادي منقح يوضح طريقة تعبئة تقرير الجلسة.",
    category: "reports",
    file: "group-guidance-example.docx",
  },
  {
    id: "teacher-feedback",
    title: "إفادة المعلم عن مستوى الطلاب",
    description: "لجمع ملاحظات المعلم حول مستوى الطلاب واحتياجاتهم.",
    category: "students",
    file: "teacher-feedback.docx",
  },
  {
    id: "homework-follow-up",
    title: "متابعة مذكرة الواجبات",
    description: "لمتابعة الواجبات المنزلية والتواصل بشأنها.",
    category: "attendance",
    file: "homework-follow-up.docx",
  },
  {
    id: "guidance-committee-minutes",
    title: "محضر لجنة التوجيه والإرشاد",
    description: "لتوثيق موضوعات الاجتماع والتوصيات ومستوى التنفيذ.",
    category: "committees",
    file: "guidance-committee-minutes.docx",
  },
  {
    id: "student-information",
    title: "حصر معلومات الطالب",
    description: "نموذج لجمع المعلومات الأساسية والاجتماعية والتعليمية.",
    category: "students",
    file: "student-information.docx",
  },
  {
    id: "attendance-referral",
    title: "تحويل بسبب التأخر أو الغياب",
    description: "لتوثيق الإحالة والإجراءات المرتبطة بالمواظبة.",
    category: "attendance",
    file: "attendance-referral.docx",
  },
  {
    id: "phone-contact",
    title: "نموذج تواصل هاتفي",
    description: "لتسجيل موضوع الاتصال وملخصه وما تم الاتفاق عليه.",
    category: "cases",
    file: "phone-contact.docx",
  },
  {
    id: "guidance-service",
    title: "خدمة إرشادية مقدمة للطالب",
    description: "لتوثيق نوع الخدمة والإجراء والنتيجة والمتابعة.",
    category: "cases",
    file: "guidance-service.docx",
  },
  {
    id: "phone-discussion",
    title: "مداولات عبر الهاتف",
    description: "نموذج فارغ لتوثيق المداولات والقرارات الهاتفية.",
    category: "cases",
    file: "phone-discussion.docx",
  },
  {
    id: "school-stakeholder-interview",
    title: "مقابلة ذوي العلاقة بالمدرسة",
    description: "لتسجيل المقابلات مع الأطراف المعنية ومتابعة التوصيات.",
    category: "cases",
    file: "school-stakeholder-interview.docx",
  },
  {
    id: "parent-interview",
    title: "مقابلة ولي أمر الطالب",
    description: "لتوثيق موضوع المقابلة والتوصيات وخطة المتابعة.",
    category: "cases",
    file: "parent-interview.docx",
  },
];

export function GuidanceTemplates() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<FormCategoryFilter>("all");
  const [electronic, setElectronic] = useState<(typeof DOWNLOADABLE_FORMS)[number] | null>(null);

  const filteredForms = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return DOWNLOADABLE_FORMS.filter((item) => {
      const matchesCategory = category === "all" || item.category === category;
      const searchableText =
        `${item.title} ${item.description} ${CATEGORY_LABELS[item.category]}`.toLocaleLowerCase();
      return matchesCategory && (!query || searchableText.includes(query));
    });
  }, [category, search]);

  async function copy(content: string) {
    try {
      await navigator.clipboard.writeText(content);
      toast.success("تم نسخ القالب، ويمكنك تخصيصه في السجل المناسب");
    } catch {
      toast.error("تعذّر نسخ القالب من المتصفح");
    }
  }

  return (
    <section
      dir="rtl"
      className="dashboard-panel rounded-3xl border border-primary/12 bg-card p-5 shadow-sm sm:p-6"
    >
      <div className="mb-6 flex items-start gap-3">
        <div className="rounded-2xl bg-primary/10 p-3 text-primary">
          <MessageSquareText className="size-5" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-base font-black">مكتبة القوالب الإرشادية</h2>
          <p className="mt-1 text-xs leading-6 text-muted-foreground">
            {QUICK_TEMPLATES.length} قوالب سريعة و{DOWNLOADABLE_FORMS.length} نموذجًا إلكترونيًا للتعبئة والمراجعة داخل المنصة.
          </p>
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-extrabold">قوالب سريعة</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {QUICK_TEMPLATES.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                data-testid={`card-quick-template-${item.id}`}
                className="group rounded-2xl border bg-background/60 p-4 transition hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-sm"
              >
                <div className="flex items-center gap-2 text-primary">
                  <Icon className="size-4" aria-hidden="true" />
                  <h4 className="text-xs font-black text-foreground">{item.title}</h4>
                </div>
                <p className="mt-2 min-h-10 text-[11px] leading-5 text-muted-foreground">
                  {item.description}
                </p>
                <div className="mt-3 flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 flex-1 text-[10px]"
                    data-testid={`button-copy-template-${item.id}`}
                    onClick={() => void copy(item.content)}
                  >
                    نسخ القالب
                  </Button>
                  <Button asChild type="button" size="sm" className="h-8 px-2 text-[10px]">
                    <Link to={item.to as never} data-testid={`link-open-template-${item.id}`}>
                      فتح
                    </Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-7 border-t border-border/60 pt-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-sm font-extrabold">نماذج قابلة للتنزيل</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              افتح النموذج داخل المنصة واملأه إلكترونيًا وراجعه قبل الاعتماد.
            </p>
          </div>
          <span
            className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary"
            data-testid="text-template-count"
          >
            {filteredForms.length} من {DOWNLOADABLE_FORMS.length} نموذجًا
          </span>
        </div>

        <div className="mb-4 grid gap-3">
          <div className="relative">
            <Search
              className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ابحث في النماذج..."
              aria-label="ابحث في النماذج القابلة للتنزيل"
              data-testid="input-template-search"
              className="h-10 pr-9 text-sm"
            />
          </div>

          <div className="flex flex-wrap gap-2" aria-label="تصنيف النماذج">
            {FORM_CATEGORIES.map((item) => {
              const itemCount =
                item.id === "all"
                  ? DOWNLOADABLE_FORMS.length
                  : DOWNLOADABLE_FORMS.filter((form) => form.category === item.id).length;
              const isSelected = category === item.id;
              return (
                <Button
                  key={item.id}
                  type="button"
                  size="sm"
                  variant={isSelected ? "default" : "outline"}
                  aria-pressed={isSelected}
                  data-testid={`button-filter-templates-${item.id}`}
                  onClick={() => setCategory(item.id)}
                  className="h-8 text-[11px]"
                >
                  {item.label} ({itemCount})
                </Button>
              );
            })}
          </div>
        </div>

        {filteredForms.length === 0 ? (
          <div
            className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground"
            data-testid="text-template-empty-state"
          >
            لا توجد نماذج تطابق البحث. جرّب كلمة أو تصنيفًا آخر.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filteredForms.map((item) => (
              <article
                key={item.id}
                data-testid={`card-downloadable-template-${item.id}`}
                className="flex flex-col rounded-2xl border bg-background/60 p-4 transition hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-sm"
              >
                <div className="flex items-start gap-2">
                  <div className="rounded-xl bg-primary/10 p-2 text-primary">
                    <FileText className="size-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-black leading-5 text-foreground">{item.title}</h4>
                    <span className="mt-1 inline-block rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      {CATEGORY_LABELS[item.category]}
                    </span>
                  </div>
                </div>
                <p className="mt-3 min-h-10 flex-1 text-[11px] leading-5 text-muted-foreground">
                  {item.description}
                </p>
                <div className={"mt-3 grid gap-2 " + (item.file ? "grid-cols-[1fr_auto]" : "grid-cols-1")}>
                  <Button
                    type="button"
                    size="sm"
                    className="h-9 text-xs"
                    onClick={() => setElectronic(item)}
                    data-testid={`button-open-electronic-template-${item.id}`}
                  >
                    فتح إلكتروني
                  </Button>
                  {item.file && (
                  <Button
                    asChild
                    type="button"
                    size="icon"
                    variant="outline"
                    className="size-9"
                    title={`تنزيل ${item.title}`}
                  >
                    <a
                      href={`${import.meta.env.BASE_URL}guidance-templates/${item.file}`}
                      download={item.file}
                      aria-label={`تنزيل ${item.title}`}
                      data-testid={`link-download-template-${item.id}`}
                    >
                      <Download className="size-4" aria-hidden="true" />
                    </a>
                  </Button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}

        <p className="mt-4 rounded-xl bg-primary/5 p-3 text-[11px] leading-5 text-muted-foreground">
          النماذج الإلكترونية مناسبة للتعبئة والمراجعة الفورية. وللحفظ والمتابعة الدائمة استخدم السجل
          المتخصص في لوحة الموجه.
        </p>
      </div>
      {electronic && (
        <ElectronicTemplateDialog
          open={electronic !== null}
          onOpenChange={(open) => !open && setElectronic(null)}
          title={electronic.title}
          description={electronic.description}
          fields={
            ELECTRONIC_FIELDS[electronic.id] ?? [
              { label: "بيانات النموذج", multiline: true },
              { label: "الإجراء والتوصيات", multiline: true },
            ]
          }
        />
      )}
    </section>
  );
}
