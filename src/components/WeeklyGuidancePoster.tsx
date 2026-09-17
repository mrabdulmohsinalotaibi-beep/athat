import { useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toPng } from "html-to-image";
import {
  Download,
  FileDown,
  Loader2,
  Sparkles,
  Printer,
  MessageCircle,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

import { draftWeeklyGuidance } from "@/lib/deepseek.functions";
import { elementToPdf } from "@/lib/pdf";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import moeLogo from "@/assets/moe-logo-official.png";

const SCHOOL_INFO = {
  ministry: "المملكة العربية السعودية",
  authority: "وزارة التعليم",
  department: "إدارة التعليم بمكة المكرمة",
  school: "متوسطة العلاء بن الحضرمي",
};

const BRAND = {
  platform: "الذات - منصة التوجيه الطلابي",
  copyright: "جميع الحقوق محفوظة لـ Abdulmo7sin Alotaibi",
};

const DEFAULT_THEME = {
  primary: "#263238",
  secondary: "#546E7A",
  accent: "#B08A45",
  soft: "#F5F2EB",
  border: "#C9B48A",
  reminder: "#275D4B",
};

type PosterTheme = {
  primary: string;
  secondary: string;
  accent: string;
  soft: string;
  border: string;
  reminder: string;
};

function safeColor(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  const color = value.trim();
  return /^#[0-9A-Fa-f]{6}$/.test(color) ? color : fallback;
}

function normalizeTheme(theme?: Partial<PosterTheme>): PosterTheme {
  return {
    primary: safeColor(theme?.primary, DEFAULT_THEME.primary),
    secondary: safeColor(theme?.secondary, DEFAULT_THEME.secondary),
    accent: safeColor(theme?.accent, DEFAULT_THEME.accent),
    soft: safeColor(theme?.soft, DEFAULT_THEME.soft),
    border: safeColor(theme?.border, DEFAULT_THEME.border),
    reminder: safeColor(theme?.reminder, DEFAULT_THEME.reminder),
  };
}

function watermarkBackground(text: string) {
  const safe = text.replace(/[<>&]/g, "");

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="420" height="220">
      <text x="20" y="80"
        font-family="Cairo, Arial, sans-serif"
        font-size="23" font-weight="700"
        fill="#263238" fill-opacity="0.045"
        transform="rotate(-16 210 80)">
        ${safe}
      </text>
      <text x="-40" y="190"
        font-family="Cairo, Arial, sans-serif"
        font-size="23" font-weight="700"
        fill="#263238" fill-opacity="0.045"
        transform="rotate(-16 210 190)">
        ${safe}
      </text>
    </svg>
  `;

  return `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}")`;
}

export function WeeklyGuidancePoster() {
  const draft = useServerFn(draftWeeklyGuidance);
  const posterRef = useRef<HTMLDivElement>(null);

  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);

  // النص الافتراضي فارغ كما طلبت
  const [title, setTitle] = useState("");
  const [intro, setIntro] = useState("");
  const [body, setBody] = useState("");
  const [reminder, setReminder] = useState("");

  // يحدده الذكاء الاصطناعي حسب الموضوع
  const [theme, setTheme] = useState<PosterTheme>(DEFAULT_THEME);

  async function generate() {
    const cleanTopic = topic.trim();

    if (cleanTopic.length < 2) {
      toast.error("اكتب موضوع التوجيه أولاً، مثل: الانضباط، التنمر، احترام الوقت...");
      return;
    }

    setBusy(true);

    try {
      const result = await draft({ data: { topic: cleanTopic } });

      setTitle(result.title || "");
      setIntro(result.intro || "");
      setBody(result.body || "");
      setReminder(result.reminder || "");
      setTheme(normalizeTheme(result.theme));

      toast.success("تم إنشاء المنشور بالذكاء الاصطناعي.");
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "تعذّر توليد محتوى المنشور."
      );
    } finally {
      setBusy(false);
    }
  }

  function resetPoster() {
    setTopic("");
    setTitle("");
    setIntro("");
    setBody("");
    setReminder("");
    setTheme(DEFAULT_THEME);
    toast.success("تم تفريغ المنشور.");
  }

  async function prepareForExport() {
    if (document.fonts?.ready) await document.fonts.ready;

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    });
  }

  async function createPng() {
    if (!posterRef.current) throw new Error("تعذر العثور على المنشور.");

    await prepareForExport();

    return toPng(posterRef.current, {
      cacheBust: true,
      pixelRatio: 3.125,
      backgroundColor: "#ffffff",
      skipFonts: false,
    });
  }

  async function downloadPng() {
    setExporting(true);

    try {
      const dataUrl = await createPng();
      const safeTitle =
        title.trim().replace(/[\\/:*?"<>|]/g, "-") || "التوجيه-الطلابي";

      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `${safeTitle}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success("تم حفظ صورة المنشور بجودة عالية.");
    } catch (error) {
      console.error(error);
      toast.error("تعذّر تصدير صورة PNG.");
    } finally {
      setExporting(false);
    }
  }

  async function downloadPdf() {
    if (!posterRef.current) return;

    setExporting(true);

    try {
      await prepareForExport();
      await elementToPdf(
        posterRef.current,
        `التوجيه الطلابي ${title || "الأسبوعي"}`
      );
      toast.success("تم إنشاء ملف PDF.");
    } catch (error) {
      console.error(error);
      toast.error("تعذّر إنشاء ملف PDF.");
    } finally {
      setExporting(false);
    }
  }

  function printPoster() {
    window.print();
  }

  async function shareWhatsApp() {
    setExporting(true);

    try {
      const dataUrl = await createPng();
      const response = await fetch(dataUrl);
      const blob = await response.blob();

      const safeTitle =
        title.trim().replace(/[\\/:*?"<>|]/g, "-") || "التوجيه-الطلابي";

      const file = new File([blob], `${safeTitle}.png`, {
        type: "image/png",
      });

      if (
        navigator.share &&
        (!navigator.canShare || navigator.canShare({ files: [file] }))
      ) {
        await navigator.share({
          title: title || "التوجيه الطلابي",
          text: `${BRAND.platform}${title ? `\nموضوع: ${title}` : ""}`,
          files: [file],
        });
        toast.success("تم فتح خيارات المشاركة.");
        return;
      }

      const message = encodeURIComponent(
        `${BRAND.platform}${title ? `\nموضوع: ${title}` : ""}`
      );
      window.open(`https://wa.me/?text=${message}`, "_blank");
      toast.info("تم فتح WhatsApp. قد تحتاج لإرفاق الصورة يدويًا.");
    } catch (error) {
      if ((error as Error)?.name !== "AbortError") {
        console.error(error);
        toast.error("تعذّرت مشاركة المنشور.");
      }
    } finally {
      setExporting(false);
    }
  }

  const watermarkStyle = useMemo(
    () => ({
      backgroundImage: watermarkBackground(BRAND.platform),
      backgroundRepeat: "repeat" as const,
    }),
    []
  );

  const posterStyle = {
    "--primary": theme.primary,
    "--secondary": theme.secondary,
    "--accent": theme.accent,
    "--soft": theme.soft,
    "--border": theme.border,
    "--reminder": theme.reminder,
  } as React.CSSProperties;

  return (
    <>
      <style>{`
        @page {
          size: A4 portrait;
          margin: 0;
        }

        @media print {
          html, body {
            width: 210mm;
            height: 297mm;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }

          body * {
            visibility: hidden;
          }

          .print-poster,
          .print-poster * {
            visibility: visible;
          }

          .print-poster {
            position: absolute !important;
            top: 0 !important;
            right: 0 !important;
            width: 210mm !important;
            height: 297mm !important;
            margin: 0 !important;
            padding: 10mm !important;
            box-shadow: none !important;
          }

          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="mx-auto flex max-w-5xl flex-col gap-6 p-4" dir="rtl">
        <section className="no-print rounded-2xl border bg-card p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Label htmlFor="topic" className="font-bold">
                موضوع التوجيه الأسبوعي
              </Label>

              <Input
                id="topic"
                className="mt-1"
                placeholder="مثال: الانضباط، الأمانة، التنمر، احترام الوقت..."
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !busy) generate();
                }}
              />
            </div>

            <Button type="button" onClick={generate} disabled={busy}>
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              {busy ? "جارٍ إعداد المنشور..." : "إنشاء بالذكاء الاصطناعي"}
            </Button>
          </div>

          <div className="mt-5 grid gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">العنوان</Label>
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="mt-1 font-bold"
                placeholder="يظهر هنا العنوان بعد التوليد"
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">المقدمة</Label>
              <Textarea
                value={intro}
                onChange={(event) => setIntro(event.target.value)}
                rows={3}
                className="mt-1"
                placeholder="النص التمهيدي..."
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">المحتوى</Label>
              <Textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                rows={4}
                className="mt-1"
                placeholder="المحتوى التوجيهي..."
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">
                تذكر دائماً
              </Label>
              <Textarea
                value={reminder}
                onChange={(event) => setReminder(event.target.value)}
                rows={3}
                className="mt-1"
                placeholder="الرسالة الختامية..."
              />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={downloadPng}
              disabled={exporting}
            >
              {exporting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              حفظ PNG
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={downloadPdf}
              disabled={exporting}
            >
              <FileDown className="size-4" />
              PDF
            </Button>

            <Button type="button" variant="outline" onClick={printPoster}>
              <Printer className="size-4" />
              طباعة A4
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={shareWhatsApp}
              disabled={exporting}
            >
              <MessageCircle className="size-4" />
              مشاركة واتساب
            </Button>

            <Button type="button" variant="ghost" onClick={resetPoster}>
              <RotateCcw className="size-4" />
              تفريغ
            </Button>
          </div>
        </section>

        <div className="overflow-auto rounded-2xl border bg-muted/30 p-4">
          <div
            ref={posterRef}
            dir="rtl"
            className="print-poster mx-auto overflow-hidden bg-white text-[var(--primary)]"
            style={{
              ...posterStyle,
              width: 794,
              height: 1123,
              padding: 38,
              fontFamily: "'Cairo Variable', Cairo, Arial, sans-serif",
            }}
          >
            {/* الكليشة العلوية: شعار وزارة التعليم فقط */}
            <header
              className="relative overflow-hidden rounded-[26px] border bg-[var(--soft)]"
              style={{
                borderColor: theme.border,
                minHeight: 165,
              }}
            >
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  border: `2px solid ${theme.border}`,
                  clipPath:
                    "polygon(0 0, 97% 0, 100% 22%, 100% 78%, 97% 100%, 3% 100%, 0 78%, 0 22%)",
                }}
              />

              <div className="relative flex min-h-[165px] flex-col items-center justify-center">
                <img
                  src={moeLogo}
                  alt="شعار وزارة التعليم"
                  className="h-[76px] w-[190px] object-contain"
                  crossOrigin="anonymous"
                />

                <div className="mt-1 text-center text-[13px] font-bold leading-6 text-[var(--primary)]">
                  <div>{SCHOOL_INFO.ministry}</div>
                  <div>{SCHOOL_INFO.authority}</div>
                  <div>{SCHOOL_INFO.department}</div>
                  <div>{SCHOOL_INFO.school}</div>
                </div>
              </div>
            </header>

            {/* عنوان المنشور */}
            <div className="mt-7 flex justify-center">
              <div className="relative">
                <div
                  className="absolute -left-4 -top-3 h-[52px] w-[360px] border"
                  style={{ borderColor: theme.secondary }}
                />

                <div
                  className="relative flex items-center gap-3 px-9 py-3"
                  style={{
                    backgroundColor: theme.soft,
                    boxShadow: `5px 5px 0 ${theme.primary}22`,
                  }}
                >
                  <span
                    className="size-4 rounded-full"
                    style={{ backgroundColor: theme.primary }}
                  />

                  <h1
                    className="text-[30px] font-black tracking-tight"
                    style={{ color: theme.primary }}
                  >
                    التوجيه الطلابي
                  </h1>
                </div>
              </div>
            </div>

            {/* الإطار الرئيسي */}
            <main
              className="relative mt-8 overflow-hidden border-2"
              style={{
                ...watermarkStyle,
                borderColor: theme.border,
                height: 735,
              }}
            >
              <span
                className="absolute right-0 top-0 h-10 w-10"
                style={{
                  borderLeft: `2px solid ${theme.border}`,
                  borderBottom: `2px solid ${theme.border}`,
                  clipPath: "polygon(100% 0, 0 0, 100% 100%)",
                }}
              />

              <span
                className="absolute bottom-0 left-0 h-10 w-10"
                style={{
                  borderRight: `2px solid ${theme.border}`,
                  borderTop: `2px solid ${theme.border}`,
                  clipPath: "polygon(0 100%, 100% 100%, 0 0)",
                }}
              />

              <div className="relative flex h-full flex-col items-center justify-center px-10 text-center">
                {intro && (
                  <div className="max-w-[650px]">
                    <p
                      className="text-[24px] font-bold leading-[1.8]"
                      style={{ color: theme.primary }}
                    >
                      {intro}
                    </p>

                    {title && (
                      <p
                        className="mt-2 text-[30px] font-black"
                        style={{ color: theme.accent }}
                      >
                        "{title}"
                      </p>
                    )}
                  </div>
                )}

                {body && (
                  <p
                    className="mt-7 max-w-[650px] text-[21px] font-medium leading-[1.9]"
                    style={{ color: theme.secondary }}
                  >
                    {body}
                  </p>
                )}

                {body && reminder && (
                  <div className="my-6 flex w-[390px] items-center justify-center gap-4">
                    <span
                      className="h-[2px] flex-1"
                      style={{ backgroundColor: theme.accent }}
                    />
                    <span
                      className="text-2xl"
                      style={{ color: theme.accent }}
                    >
                      ◆
                    </span>
                    <span
                      className="h-[2px] flex-1"
                      style={{ backgroundColor: theme.accent }}
                    />
                  </div>
                )}

                {reminder && (
                  <div className="max-w-[650px]">
                    <p
                      className="mb-3 text-[23px] font-black"
                      style={{ color: theme.reminder }}
                    >
                      تذكر دائماً:
                    </p>

                    <p
                      className="text-[20px] font-extrabold leading-[1.9]"
                      style={{ color: theme.reminder }}
                    >
                      {reminder}
                    </p>
                  </div>
                )}

                {!intro && !body && !reminder && (
                  <div
                    className="select-none text-center opacity-30"
                    style={{ color: theme.secondary }}
                  >
                    <div className="text-4xl">✦</div>
                    <p className="mt-3 text-lg font-bold">
                      أدخل موضوع التوجيه ثم أنشئ المحتوى بالذكاء الاصطناعي
                    </p>
                  </div>
                )}
              </div>

              <span
                className="absolute bottom-5 left-7 h-[2px] w-24"
                style={{ backgroundColor: theme.border }}
              />
            </main>

            {/* اسم المنصة */}
            <div
              className="mt-4 flex items-center justify-center gap-3 text-[12px] font-bold"
              style={{ color: theme.secondary }}
            >
              <span
                className="h-px w-12"
                style={{ backgroundColor: theme.accent }}
              />
              <span>{BRAND.platform}</span>
              <span
                className="h-px w-12"
                style={{ backgroundColor: theme.accent }}
              />
            </div>

            {/* الحقوق */}
            <div className="mt-3 text-left text-[7px] font-medium text-gray-400">
              {BRAND.copyright}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
