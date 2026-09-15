import * as XLSX from "xlsx";

export interface NoorField {
  name: string;
  label: string;
  aliases: string[];
  required?: boolean;
}

/** أعمدة تقرير نور بالترتيب المعتمد */
export const NOOR_FIELDS: NoorField[] = [
  {
    name: "full_name",
    label: "اسم الطالب",
    required: true,
    aliases: ["اسم الطالب", "الاسم", "اسم الطالبة", "اسم الطالب رباعي", "الاسم الرباعي", "اسم الطالب الرباعي", "الطالب"],
  },
  {
    name: "national_id",
    label: "رقم الهوية / السجل المدني",
    required: true,
    aliases: [
      "رقم الهوية",
      "الهوية",
      "رقم الهوية أو الإقامة",
      "رقم الهوية الوطنية",
      "الاقامة",
      "رقم الاقامة",
      "السجل المدني",
      "رقم السجل المدني",
      "هوية الطالب",
      "رقم السجل",
      "الرقم الوطني",
    ],
  },
  {
    name: "nationality",
    label: "الجنسية",
    aliases: ["الجنسية", "جنسية الطالب", "الجنسيه"],
  },
  {
    name: "grade",
    label: "الصف الدراسي",
    aliases: ["الصف", "الصف الدراسي", "الصف/المرحلة", "المستوى", "الصف الحالي"],
  },
  {
    name: "classroom",
    label: "الفصل",
    aliases: ["الفصل", "الفصل الدراسي", "الشعبة", "فصل الطالب", "القسم"],
  },
  {
    name: "guardian_name",
    label: "اسم ولي الأمر",
    aliases: ["ولي الأمر", "اسم ولي الأمر", "ولي أمر الطالب", "اسم ولي أمر الطالب", "الوصي"],
  },
  {
    name: "guardian_phone",
    label: "رقم جوال ولي الأمر",
    aliases: [
      "جوال ولي الأمر",
      "رقم جوال ولي الأمر",
      "الجوال",
      "رقم الجوال",
      "رقم الهاتف",
      "الهاتف",
      "جوال",
      "جوال الطالب",
      "رقم التواصل",
    ],
  },
];

export function normalizeHeader(value: string): string {
  return String(value)
    .replace(/[\u064B-\u0652\u0640]/g, "")
    .replace(/[إأآا]/g, "ا")
    .replace(/[ىي]/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^\u0621-\u064Aa-zA-Z0-9]/g, "")
    .toLowerCase()
    .trim();
}

/** المطابقة البرمجية السريعة */
export function autoMap(headers: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  const used = new Set<string>();
  for (const field of NOOR_FIELDS) {
    const candidates = [field.label, field.name, ...field.aliases].map(normalizeHeader);
    const exact = headers.find((h) => !used.has(h) && candidates.includes(normalizeHeader(h)));
    const partial =
      exact ??
      headers.find(
        (h) =>
          !used.has(h) &&
          candidates.some((c) => c.length > 2 && (normalizeHeader(h).includes(c) || c.includes(normalizeHeader(h)))),
      );
    if (partial) {
      map[field.name] = partial;
      used.add(partial);
    } else {
      map[field.name] = "";
    }
  }
  return map;
}

/** 
 * الربط الذكي باستخدام DeepSeek لقراءة الملفات العشوائية وغير المرتبة 
 * @param headers عناوين الأعمدة في الملف
 * @param sampleRows عينة من أسطر البيانات للتحليل الذكي (أول 3 أسطر)
 * @param apiKey مفتاح DeepSeek API الخاص بك
 */
export async function aiAutoMapWithDeepSeek(
  headers: string[],
  sampleRows: Record<string, any>[],
  apiKey: string
): Promise<Record<string, string>> {
  const basicMap = autoMap(headers);
  const unmappedFields = NOOR_FIELDS.filter((f) => !basicMap[f.name]);

  // إذا تم التعرف على كافة الحقول تلقائياً، يُكتفى بالمطابقة البرمجية
  if (unmappedFields.length === 0) {
    return basicMap;
  }

  const prompt = `
أنت خبير في تحليل بيانات الجداول والملفات غير المرتبة.
لدينا الحقول التالية المطلوبة لنظامنا:
${JSON.stringify(NOOR_FIELDS.map((f) => ({ key: f.name, label: f.label })), null, 2)}

عناوين الأعمدة المتاحة في ملف إكسل المستخدم هي:
${JSON.stringify(headers)}

وهذه عينة من البيانات الفعلية في أول بضعة أسطر للمساعدة في التمييز:
${JSON.stringify(sampleRows, null, 2)}

المطلوب: قم بمطابقة كل مفتاح (key) من الحقول المطلوبة مع اسم العمود المناسب له تماماً من الملف.
قم بإرجاع النتيجة بصيغة JSON فقط كـ Object تكون المفاتيح هي (key) والقيم هي اسم العمود الدقيق من الجداول المتاحة. إذا لم تجد عموداً مناسباً، اجعل القيمة "".
`;

  try {
    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: "أنت مساعد ذكي متخصص في معالجة البيانات وتصنيف الجداول." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
      }),
    });

    const data = await response.json();
    const aiMapping = JSON.parse(data.choices[0].message.content);

    return { ...basicMap, ...aiMapping };
  } catch (error) {
    console.error("خطأ أثناء الاتصال بـ DeepSeek:", error);
    return basicMap;
  }
}

export function cleanPhone(value: unknown): string {
  const digits = String(value ?? "")
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("966")) return `0${digits.slice(3)}`;
  if (digits.length === 9 && digits.startsWith("5")) return `0${digits}`;
  return digits;
}

export function cleanId(value: unknown): string {
  return String(value ?? "")
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/\D/g, "");
}

export function downloadNoorTemplate() {
  const headers = [
    "اسم الطالب",
    "رقم الهوية أو الإقامة",
    "الجنسية",
    "الصف الدراسي",
    "الفصل",
    "اسم ولي الأمر",
    "رقم جوال ولي الأمر",
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers]);
  ws["!cols"] = headers.map(() => ({ wch: 24 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "الطلاب");
  XLSX.writeFile(wb, "نموذج_استيراد_نور.xlsx");
}