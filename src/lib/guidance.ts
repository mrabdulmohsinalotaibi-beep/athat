import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export interface GuidanceProfile {
  school_name: string | null;
  education_dept: string | null;
  counselor_name: string | null;
  logo_url: string | null;
  vision: string | null;
  mission: string | null;
  announcement: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  office_hours: string | null;
  requests_enabled: boolean;
}

/** الملف التعريفي العام للتوجيه الطلابي كما يظهر لزوار الموقع (بدون بيانات سرية). */
export function useGuidanceProfile(schoolSlug?: string | null) {
  const slug = schoolSlug?.trim() || null;
  return useQuery({
    queryKey: ["guidance_profile", slug],
    queryFn: async (): Promise<GuidanceProfile | null> => {
      try {
        const { data, error } = await supabase.rpc("get_guidance_profile", { p_slug: slug });
        if (error) {
          console.warn("[public-profile] تعذّر جلب الملف العام:", error.message);
          return null;
        }
        return (data?.[0] as GuidanceProfile | undefined) ?? null;
      } catch (error) {
        // The public homepage must remain available even when Supabase,
        // browser storage, or the network is temporarily unavailable.
        console.warn(
          "[public-profile] تم تشغيل الصفحة بالبيانات الافتراضية:",
          error instanceof Error ? error.message : error,
        );
        return null;
      }
    },
    staleTime: 1000 * 60 * 10,
    retry: false,
  });
}

export const DEFAULT_VISION =
  "طالب واعٍ بذاته، متوازن نفسياً وسلوكياً، قادر على بناء مستقبله التعليمي والمهني بثقة.";

export const DEFAULT_MISSION =
  "تقديم خدمات توجيه وإرشاد وقائية ونمائية وعلاجية لكل طالب، بالشراكة مع الأسرة والمعلمين، ضمن بيئة مدرسية آمنة تحفظ الخصوصية.";

export const COUNSELOR_DUTIES = [
  "دراسة حالات الطلاب وبناء خطط التدخل ومتابعتها حتى الإغلاق.",
  "تنفيذ البرامج الإرشادية الوقائية والنمائية على مدار العام الدراسي.",
  "متابعة المواظبة والسلوك والتحصيل والتنسيق مع المعلمين وأولياء الأمور.",
  "استقبال الإحالات من المعلمين والبت فيها وفق الإجراءات النظامية.",
  "تقديم الإرشاد المهني والأكاديمي ومساعدة الطالب على اختيار مساره.",
  "حفظ سرية بيانات الطالب وعدم مشاركتها إلا في حدود المصلحة النظامية.",
] as const;

export const STUDENT_GUIDE = [
  "يمكنك طلب مقابلة الموجه الطلابي في أي وقت عبر استمارة طلب الاستشارة الفردية.",
  "كل ما يُذكر في الجلسة سري، ولا يُطلع عليه أحد إلا بموافقتك أو عند وجود خطر على سلامتك.",
  "يمكنك الإبلاغ عن التنمر أو أي مشكلة بشكل سري تماماً ودون ذكر اسمك.",
  "احرص على الحضور في الموعد المتفق عليه، وأخبر الموجه مسبقاً عند تعذّر ذلك.",
] as const;

export interface GuidanceService {
  slug: string;
  title: string;
  summary: string;
  items: readonly string[];
}

export const GUIDANCE_SERVICES: readonly GuidanceService[] = [
  {
    slug: "academic",
    title: "الإرشاد الأكاديمي",
    summary: "رفع التحصيل الدراسي ومعالجة صعوبات التعلم وتنظيم وقت المذاكرة.",
    items: [
      "تشخيص أسباب تدني التحصيل وبناء خطة علاجية.",
      "برامج مهارات المذاكرة والاستعداد للاختبارات.",
      "متابعة الطلاب المتفوقين ورعاية الموهوبين.",
      "التنسيق مع المعلمين حول الحالات الدراسية.",
    ],
  },
  {
    slug: "behavioral",
    title: "الإرشاد السلوكي",
    summary: "تعديل السلوك ومتابعة المواظبة وبناء بيئة مدرسية آمنة.",
    items: [
      "برامج تعديل السلوك وفق قواعد السلوك والمواظبة.",
      "متابعة الغياب والتأخر والتواصل مع الأسرة.",
      "برامج الوقاية من التنمر والعنف المدرسي.",
      "تعزيز السلوك الإيجابي والمبادرات الطلابية.",
    ],
  },
  {
    slug: "career",
    title: "الإرشاد المهني",
    summary: "مساعدة الطالب على اكتشاف ميوله واختيار مساره التعليمي والمهني.",
    items: [
      "مقاييس الميول والقدرات والتعريف بالمسارات.",
      "التعريف بالتخصصات الجامعية وسوق العمل.",
      "لقاءات مع مختصين وزيارات مهنية.",
      "إرشاد طلاب المرحلة الانتقالية في اختيار المسار.",
    ],
  },
  {
    slug: "psychological",
    title: "الإرشاد النفسي",
    summary: "الدعم النفسي للطلاب ومتابعة القلق والضغوط وحالات التدخل.",
    items: [
      "جلسات إرشادية فردية سرية.",
      "برامج إدارة القلق وضغوط الاختبارات.",
      "التدخل في الأزمات والإحالة للجهات المختصة.",
      "برامج الصحة النفسية والتوعية الأسرية.",
    ],
  },
] as const;

export interface GuidanceLeaflet {
  title: string;
  category: "مطوية" | "نشرة";
  summary: string;
  points: readonly string[];
}

export const GUIDANCE_LEAFLETS: readonly GuidanceLeaflet[] = [
  {
    title: "مهارات المذاكرة الفعّالة",
    category: "مطوية",
    summary: "خطوات عملية لتنظيم وقت المذاكرة ورفع التحصيل الدراسي.",
    points: [
      "قسّم وقت المذاكرة إلى فترات قصيرة (٢٥ دقيقة) يفصل بينها راحة قصيرة.",
      "ابدأ بالمادة الأصعب في وقت نشاطك الذهني العالي.",
      "استخدم التلخيص والخرائط الذهنية بدل القراءة المتكررة.",
      "راجع الدرس في نفس اليوم ثم بعد أسبوع لتثبيت المعلومة.",
    ],
  },
  {
    title: "الوقاية من التنمر المدرسي",
    category: "نشرة",
    summary: "تعريف التنمر وأشكاله وطرق الإبلاغ والتعامل معه.",
    points: [
      "التنمر سلوك متكرر يقصد إيذاء الآخر لفظياً أو جسدياً أو إلكترونياً.",
      "لا تقابل التنمر بالصمت؛ الإبلاغ حق نظامي يحميك ويحمي زملاءك.",
      "يمكن الإبلاغ بسرية تامة ودون ذكر الاسم عبر استمارة الإبلاغ السري.",
      "دور الزميل الشاهد مهم: لا تشارك في الإيذاء وأبلغ الموجه فوراً.",
    ],
  },
  {
    title: "التهيئة النفسية للاختبارات",
    category: "نشرة",
    summary: "إرشادات للطالب وولي الأمر قبل الاختبارات وأثناءها.",
    points: [
      "نظّم جدول مراجعة مبكراً وتجنّب المذاكرة الليلية المتأخرة.",
      "حافظ على النوم الكافي والتغذية الجيدة خلال فترة الاختبارات.",
      "درّب نفسك على تمارين التنفس العميق عند الشعور بالقلق.",
      "دور الأسرة: التشجيع وتخفيف الضغط بدل المقارنة والتخويف.",
    ],
  },
  {
    title: "اختيار المسار الدراسي والمهني",
    category: "مطوية",
    summary: "كيف يختار الطالب مساره وفق ميوله وقدراته.",
    points: [
      "اعرف ميولك وقدراتك عبر مقاييس الميول المتاحة لدى الموجه.",
      "اطّلع على التخصصات المرتبطة بكل مسار ومتطلباتها.",
      "اربط اختيارك باحتياج سوق العمل وليس برغبة الزملاء.",
      "استشر الموجه الطلابي قبل اعتماد المسار نهائياً.",
    ],
  },
] as const;

export interface GuidanceLink {
  title: string;
  description: string;
  href: string;
}

export const GUIDANCE_LINKS: readonly GuidanceLink[] = [
  {
    title: "منصة مدرستي",
    description: "المنصة التعليمية الرسمية لمتابعة الدروس والواجبات.",
    href: "https://schools.madrasati.sa",
  },
  {
    title: "وزارة التعليم",
    description: "الموقع الرسمي لوزارة التعليم والأدلة الإرشادية المعتمدة.",
    href: "https://moe.gov.sa",
  },
  {
    title: "نظام نور",
    description: "نظام نور المركزي لمتابعة النتائج والبيانات الدراسية.",
    href: "https://noor.moe.gov.sa",
  },
] as const;

/** روابط المقاييس والاختبارات النفسية والتربوية المعتمدة. */
export const MEASUREMENT_TOOLS: readonly GuidanceLink[] = [
  {
    title: "مقياس الميول المهنية",
    description: "أداة لمساعدة الطالب على تحديد ميوله المهنية قبل اختيار المسار.",
    href: "https://www.mawhiba.org",
  },
  {
    title: "منصة قياس",
    description: "الاختبارات والمقاييس الوطنية للمركز الوطني للقياس.",
    href: "https://qiyas.sa",
  },
  {
    title: "الدليل التنظيمي للتوجيه والإرشاد",
    description: "المهام والإجراءات النظامية لعمل الموجه الطلابي.",
    href: "https://moe.gov.sa",
  },
] as const;

/** أرشيف الأنظمة والتعاميم المرجعية في عمل التوجيه الطلابي. */
export const REGULATION_ARCHIVE: readonly GuidanceLink[] = [
  {
    title: "قواعد السلوك والمواظبة",
    description: "لائحة السلوك والمواظبة ودرجات المخالفات والإجراءات المقابلة لها.",
    href: "https://moe.gov.sa",
  },
  {
    title: "نظام حماية الطفل",
    description: "إجراءات التبليغ عن حالات الإيذاء وآلية التعامل معها.",
    href: "https://hrsd.gov.sa",
  },
  {
    title: "تعاميم إدارة التوجيه والإرشاد",
    description: "التعاميم الواردة من إدارة التعليم ويُحتفظ بها ضمن الشواهد والوثائق.",
    href: "https://moe.gov.sa",
  },
] as const;

export const PUBLIC_FORMS = [
  {
    to: "/forms/consultation",
    title: "طلب استشارة فردية",
    audience: "طالب / ولي أمر",
    description: "احجز موعداً مع الموجه الطلابي لمناقشة موضوع أكاديمي أو سلوكي أو نفسي أو مهني.",
  },
  {
    to: "/forms/referral",
    title: "إحالة طالب",
    audience: "خاصة بالمعلمين",
    description: "أحل الطالب إلى التوجيه الطلابي مع توضيح الملاحظات والإجراءات السابقة.",
  },
  {
    to: "/forms/report",
    title: "إبلاغ سري",
    audience: "التنمر والمشكلات",
    description: "بلّغ عن حالة تنمر أو مشكلة تمس سلامة الطلاب، ويمكنك الإبلاغ دون ذكر اسمك.",
  },
] as const;
