import { useMemo, useRef, useState, type CSSProperties } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toPng } from "html-to-image";
import {
  Loader2,
  RotateCcw,
  Share2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { draftWeeklyGuidance } from "@/lib/deepseek.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import moeLogo from "@/assets/moe-logo-official.png";

/**
 * بيانات المدرسة الافتراضية.
 *
 * يمكنك لاحقًا ربط هذه البيانات ببيانات المدرسة المحفوظة
 * في قاعدة البيانات بدلًا من كتابتها هنا.
 */
const SCHOOL_INFO = {
  ministry: "المملكة العربية السعودية",
  authority: "وزارة التعليم",
  department: "إدارة التعليم بمكة المكرمة",
  school: "متوسطة العلاء بن الحضرمي",

  /**
   * النص المستخدم كعلامة مائية خفيفة داخل المستند.
   */
  watermark: "متوسطة العلاء بن الحضرمي",
};

const DEFAULT_CONTENT = {
  title: "الانضباط",

  intro:
    "مع انطلاقة هذا الأسبوع، نضع نصب أعيننا قيمة أساسية لا غنى عنها لصناعة النجاح",

  body:
    "الانضباط ليس مجرد قوانين مدرسية نلتزم بها، بل هو مهارة حياتية وعنوان لشخصيتك الواعية والناضجة، إنه الفارق الحقيقي بين ما تود أن تكونه وما ستحققه فعلياً في حياتك.",

  reminder:
    "الطلاب المتميزون هم أكثرهم انضباطاً بالتنظيم والالتزام، فلنصنع معاً أسبوعاً دراسياً مثالياً وخالياً من التعثرات ولنثبت لأنفسنا أولاً وللجميع أننا أهل للمسؤولية.",
};

/**
 * إنشاء خلفية العلامة المائية.
 *
 * استخدمنا SVG داخل Data URL حتى تعمل العلامة المائية
 * عند تحويل العنصر إلى صورة.
 */
function watermarkBackground(text: string): string {
  const safe = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

  const svg = `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="380"
      height="220"
      viewBox="0 0 380 220"
    >
      <g
        fill="#1f2937"
        fill-opacity="0.055"
        font-family="Cairo, Arial, sans-serif"
        font-size="24"
        font-weight="700"
      >
        <text
          x="10"
          y="70"
          transform="rotate(-18 190 70)"
        >
          ${safe} ${safe}
        </text>

        <text
          x="-70"
          y="175"
          transform="rotate(-18 190 175)"
        >
          ${safe} ${safe}
        </text>
      </g>
    </svg>
  `;

  return `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}")`;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error
  ) {
    const message = (error as { message?: unknown }).message;

    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return "حدث خطأ غير متوقع. حاول مرة أخرى.";
}

export function WeeklyGuidancePoster() {
  /**
   * الاتصال بدالة الذكاء الاصطناعي الموجودة أصلًا في المشروع.
   * لا يتم إنشاء API جديد هنا.
   */
  const generateWeeklyGuidance = useServerFn(draftWeeklyGuidance);

  const posterRef = useRef<HTMLDivElement>(null);

  const [topic, setTopic] = useState("");

  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [title, setTitle] = useState(DEFAULT_CONTENT.title);
  const [intro, setIntro] = useState(DEFAULT_CONTENT.intro);
  const [body, setBody] = useState(DEFAULT_CONTENT.body);
  const [reminder, setReminder] = useState(DEFAULT_CONTENT.reminder);

  /**
   * الخلفية تحسب مرة واحدة فقط.
   */
  const watermarkStyle = useMemo<CSSProperties>(
    () => ({
      backgroundImage: watermarkBackground(SCHOOL_INFO.watermark),
      backgroundRepeat: "repeat",
      backgroundPosition: "center",
    }),
    [],
  );

  /**
   * توليد نص التوجيه بواسطة DeepSeek
   * من خلال الدالة الموجودة في المشروع.
   */
  async function generate() {
    const cleanTopic = topic.trim();

    if (cleanTopic.length < 2) {
      toast.error(
        "اكتب موضوع التوجيه أولاً، مثل: الأمانة، احترام الوقت، التنمر...",
      );
      return;
    }

    if (busy || exporting) {
      return;
    }

    setBusy(true);

    try {
      const result = await generateWeeklyGuidance({
        data: {
          topic: cleanTopic,
        },
      });

      /**
       * التحقق من وجود البيانات قبل وضعها في الحقول.
       */
      if (result?.title) {
        setTitle(String(result.title));
      }

      if (result?.intro) {
        setIntro(String(result.intro));
      }

      if (result?.body) {
        setBody(String(result.body));
      }

      if (result?.reminder) {
        setReminder(String(result.reminder));
      }

      toast.success(
        "تم توليد نص التوجيه بالذكاء الاصطناعي. راجعه وعدّله قبل الإرسال.",
      );
    } catch (error) {
      console.error("Weekly guidance generation error:", error);

      toast.error(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  /**
   * إعادة النص الافتراضي.
   */
  function resetContent() {
    setTitle(DEFAULT_CONTENT.title);
    setIntro(DEFAULT_CONTENT.intro);
    setBody(DEFAULT_CONTENT.body);
    setReminder(DEFAULT_CONTENT.reminder);

    toast.success("تمت إعادة النص الافتراضي.");
  }

  /**
   * انتظار تحميل جميع الصور داخل العنصر قبل التصدير.
   */
  async function waitForImages(element: HTMLElement) {
    const images = Array.from(element.querySelectorAll("img"));

    await Promise.all(
      images.map((image) => {
        if (image.complete) {
          return Promise.resolve();
        }

        return new Promise<void>((resolve) => {
          const done = () => {
            image.removeEventListener("load", done);
            image.removeEventListener("error", done);
            resolve();
          };

          image.addEventListener("load", done);
          image.addEventListener("error", done);
        });
      }),
    );
  }

  /**
   * إرسال اللوحة والرسالة إلى الواتساب.
   *
   * الطريقة:
   * 1) نحاول استخدام Web Share API لمشاركة الصورة مباشرة (يعمل ممتاز على الجوال).
   * 2) إن لم يكن مدعومًا (كمعظم أجهزة الكمبيوتر):
   *    - ننزّل الصورة تلقائيًا.
   *    - نفتح واتساب بالنص جاهزًا، ويُرفق المستخدم الصورة يدويًا.
   */
  async function shareToWhatsApp() {
    if (!posterRef.current || busy || exporting) {
      return;
    }

    setExporting(true);

    try {
      /**
       * التأكد من تحميل الصور (الشعارات) قبل التصدير.
       */
      await waitForImages(posterRef.current);

      /**
       * نص الرسالة المرسل مع الصورة.
       */
      const messageText = [
        `*${title.trim() || "التوجيه الطلابي"}*`,
        "",
        intro.trim(),
        "",
        body.trim(),
        "",
        reminder.trim() ? `*تذكر دائماً:*\n${reminder.trim()}` : "",
        "",
        `— ${SCHOOL_INFO.school}`,
      ]
        .filter((line, index, arr) => {
          // إزالة الأسطر الفارغة المتتالية.
          if (line === "" && arr[index - 1] === "") {
            return false;
          }
          return true;
        })
        .join("\n")
        .trim();

      /**
       * توليد صورة اللوحة.
       * pixelRatio = 2 لتقليل حجم الملف حتى لا يفشل الإرسال في واتساب.
       */
      const dataUrl = await toPng(posterRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
        skipFonts: false,
      });

      const safeTitle =
        title
          .trim()
          .replace(/[\\/:*?"<>|]/g, "-")
          .slice(0, 60) || "الأسبوعي";

      const fileName = `التوجيه_الطلابي_${safeTitle}.png`;

      /**
       * تحويل الصورة إلى File لمشاركتها.
       */
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const file = new File([blob], fileName, { type: "image/png" });

      /**
       * المحاولة الأولى: Web Share API مع الصورة.
       */
      const canShareFiles =
        typeof navigator !== "undefined" &&
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [file] });

      if (canShareFiles && typeof navigator.share === "function") {
        try {
          await navigator.share({
            files: [file],
            text: messageText,
            title: title.trim() || "التوجيه الطلابي",
          });

          toast.success("تم فتح نافذة المشاركة، اختر واتساب.");
          return;
        } catch (err) {
          // إذا ألغى المستخدم المشاركة، لا نكمل للطريقة الثانية.
          if ((err as { name?: string })?.name === "AbortError") {
            return;
          }
          // أي خطأ آخر: ننتقل للطريقة الاحتياطية.
        }
      }

      /**
       * الطريقة الاحتياطية:
       * 1) ننزّل الصورة تلقائيًا.
       * 2) نفتح واتساب بالنص جاهزًا.
       */
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();

      const waUrl = `https://wa.me/?text=${encodeURIComponent(messageText)}`;
      window.open(waUrl, "_blank", "noopener,noreferrer");

      toast.success(
        "تم تنزيل الصورة، وفتح واتساب بالنص. أرفق الصورة من المعرض.",
      );
    } catch (error) {
      console.error("WhatsApp share error:", error);

      toast.error("تعذّر تجهيز المشاركة. حاول مرة أخرى بعد لحظات.");
    } finally {
      setExporting(false);
    }
  }

  const isDisabled = busy || exporting;

  return (
    <div
      className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:p-6"
      dir="rtl"
    >
      {/* =========================================================
          لوحة التحكم
      ========================================================== */}
      <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
        {/* رأس لوحة التحكم */}
        <div className="border-b bg-gradient-to-l from-primary/10 via-primary/5 to-transparent px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Sparkles className="size-5" />
                </div>

                <div>
                  <h2 className="text-lg font-extrabold">
                    التوجيه الطلابي الأسبوعي
                  </h2>

                  <p className="text-xs text-muted-foreground">
                    إعداد لوحة توجيهية بالذكاء الاصطناعي
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-full border bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground">
              مدعوم بالذكاء الاصطناعي
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          {/* موضوع التوجيه */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <div className="flex-1">
              <Label
                htmlFor="weekly-guidance-topic"
                className="font-bold"
              >
                موضوع التوجيه الأسبوعي
              </Label>

              <Input
                id="weekly-guidance-topic"
                className="mt-1.5 h-11"
                placeholder="مثال: الأمانة، احترام الوقت، التنمر، المحافظة على الممتلكات..."
                value={topic}
                disabled={isDisabled}
                onChange={(event) => setTopic(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !isDisabled) {
                    event.preventDefault();
                    void generate();
                  }
                }}
              />
            </div>

            <Button
              type="button"
              onClick={() => void generate()}
              disabled={isDisabled}
              className="h-11 shrink-0 px-5"
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}

              {busy ? "جارٍ إعداد التوجيه..." : "توليد بالذكاء الاصطناعي"}
            </Button>
          </div>

          {/* الحقول */}
          <div className="mt-6 grid gap-4">
            <div>
              <Label
                htmlFor="weekly-guidance-title"
                className="text-xs font-semibold text-muted-foreground"
              >
                العنوان / الكلمة المحورية
              </Label>

              <Input
                id="weekly-guidance-title"
                value={title}
                disabled={isDisabled}
                onChange={(event) => setTitle(event.target.value)}
                className="mt-1.5 font-bold"
              />
            </div>

            <div>
              <Label
                htmlFor="weekly-guidance-intro"
                className="text-xs font-semibold text-muted-foreground"
              >
                الفقرة التمهيدية
              </Label>

              <Textarea
                id="weekly-guidance-intro"
                value={intro}
                disabled={isDisabled}
                onChange={(event) => setIntro(event.target.value)}
                rows={3}
                className="mt-1.5 resize-y leading-7"
              />
            </div>

            <div>
              <Label
                htmlFor="weekly-guidance-body"
                className="text-xs font-semibold text-muted-foreground"
              >
                الفقرة التفصيلية
              </Label>

              <Textarea
                id="weekly-guidance-body"
                value={body}
                disabled={isDisabled}
                onChange={(event) => setBody(event.target.value)}
                rows={5}
                className="mt-1.5 resize-y leading-7"
              />
            </div>

            <div>
              <Label
                htmlFor="weekly-guidance-reminder"
                className="text-xs font-semibold text-muted-foreground"
              >
                التذكير الختامي
              </Label>

              <Textarea
                id="weekly-guidance-reminder"
                value={reminder}
                disabled={isDisabled}
                onChange={(event) => setReminder(event.target.value)}
                rows={4}
                className="mt-1.5 resize-y leading-7"
              />
            </div>
          </div>

          {/* أزرار الإجراءات */}
          <div className="mt-6 flex flex-wrap items-center gap-2 border-t pt-5">
            <Button
              type="button"
              onClick={() => void shareToWhatsApp()}
              disabled={isDisabled}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {exporting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Share2 className="size-4" />
              )}

              إرسال للواتساب
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={resetContent}
              disabled={isDisabled}
              className="mr-auto"
            >
              <RotateCcw className="size-4" />
              إعادة ضبط
            </Button>
          </div>
        </div>
      </section>

      {/* =========================================================
          المعاينة بمقاس A4 الدقيق (794px عرض × 1123px ارتفاع)
      ========================================================== */}
      <section className="overflow-auto rounded-3xl border bg-muted/30 p-3 sm:p-5 flex justify-center">
        <div
          id="printable-poster"
          ref={posterRef}
          dir="rtl"
          className="relative overflow-hidden bg-white text-[#1f2937] shadow-xl"
          style={{
            width: "794px",
            height: "1123px",
            minWidth: "794px",
            minHeight: "1123px",
            maxHeight: "1123px",
            padding: "45px 50px",
            fontFamily: "'Cairo Variable', Cairo, Arial, sans-serif",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            {/* =====================================================
                الترويسة الرسمية
                - اليمين: بيانات وزارة التعليم والمدرسة
                - المنتصف: شعار وزارة التعليم
                - اليسار: عنوان التوجيه + مكتب التوجيه
            ====================================================== */}
            <div
              className="flex items-center justify-between gap-4 rounded-[24px] px-6 py-4"
              style={{
                background:
                  "linear-gradient(135deg, #f4f1ea 0%, #faf9f6 100%)",
                border: "1px solid rgba(201,180,138,0.35)",
                boxShadow: "0 4px 18px rgba(0,0,0,0.06)",
              }}
            >
              {/* اليمين: بيانات وزارة التعليم والمدرسة */}
              <div className="min-w-0 flex-1 text-right text-xs font-bold leading-6">
                <p>{SCHOOL_INFO.ministry}</p>
                <p>{SCHOOL_INFO.authority}</p>
                <p>{SCHOOL_INFO.department}</p>

                <p className="mt-0.5 text-sm font-extrabold">
                  {SCHOOL_INFO.school}
                </p>
              </div>

              {/* المنتصف: شعار وزارة التعليم */}
              <div className="flex h-20 w-24 shrink-0 items-center justify-center">
                <img
                  src={moeLogo}
                  alt="شعار وزارة التعليم"
                  className="max-h-20 max-w-24 object-contain"
                  crossOrigin="anonymous"
                />
              </div>

              {/* اليسار: عنوان المحتوى + مكتب التوجيه */}
              <div className="min-w-0 flex-1 text-left">
                <p className="text-lg font-extrabold text-[#1f2937]">
                  التوجيه الطلابي
                </p>

                <div
                  className="mt-1.5 h-0.5 w-10"
                  style={{
                    background: "#c9b48a",
                    marginLeft: 0,
                  }}
                />

                <p className="mt-1.5 text-xs font-bold text-muted-foreground">
                  مكتب التوجيه
                </p>
              </div>
            </div>

            {/* =====================================================
                الإطار الرئيسي
            ====================================================== */}
            <div
              className="relative mt-6 overflow-hidden rounded-sm"
              style={{
                height: "790px",
                border: "2px solid #c9b48a",
                padding: "36px 40px",
                boxSizing: "border-box",
                ...watermarkStyle,
              }}
            >
              {/* الزاوية العلوية اليمنى */}
              <span
                className="absolute right-0 top-0 size-6"
                style={{
                  borderBottom: "2px solid #c9b48a",
                  borderLeft: "2px solid #c9b48a",
                  clipPath: "polygon(100% 0, 0 0, 100% 100%)",
                }}
              />

              {/* الزاوية السفلية اليسرى */}
              <span
                className="absolute bottom-0 left-0 size-6"
                style={{
                  borderRight: "2px solid #c9b48a",
                  borderTop: "2px solid #c9b48a",
                  clipPath: "polygon(0 100%, 100% 100%, 0 0)",
                }}
              />

              {/* المحتوى */}
              <div className="relative flex h-full flex-col items-center justify-around text-center">
                {/* المقدمة */}
                {intro.trim() && (
                  <div className="w-full max-w-[580px]">
                    <p
                      className="text-lg font-bold leading-[2]"
                      style={{
                        overflowWrap: "anywhere",
                      }}
                    >
                      {intro}
                    </p>

                    {title.trim() && (
                      <p className="mt-2 text-2xl font-extrabold">
                        &quot;{title}&quot;
                      </p>
                    )}
                  </div>
                )}

                {/* الفقرة الرئيسية */}
                {body.trim() && (
                  <div className="w-full max-w-[580px]">
                    <p
                      className="text-base leading-[2]"
                      style={{
                        overflowWrap: "anywhere",
                      }}
                    >
                      {body}
                    </p>
                  </div>
                )}

                {/* التذكير */}
                {reminder.trim() && (
                  <div
                    className="w-full max-w-[580px] rounded-2xl px-6 py-4"
                    style={{
                      background: "rgba(244,241,234,0.76)",
                      border: "1px solid rgba(201,180,138,0.45)",
                    }}
                  >
                    <p className="text-lg font-extrabold">تذكر دائماً</p>

                    <div
                      className="mx-auto mt-2 h-0.5 w-12"
                      style={{
                        background: "#c9b48a",
                      }}
                    />

                    <p
                      className="mt-3 text-base font-bold leading-[2]"
                      style={{
                        overflowWrap: "anywhere",
                      }}
                    >
                      {reminder}
                    </p>
                  </div>
                )}
              </div>

              {/* خط زخرفي */}
              <span
                className="absolute bottom-5 left-8 h-px w-20"
                style={{
                  background: "#c9b48a",
                }}
              />

              <span
                className="absolute bottom-5 right-8 h-px w-20"
                style={{
                  background: "#c9b48a",
                }}
              />
            </div>
          </div>

          {/* =====================================================
              تذييل اللوحة
          ====================================================== */}
          <div className="flex items-center justify-between px-2 text-[10px] font-semibold text-gray-400">
            <span>منصة الذات للتوجيه الطلابي</span>
            <span>{SCHOOL_INFO.school}</span>
            <span>مكتب التوجيه</span>
          </div>
        </div>
      </section>
    </div>
  );
}