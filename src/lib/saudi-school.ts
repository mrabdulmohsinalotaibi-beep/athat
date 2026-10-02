export type SaudiStage = "ابتدائي" | "متوسط" | "ثانوي";

const ORDINALS = ["الأول", "الثاني", "الثالث", "الرابع", "الخامس", "السادس"] as const;

function compact(value: unknown) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/ة$/u, "ه");
}

export function normalizeSaudiStage(value: unknown): SaudiStage | "" {
  const v = compact(value);
  if (!v) return "";
  if (/ابتدائ/u.test(v)) return "ابتدائي";
  if (/متوسط/u.test(v)) return "متوسط";
  if (/ثانو/u.test(v)) return "ثانوي";
  return "";
}

export function gradeOrdinal(value: unknown) {
  const v = compact(value);
  return ORDINALS.find((ordinal) => v.includes(ordinal)) ?? "";
}

export function normalizeSaudiGrade(value: unknown, stageValue?: unknown) {
  const ordinal = gradeOrdinal(value);
  if (!ordinal) return String(value ?? "").trim();

  const stage = normalizeSaudiStage(stageValue) || normalizeSaudiStage(value);
  if (stage === "متوسط") return `${ordinal} متوسط`;
  if (stage === "ثانوي") return `${ordinal} ثانوي`;
  if (stage === "ابتدائي") return ordinal;
  return ordinal;
}

export function stageAliases(stage: string) {
  const normalized = normalizeSaudiStage(stage);
  if (normalized === "ابتدائي")
    return ["ابتدائي", "الابتدائي", "ابتدائية", "المرحلة الابتدائية"];
  if (normalized === "متوسط")
    return ["متوسط", "المتوسط", "متوسطة", "المرحلة المتوسطة"];
  if (normalized === "ثانوي")
    return ["ثانوي", "الثانوي", "ثانوية", "المرحلة الثانوية"];
  return [stage];
}

export function gradeAliases(grade: string, stageValue?: string) {
  const stage = normalizeSaudiStage(stageValue) || normalizeSaudiStage(grade);
  const ordinal = gradeOrdinal(grade);
  if (!ordinal) return [grade];

  const values = new Set<string>([grade, ordinal]);
  if (stage === "متوسط") {
    values.add(`${ordinal} متوسط`);
    values.add(`${ordinal} المتوسط`);
    values.add(`${ordinal} متوسطة`);
  } else if (stage === "ثانوي") {
    values.add(`${ordinal} ثانوي`);
    values.add(`${ordinal} الثانوي`);
    values.add(`${ordinal} ثانوية`);
  } else if (stage === "ابتدائي") {
    values.add(`${ordinal} ابتدائي`);
    values.add(`${ordinal} الابتدائي`);
    values.add(`${ordinal} ابتدائية`);
  }
  return Array.from(values);
}

export const SAUDI_STAGE_GRADES: Record<SaudiStage, string[]> = {
  ابتدائي: ["الأول", "الثاني", "الثالث", "الرابع", "الخامس", "السادس"],
  متوسط: ["الأول متوسط", "الثاني متوسط", "الثالث متوسط"],
  ثانوي: ["الأول ثانوي", "الثاني ثانوي", "الثالث ثانوي"],
};
