export const LOOKUP_CATEGORIES = [
  { id: "domains", label: "المجالات" },
  { id: "referral_sources", label: "مصادر الإحالة" },
  { id: "case_statuses", label: "حالات الحالات" },
  { id: "priorities", label: "الأولويات" },
  { id: "interventions", label: "الإجراءات وخطط التدخل" },
  { id: "referral_destinations", label: "جهات الإحالة" },
  { id: "referral_reasons", label: "أسباب الإحالة" },
  { id: "referral_results", label: "نتائج الإحالة" },
  { id: "meeting_types", label: "أنواع اللجان والاجتماعات" },
  { id: "channels", label: "وسائل التواصل" },
  { id: "behavior_results", label: "نتائج المتابعة السلوكية" },
  { id: "program_types", label: "أنواع البرامج" },
] as const;

export type LookupCategory = (typeof LOOKUP_CATEGORIES)[number]["id"];

export function lookupCategoryLabel(category: string) {
  return LOOKUP_CATEGORIES.find((item) => item.id === category)?.label ?? category;
}

export function mergeLookupOptions(defaults: string[] | undefined, custom: string[]) {
  return Array.from(new Set([...(defaults ?? []), ...custom].map((value) => value.trim()).filter(Boolean)));
}