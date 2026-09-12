const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function displayRecordValue(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) return "—";
  if (UUID_PATTERN.test(text)) return "مرجع محفوظ";
  return text;
}