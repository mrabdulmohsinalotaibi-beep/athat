// 1. هيكل بيانات التصنيف المطور شامل الأيقونات والألوان
export interface LookupCategoryMeta {
  id: string;
  label: string;
  description: string;
  icon?: string;
  color?: string; // ألوان للبطاقات والحالات (مثل: أحمر للأولويات العالية)
}

// 2. قائمة التصنيفات الشاملة والمحدثة
export const LOOKUP_CATEGORIES: readonly LookupCategoryMeta[] = [
  { id: "domains", label: "المجالات", description: "المجالات الإرشادية (سلوكي، أكاديمي، نفسي، اجتماعي)", icon: "LayoutGrid", color: "blue" },
  { id: "referral_sources", label: "مصادر الإحالة", description: "الجهة/الشخص الذي أحال الحالة للموجه", icon: "UserCheck", color: "indigo" },
  { id: "case_statuses", label: "حالات الحالات", description: "مراحل متابعة الحالة (جديدة، قيد الدراسة، مغلقة)", icon: "Activity", color: "amber" },
  { id: "priorities", label: "الأولويات", description: "مستوى أهمية وخطورة المتابعة", icon: "AlertTriangle", color: "rose" },
  { id: "interventions", label: "الإجراءات وخطط التدخل", description: "الأساليب والإجراءات المتخذة مع الطالب", icon: "ShieldAlert", color: "emerald" },
  { id: "referral_destinations", label: "جهات الإحالة", description: "الجهات الخارجية أو الداخلية الموجه إليها الطالب", icon: "Building", color: "purple" },
  { id: "referral_reasons", label: "أسباب الإحالة", description: "الدواعي والمشكلات الموجبة للإحالة", icon: "FileText", color: "orange" },
  { id: "referral_results", label: "نتائج الإحالة", description: "ما آلت إليه حالة الطالب بعد الإحالة", icon: "CheckCircle", color: "teal" },
  { id: "meeting_types", label: "أنواع اللجان والاجتماعات", description: "تصنيف اجتماعات التوجيه واللجان المدرسية", icon: "Users", color: "cyan" },
  { id: "channels", label: "وسائل التواصل", description: "طرق التواصل مع ولي الأمر أو الطالب", icon: "PhoneCall", color: "sky" },
  { id: "behavior_results", label: "نتائج المتابعة السلوكية", description: "تقييم التغير السلوكي للطالب", icon: "TrendingUp", color: "green" },
  { id: "program_types", label: "أنواع البرامج", description: "تصنيف البرامج (وقائي، إنمائي، علاجي)", icon: "Bookmark", color: "violet" },
] as const;

export type LookupCategory = (typeof LOOKUP_CATEGORIES)[number]["id"];

// 3. خريطة سريعة للبحث الفوري O(1) بدلاً من .find()
const LOOKUP_MAP = new Map<string, LookupCategoryMeta>(
  LOOKUP_CATEGORIES.map((item) => [item.id, item])
);

/** جلب تسمية التصنيف */
export function lookupCategoryLabel(category: string): string {
  return LOOKUP_MAP.get(category)?.label ?? category;
}

/** جلب بيانات التصنيف الكاملة بما فيها الألوان والأيقونات */
export function getCategoryMeta(category: string): LookupCategoryMeta | undefined {
  return LOOKUP_MAP.get(category);
}

/** دمج الخيارات وتصفياتها مع ترتيبها أبجدياً */
export function mergeLookupOptions(
  defaults: string[] | undefined = [],
  custom: string[] = []
): string[] {
  const cleanList = [...defaults, ...custom]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);

  return Array.from(new Set(cleanList)).sort((a, b) => a.localeCompare(b, "ar"));
}