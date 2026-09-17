import { useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toPng } from "html-to-image";
import { Download, FileDown, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { draftWeeklyGuidance } from "@/lib/deepseek.functions";
import { elementToPdf } from "@/lib/pdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import moeLogo from "@/assets/moe-logo-official.png";

/** بيانات المدرسة والوزارة الرسمية. */
const SCHOOL_INFO = {
  ministry: "المملكة العربية السعودية",
  authority: "وزارة التعليم",
  department: "إدارة التعليم بمكة المكرمة",
  school: "متوسطة العلاء بن الحضرمي",
  watermark: "متوسطة العلاء بن الحضرمي",
};

function watermarkBackground(text: string) {
  const safe = text.replace(/[<>&]/g, "");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="380" height="200">
      <text x="10" y="70" font-family="Cairo, sans-serif" font-size="24" font-weight="700"
        fill="#1f2937" fill-opacity="0.055" transform="rotate(-18 190 70)">${safe} ${safe}</text>
      <text x="-60" y="170" font-family="Cairo, sans-serif" font-size="24" font-weight="700"
        fill="#1f2937" fill-opacity="0.055" transform="rotate(-18 190 170)">${safe} ${safe}</text>
    </svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

function safeFileName(value: string, fallback: string) {
  const name = value.trim() || fallback;
  return name.replace(/[\\/:*?"<>|\r\n]+/g, "-").slice(0, 80) || fallback;
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function WeeklyGuidancePoster() {
  const draft = useServerFn(draftWeeklyGuidance);
  const posterRef = useRef<HTMLDivElement>(null);

  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [title, setTitle] = useState("الانضباط");
  const [intro, setIntro] = useState(
    "مع انطلاقة هذا الأسبوع، نضع نصب أعيننا قيمة أساسية لا غنى عنها لصناعة النجاح",
  );
  const [body, setBody] = useState(
    "الانضباط ليس مجرد قوانين مدرسية نلتزم بها، بل هو مهارة حياتية وعنوان لشخصيتك الواعية والناضجة. إنه الفارق بين الأمنيات والإنجاز، ويمنحك القدرة على تنظيم وقتك وتحمل مسؤولياتك والوصول إلى أهدافك.",
  );
  const [reminder, setReminder] = useState(
    "الطلاب المتميزون هم أكثرهم انضباطاً بالتنظيم والالتزام، فلنصنع معاً أسبوعاً دراسياً مثالياً وخالياً من التأخير والإهمال.",
  );

  async function generate() {
    const trimmedTopic = topic.trim();
    if (trimmedTopic.length < 2) {
      toast.error("اكتب موضوع التوجيه أولاً، مثل: الأمانة، احترام الوقت، التنمر...");
      return;
    }

    setBusy(true);
    try {
      const result = await draft({ data: { topic: trimmedTopic } });
      setTitle(result.title?.trim() || trimmedTopic);
      setIntro(result.intro?.trim() || "");
      setBody(result.body?.trim() || "");
      setReminder(result.reminder?.trim() || "");
      toast.success("تم توليد المحتوى بالذكاء الاصطناعي بنجاح، راجعه قبل التنزيل.");
    } catch (error) {
      toast.error(errorMessage(error, "تعذّر توليد المحتوى عبر الذكاء الاصطناعي."));
    } finally {
      setBusy(false);
    }
  }

  async function downloadPng() {
    const poster = posterRef.current;
    if (!poster) return;

    setExporting(true);
    try {
      const dataUrl = await toPng(poster, {
        cacheBust: true,
        pixelRatio: 3,
        backgroundColor: "#ffffff",
      });
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `التوجيه_الطلابي_${safeFileName(title, "الأسبوعي")}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("تم تنزيل الصورة بنجاح.");
    } catch (error) {
      toast.error(errorMessage(error, "تعذّر تصدير الصورة."));
    } finally {
      setExporting(false);
    }
  }

  async function downloadPdf() {
    const poster = posterRef.current;
    if (!poster) return;

    setExporting(true);
    try {
      await elementToPdf(poster, `التوجيه الطلابي ${title || "الأسبوعي"}`);
      toast.success("تم تنزيل ملف PDF بنجاح.");
    } catch (error) {
      toast.error(errorMessage(error, "تعذّر تصدير PDF."));
    } finally {
      setExporting(false);
    }
  }

  const watermarkStyle = useMemo(
    () => ({
      backgroundImage: watermarkBackground(SCHOOL_INFO.watermark),
      backgroundRepeat: "repeat" as const,
    }),
    [],
  );

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-4" dir="rtl">
      <section className="rounded-2xl border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Label htmlFor="topic" className="font-bold">
              موضوع التوجيه الأسبوعي
            </Label>
            <Input
              id="topic"
              className="mt-1"
              placeholder="مثال: الأمانة، احترام الوقت، التنمر، المحافظة على الممتلكات..."
              value={topic}
              maxLength={100}
              onChange={(event) => setTopic(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !busy) generate();
              }}
            />
          </div>
          <Button type="button" onClick={generate} disabled={busy || exporting} className="shrink-0">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {busy ? "جارٍ التوليد بالذكاء الاصطناعي..." : "توليد بالذكاء الاصطناعي"}
          </Button>
        </div>

        <div className="mt-4 grid gap-3">
          <div>
            <Label htmlFor="poster-title" className="text-xs text-muted-foreground">
              العنوان (الكلمة المحورية)
            </Label>
            <Input id="poster-title" value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1 font-bold" maxLength={80} />
          </div>
          <div>
            <Label htmlFor="poster-intro" className="text-xs text-muted-foreground">
              الفقرة التمهيدية
            </Label>
            <Textarea id="poster-intro" value={intro} onChange={(event) => setIntro(event.target.value)} rows={2} className="mt-1" maxLength={300} />
          </div>
          <div>
            <Label htmlFor="poster-body" className="text-xs text-muted-foreground">
              الفقرة التفصيلية
            </Label>
            <Textarea id="poster-body" value={body} onChange={(event) => setBody(event.target.value)} rows={3} className="mt-1" maxLength={700} />
          </div>
          <div>
            <Label htmlFor="poster-reminder" className="text-xs text-muted-foreground">
              تذكير ختامي (تذكر دائماً)
            </Label>
            <Textarea id="poster-reminder" value={reminder} onChange={(event) => setReminder(event.target.value)} rows={2} className="mt-1" maxLength={300} />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={downloadPng} disabled={exporting || busy}>
            {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            تنزيل صورة PNG (A4)
          </Button>
          <Button type="button" variant="outline" onClick={downloadPdf} disabled={exporting || busy}>
            {exporting ? <Loader2 className="size-4 animate-spin" /> : <FileDown className="size-4" />}
            تنزيل PDF
          </Button>
        </div>
      </section>

      <div className="overflow-auto rounded-2xl border bg-muted/30 p-4">
        <div
          ref={posterRef}
          dir="rtl"
          className="mx-auto bg-white text-[#1f2937]"
          style={{
            boxSizing: "border-box",
            width: 794,
            height: 1123,
            padding: 40,
            fontFamily: "'Cairo Variable', Cairo, sans-serif",
          }}
        >
          <div className="grid grid-cols-3 items-center rounded-[28px] bg-[#f4f1ea] px-8 py-4 shadow-sm">
            <div className="text-right text-sm font-bold leading-7">
              <p>{SCHOOL_INFO.ministry}</p>
              <p>{SCHOOL_INFO.authority}</p>
              <p>{SCHOOL_INFO.department}</p>
              <p>{SCHOOL_INFO.school}</p>
            </div>
            <div className="flex justify-center">
              <img src={moeLogo} alt="شعار وزارة التعليم" className="h-16 w-28 object-contain" />
            </div>
            <div aria-hidden="true" />
          </div>

          <div className="mt-8 flex justify-center">
            <div className="flex items-center gap-3 rounded-xl border bg-[#f4f1ea] px-8 py-3 shadow-[3px_3px_0_rgba(0,0,0,0.12)]">
              <span className="size-3 rounded-full bg-[#1f2937]" />
              <h1 className="text-2xl font-extrabold">التوجيه الطلابي</h1>
            </div>
          </div>

          <div
            className="relative mt-8 flex min-h-[720px] flex-col justify-between overflow-hidden rounded-sm border-2 border-[#c9b48a] p-10"
            style={watermarkStyle}
          >
            <span
              className="absolute right-0 top-0 size-6 border-b-2 border-l-2 border-[#c9b48a]"
              style={{ clipPath: "polygon(100% 0, 0 0, 100% 100%)" }}
              aria-hidden="true"
            />
            <span
              className="absolute bottom-0 left-0 size-6 border-r-2 border-t-2 border-[#c9b48a]"
              style={{ clipPath: "polygon(0 100%, 100% 100%, 0 0)" }}
              aria-hidden="true"
            />

            <div className="relative my-auto flex flex-col items-center justify-center gap-8 text-center">
              <div className="max-w-xl">
                {intro && <p className="text-xl font-bold leading-10">{intro}</p>}
                {title && <p className="mt-2 text-2xl font-extrabold">&quot;{title}&quot;</p>}
              </div>

              {body && <p className="max-w-xl text-lg leading-9">{body}</p>}

              {reminder && (
                <div className="mt-4 max-w-xl text-lg font-extrabold leading-9">
                  <p>تذكر دائماً:</p>
                  <p>{reminder}</p>
                </div>
              )}
            </div>

            <div className="relative mt-8 flex items-center justify-between border-t border-[#c9b48a]/40 pt-3 text-xs font-medium text-muted-foreground">
              <span>التوجيه الطلابي</span>
              <span>منصة الذات للتوجيه الطلابي</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
