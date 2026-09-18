import { useMemo, useRef, useState } from "react";
import { FileDown, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { elementToPdf } from "@/lib/pdf";
import { aiErrorMessage, requestAi } from "@/lib/ai";
import { useSchool } from "@/lib/school";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import moeLogo from "@/assets/moe-logo-official.png";

const TOPICS = [
  "الانضباط",
  "الاحترام",
  "المواطنة الرقمية",
  "الاستعداد للاختبارات",
  "الصحة النفسية",
  "التعاون",
];

function watermarkBackground(text: string) {
  const safe = text.replace(/[<>&]/g, "");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="380" height="200"><text x="10" y="70" font-family="Cairo, sans-serif" font-size="24" font-weight="700" fill="#7f1d1d" fill-opacity="0.055" transform="rotate(-18 190 70)">${safe} ${safe}</text><text x="-60" y="170" font-family="Cairo, sans-serif" font-size="24" font-weight="700" fill="#7f1d1d" fill-opacity="0.055" transform="rotate(-18 190 170)">${safe} ${safe}</text></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

export function WeeklyGuidancePoster() {
  const { data: school } = useSchool();
  const posterRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [title, setTitle] = useState("الانضباط");
  const [intro, setIntro] = useState(
    "مع انطلاقة هذا الأسبوع، نضع نصب أعيننا قيمة أساسية لصناعة النجاح.",
  );
  const [body, setBody] = useState(
    "الانضباط مهارة حياتية وعنوان لشخصيتك الواعية؛ فهو يساعدك على تنظيم وقتك والوفاء بوعودك وتحقيق أهدافك بخطوات ثابتة.",
  );
  const [reminder, setReminder] = useState(
    "ابدأ أسبوعك بخطة واضحة، واحرص على الحضور المبكر والاستعداد الجيد.",
  );

  const watermarkStyle = useMemo(
    () => ({
      backgroundImage: watermarkBackground(school?.school_name || "منصة الذات"),
      backgroundRepeat: "repeat" as const,
    }),
    [school?.school_name],
  );

  async function generateWithAi() {
    setAiBusy(true);
    try {
      const data = await requestAi("weekly", { title, intro, body, reminder });
      if (data.intro) setIntro(String(data.intro));
      if (data.summary) setBody(String(data.summary));
      if (data.suggestion) setReminder(String(data.suggestion));
      toast.success("تم إعداد مسودة إرشادية جديدة.");
    } catch (error) {
      toast.error(aiErrorMessage(error));
    } finally {
      setAiBusy(false);
    }
  }

  async function downloadPdf() {
    if (!posterRef.current) return;
    setExporting(true);
    try {
      await elementToPdf(posterRef.current, `التوجيه الطلابي ${title || "الأسبوعي"}`);
      toast.success("تم حفظ لوحة التوجيه بصيغة PDF");
    } catch {
      toast.error("تعذّر حفظ PDF.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-6 p-4 lg:grid-cols-[minmax(0,360px)_1fr]" dir="rtl">
      <section className="no-print h-fit rounded-3xl border border-primary/12 bg-card p-5 shadow-sm lg:sticky lg:top-24">
        <div className="mb-5 flex items-center gap-2">
          <div className="rounded-xl bg-primary/10 p-2 text-primary">
            <Sparkles className="size-5" />
          </div>
          <div>
            <h1 className="font-black">التوجيه الطلابي الأسبوعي</h1>
            <p className="text-xs text-muted-foreground">أنشئ لوحة رسمية واحفظها PDF</p>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <Label>موضوع الأسبوع</Label>
            <select
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {TOPICS.map((topic) => (
                <option key={topic}>{topic}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>العنوان المخصص</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 font-bold"
            />
          </div>
          <div>
            <Label>التمهيد</Label>
            <Textarea
              value={intro}
              onChange={(e) => setIntro(e.target.value)}
              rows={3}
              className="mt-1"
            />
          </div>
          <div>
            <Label>الرسالة الإرشادية</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
              className="mt-1"
            />
          </div>
          <div>
            <Label>تذكّر دائمًا</Label>
            <Textarea
              value={reminder}
              onChange={(e) => setReminder(e.target.value)}
              rows={4}
              className="mt-1"
            />
          </div>
        </div>
        <div className="mt-5 grid gap-2">
          <Button onClick={generateWithAi} variant="secondary" disabled={aiBusy}>
            <Sparkles className="size-4" />
            {aiBusy ? "جارٍ إعداد المسودة..." : "اقتراح مسودة بالذكاء الاصطناعي"}
          </Button>
          <Button onClick={downloadPdf} disabled={exporting}>
            {exporting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <FileDown className="size-4" />
            )}{" "}
            حفظ PDF
          </Button>
        </div>
      </section>

      <div className="overflow-auto rounded-3xl border bg-muted/30 p-4">
        <div
          ref={posterRef}
          dir="rtl"
          className="mx-auto bg-white text-[#1f2937]"
          style={{
            width: 794,
            minHeight: 1123,
            padding: 40,
            fontFamily: "'Cairo Variable', Cairo, sans-serif",
          }}
        >
          <div className="grid grid-cols-3 items-center rounded-[28px] border-b-4 border-[#c58a22] bg-[#fbf7ef] px-8 py-4">
            <div className="text-right text-sm font-bold leading-7">
              <p>المملكة العربية السعودية</p>
              <p>وزارة التعليم</p>
              <p>{school?.education_dept || "إدارة التعليم"}</p>
              <p>{school?.school_name || "اسم المدرسة"}</p>
            </div>
            <div className="flex justify-center">
              <img src={moeLogo} alt="شعار وزارة التعليم" className="h-16 w-28 object-contain" />
            </div>
            <div className="text-left text-xs font-semibold leading-6">
              <p>العام الدراسي: {school?.academic_year || "—"}</p>
              <p>{school?.semester || "الفصل الدراسي"}</p>
              <p>{new Date().toLocaleDateString("ar-SA")}</p>
            </div>
          </div>
          <div className="mt-8 flex justify-center">
            <div className="flex items-center gap-3 rounded-xl border border-[#c9b48a] bg-[#fbf7ef] px-8 py-3 shadow-[3px_3px_0_rgba(127,29,29,0.14)]">
              <span className="size-3 rounded-full bg-[#7f1d1d]" />
              <h2 className="text-2xl font-extrabold">التوجيه الطلابي</h2>
            </div>
          </div>
          <div
            className="relative mt-8 flex min-h-[720px] flex-col justify-between overflow-hidden rounded-sm border-2 border-[#c9b48a] p-10"
            style={watermarkStyle}
          >
            <div className="relative my-auto flex flex-col items-center justify-center gap-8 text-center">
              <div className="max-w-xl">
                <p className="text-xl font-bold leading-10">{intro}</p>
                {title && (
                  <p className="mt-2 text-2xl font-extrabold text-[#7f1d1d]">&quot;{title}&quot;</p>
                )}
              </div>
              {body && <p className="max-w-xl text-lg leading-9">{body}</p>}
              {reminder && (
                <div className="mt-4 max-w-xl text-lg font-extrabold leading-9">
                  <p className="text-[#7f1d1d]">تذكّر دائمًا:</p>
                  <p>{reminder}</p>
                </div>
              )}
            </div>
            <div className="relative mt-8 flex items-center justify-between border-t border-[#c9b48a]/40 pt-3 text-xs font-medium text-gray-500">
              <span>الموجه الطلابي: {school?.counselor_name || "—"}</span>
              <span>منصة الذات للتوجيه الطلابي</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
