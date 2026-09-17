import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useServerFn } from "@tanstack/react-start";
import { toPng } from "html-to-image";
import {
  Check,
  Copy,
  Loader2,
  Palette,
  Printer,
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

/* =========================================================
   بيانات المدرسة الرسمية
========================================================= */
const SCHOOL_INFO = {
  ministry: "المملكة العربية السعودية",
  authority: "وزارة التعليم",
  department: "إدارة التعليم بمنطقة مكة المكرمة",
  school: "متوسطة العلاء بن الحضرمي",
  watermark: "متوسطة العلاء بن الحضرمي",
} as const;

/* =========================================================
   حدود النصوص — لضمان عدم خروج المحتوى عن حدود صفحة A4
========================================================= */
const FIELD_LIMITS = {
  title: 60,
  intro: 220,
  body: 520,
  reminder: 260,
} as const;

const DEFAULT_CONTENT = {
  title: "",
  intro: "",
  body: "",
  reminder: "",
};

const DRAFT_STORAGE_KEY = "weekly-guidance-draft-v1";
const AUTOSAVE_DEBOUNCE_MS = 600;

/* =========================================================
   الثيمات البصرية
========================================================= */
const THEMES = {
  formal: {
    key: "formal",
    label: "رسمي ذهبي",
    primary: "#8a6f3e",
    accent: "#c9b48a",
    headerBg: "linear-gradient(135deg, #faf8f3 0%, #f4f1ea 100%)",
    frameBorder: "#c9b48a",
    cornerDecoration: "brackets",
  },
  calm: {
    key: "calm",
    label: "هادئ أزرق",
    primary: "#1e3a5f",
    accent: "#7ba6c9",
    headerBg: "linear-gradient(135deg, #f5f9fc 0%, #eaf2f8 100%)",
    frameBorder: "#7ba6c9",
    cornerDecoration: "dots",
  },
  energetic: {
    key: "energetic",
    label: "نشيط برتقالي",
    primary: "#b45309",
    accent: "#f59e0b",
    headerBg: "linear-gradient(135deg, #fffaf0 0%, #fef3e2 100%)",
    frameBorder: "#f59e0b",
    cornerDecoration: "dynamic",
  },
  spiritual: {
    key: "spiritual",
    label: "روحاني أخضر",
    primary: "#14532d",
    accent: "#65a30d",
    headerBg: "linear-gradient(135deg, #f7fbf5 0%, #eef7e9 100%)",
    frameBorder: "#65a30d",
    cornerDecoration: "star",
  },
  creative: {
    key: "creative",
    label: "إبداعي بنفسجي",
    primary: "#5b21b6",
    accent: "#a78bfa",
    headerBg: "linear-gradient(135deg, #faf8ff 0%, #f3efff 100%)",
    frameBorder: "#a78bfa",
    cornerDecoration: "playful",
  },
} as const;

type ThemeKey = keyof typeof THEMES;
type Theme = (typeof THEMES)[ThemeKey];

function isThemeKey(value: unknown): value is ThemeKey {
  return typeof value === "string" && value in THEMES;
}

type DraftShape = {
  topic: string;
  title: string;
  intro: string;
  body: string;
  reminder: string;
  docNumber: string;
  docDate: string;
  themeKey: ThemeKey;
};

/* =========================================================
   أدوات مساعدة
========================================================= */
function watermarkBackground(text: string, color: string): string {
  const safe = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="420" height="240" viewBox="0 0 420 240">
      <g fill="${color}" fill-opacity="0.05" font-family="Cairo, Arial, sans-serif" font-size="24" font-weight="700">
        <text x="10" y="80" transform="rotate(-18 210 80)">${safe}</text>
        <text x="-70" y="190" transform="rotate(-18 210 190)">${safe}</text>
      </g>
    </svg>
  `;

  return `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}")`;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return "حدث خطأ غير متوقع. حاول مرة أخرى.";
}

function readDraft(): Partial<DraftShape> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Partial<DraftShape>) : null;
  } catch {
    return null;
  }
}

function writeDraft(draft: DraftShape) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch {
    /* تجنب توقف التطبيق في حال امتلأ التخزين */
  }
}

function clearDraft() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/* =========================================================
   زخارف الأركان
========================================================= */
function CornerOrnaments({ theme }: { theme: Theme }) {
  const { primary, accent, cornerDecoration } = theme;
  const corners = [
    "right-3 top-3",
    "left-3 top-3",
    "right-3 bottom-3",
    "left-3 bottom-3",
  ];

  switch (cornerDecoration) {
    case "brackets":
      return (
        <>
          <span className="pointer-events-none absolute right-3 top-3 size-8" style={{ borderTop: `2px solid ${primary}`, borderRight: `2px solid ${primary}` }} />
          <span className="pointer-events-none absolute left-3 top-3 size-8" style={{ borderTop: `2px solid ${primary}`, borderLeft: `2px solid ${primary}` }} />
          <span className="pointer-events-none absolute right-3 bottom-3 size-8" style={{ borderBottom: `2px solid ${primary}`, borderRight: `2px solid ${primary}` }} />
          <span className="pointer-events-none absolute left-3 bottom-3 size-8" style={{ borderBottom: `2px solid ${primary}`, borderLeft: `2px solid ${primary}` }} />
        </>
      );
    case "dots":
      return (
        <>
          {corners.map((pos, i) => (
            <span key={i} className={`pointer-events-none absolute ${pos} size-3 rounded-full`} style={{ background: accent, opacity: 0.6 }} />
          ))}
        </>
      );
    case "dynamic":
      return (
        <>
          <span className="pointer-events-none absolute right-0 top-0 h-16 w-16" style={{ background: `linear-gradient(135deg, ${accent}44, transparent 70%)`, clipPath: "polygon(100% 0, 0 0, 100% 100%)" }} />
          <span className="pointer-events-none absolute left-0 top-0 h-16 w-16" style={{ background: `linear-gradient(-135deg, ${accent}44, transparent 70%)`, clipPath: "polygon(0 0, 100% 0, 0 100%)" }} />
          <span className="pointer-events-none absolute right-0 bottom-0 h-16 w-16" style={{ background: `linear-gradient(45deg, ${accent}44, transparent 70%)`, clipPath: "polygon(100% 0, 100% 100%, 0 100%)" }} />
          <span className="pointer-events-none absolute left-0 bottom-0 h-16 w-16" style={{ background: `linear-gradient(-45deg, ${accent}44, transparent 70%)`, clipPath: "polygon(0 0, 100% 100%, 0 100%)" }} />
        </>
      );
    case "star":
      return (
        <>
          {corners.map((pos, i) => (
            <span key={i} className={`pointer-events-none absolute ${pos} size-5 rotate-45`} style={{ border: `1.5px solid ${accent}`, opacity: 0.7 }} />
          ))}
        </>
      );
    case "playful":
      return (
        <>
          <span className="pointer-events-none absolute right-4 top-4 size-3 rounded-full" style={{ background: primary, opacity: 0.4 }} />
          <span className="pointer-events-none absolute left-5 top-6 size-2.5 rounded-full" style={{ background: accent, opacity: 0.55 }} />
          <span className="pointer-events-none absolute right-6 bottom-5 size-3 rounded-full" style={{ background: accent, opacity: 0.5 }} />
          <span className="pointer-events-none absolute left-4 bottom-4 size-3.5 rounded-full" style={{ background: primary, opacity: 0.4 }} />
        </>
      );
    default:
      return null;
  }
}

/* =========================================================
   فاصل زخرفي
========================================================= */
function ThemedDivider({ theme, width = 16 }: { theme: Theme; width?: number }) {
  return (
    <div className="flex items-center justify-center gap-2 my-2">
      <div className="h-px" style={{ width: `${width}rem`, background: `linear-gradient(to left, transparent, ${theme.accent})` }} />
      <div className="size-2 rotate-45" style={{ background: theme.primary }} />
      <div className="h-px" style={{ width: `${width}rem`, background: `linear-gradient(to right, transparent, ${theme.accent})` }} />
    </div>
  );
}

/* =========================================================
   مبدّل الثيمات
========================================================= */
function ThemeSwitcher({
  activeKey,
  disabled,
  onSelect,
}: {
  activeKey: ThemeKey;
  disabled: boolean;
  onSelect: (key: ThemeKey) => void;
}) {
  return (
    <div>
      <Label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <Palette className="size-3.5" />
        الثيم البصري (تلقائي مع الذكاء الاصطناعي أو يدوي)
      </Label>
      <div className="mt-2 flex flex-wrap gap-2" role="radiogroup">
        {Object.values(THEMES).map((t) => {
          const active = activeKey === t.key;
          return (
            <button
              key={t.key}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => onSelect(t.key)}
              className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50"
              style={{
                background: active ? t.primary : "transparent",
                borderColor: active ? t.primary : "#e5e7eb",
                color: active ? "#ffffff" : "#374151",
              }}
            >
              <span
                className="size-2.5 rounded-full"
                style={{
                  background: active ? "#ffffff" : t.primary,
                }}
              />
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* =========================================================
   حقل نصي مع عدّاد
========================================================= */
function CountedTextarea({
  id,
  label,
  value,
  maxLength,
  disabled,
  rows,
  placeholder,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  maxLength: number;
  disabled: boolean;
  rows: number;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  const remaining = maxLength - value.length;
  const isNearLimit = remaining <= Math.max(20, maxLength * 0.1);

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <Label htmlFor={id} className="text-xs font-semibold text-muted-foreground">
          {label}
        </Label>
        <span
          className={`text-[11px] tabular-nums ${isNearLimit ? "font-bold text-amber-600" : "text-muted-foreground"}`}
        >
          {value.length}/{maxLength}
        </span>
      </div>
      <Textarea
        id={id}
        value={value}
        disabled={disabled}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="mt-1.5 resize-y leading-7"
        placeholder={placeholder}
      />
    </div>
  );
}

/* =========================================================
   المكوّن الرئيسي
========================================================= */
export function WeeklyGuidancePoster() {
  const generateWeeklyGuidance = useServerFn(draftWeeklyGuidance);
  const posterRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const hasLoadedDraft = useRef(false);

  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [copied, setCopied] = useState(false);

  const [title, setTitle] = useState(DEFAULT_CONTENT.title);
  const [intro, setIntro] = useState(DEFAULT_CONTENT.intro);
  const [body, setBody] = useState(DEFAULT_CONTENT.body);
  const [reminder, setReminder] = useState(DEFAULT_CONTENT.reminder);

  const [docNumber, setDocNumber] = useState("");
  const [docDate, setDocDate] = useState("");

  const [themeKey, setThemeKey] = useState<ThemeKey>("formal");
  const theme = THEMES[themeKey];

  /* ---------- استرجاع المسودة ---------- */
  useEffect(() => {
    if (hasLoadedDraft.current) return;
    hasLoadedDraft.current = true;

    const draft = readDraft();
    if (!draft) return;

    if (draft.topic) setTopic(draft.topic);
    if (draft.title) setTitle(draft.title);
    if (draft.intro) setIntro(draft.intro);
    if (draft.body) setBody(draft.body);
    if (draft.reminder) setReminder(draft.reminder);
    if (draft.docNumber) setDocNumber(draft.docNumber);
    if (draft.docDate) setDocDate(draft.docDate);
    if (isThemeKey(draft.themeKey)) setThemeKey(draft.themeKey);

    toast.message("تم استرجاع مسودة محفوظة سابقًا.");
  }, []);

  /* ---------- حفظ تلقائي مؤجل ---------- */
  useEffect(() => {
    if (!hasLoadedDraft.current) return;

    const hasContent =
      topic.trim() || title.trim() || intro.trim() || body.trim() || reminder.trim();

    const timeout = window.setTimeout(() => {
      if (hasContent) {
        writeDraft({ topic, title, intro, body, reminder, docNumber, docDate, themeKey });
      } else {
        clearDraft();
      }
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => window.clearTimeout(timeout);
  }, [topic, title, intro, body, reminder, docNumber, docDate, themeKey]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const watermarkStyle = useMemo<CSSProperties>(
    () => ({
      backgroundImage: watermarkBackground(SCHOOL_INFO.watermark, theme.primary),
      backgroundRepeat: "repeat",
      backgroundPosition: "center",
    }),
    [theme.primary],
  );

  /* ---------- التوليد بالذكاء الاصطناعي ---------- */
  const generate = useCallback(async () => {
    const cleanTopic = topic.trim();
    if (cleanTopic.length < 2) {
      toast.error("اكتب موضوع التوجيه أولاً، مثل: الأمانة، احترام الوقت، التنمر...");
      return;
    }

    if (busy || exporting) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setBusy(true);

    try {
      const result = await generateWeeklyGuidance({ data: { topic: cleanTopic } });

      if (controller.signal.aborted) return;

      if (result?.title) setTitle(String(result.title).slice(0, FIELD_LIMITS.title));
      if (result?.intro) setIntro(String(result.intro).slice(0, FIELD_LIMITS.intro));
      if (result?.body) setBody(String(result.body).slice(0, FIELD_LIMITS.body));
      if (result?.reminder) setReminder(String(result.reminder).slice(0, FIELD_LIMITS.reminder));

      const aiTheme =
        (result as { theme?: unknown })?.theme ??
        (result as { style?: unknown })?.style ??
        (result as { mood?: unknown })?.mood;

      if (isThemeKey(aiTheme)) {
        setThemeKey(aiTheme);
      }

      toast.success("تم توليد نص التوجيه بنجاح.");
    } catch (error) {
      if (controller.signal.aborted) return;
      console.error("Weekly guidance generation error:", error);
      toast.error(getErrorMessage(error));
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }, [busy, exporting, generateWeeklyGuidance, topic]);

  const resetContent = useCallback(() => {
    const hasContent =
      topic.trim() || title.trim() || intro.trim() || body.trim() || reminder.trim();

    if (hasContent && !window.confirm("سيتم مسح كل الحقول الحالية. هل أنت متأكد؟")) {
      return;
    }

    setTopic("");
    setTitle(DEFAULT_CONTENT.title);
    setIntro(DEFAULT_CONTENT.intro);
    setBody(DEFAULT_CONTENT.body);
    setReminder(DEFAULT_CONTENT.reminder);
    setDocNumber("");
    setDocDate("");
    setThemeKey("formal");
    clearDraft();
    toast.success("تمت إعادة ضبط النموذج.");
  }, [body, intro, reminder, title, topic]);

  async function waitForImages(element: HTMLElement) {
    const images = Array.from(element.querySelectorAll("img"));
    await Promise.all(
      images.map((image) => {
        if (image.complete) return Promise.resolve();
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

  function buildMessageText() {
    return [
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
      .filter((line, i, arr) => !(line === "" && arr[i - 1] === ""))
      .join("\n")
      .trim();
  }

  async function copyText() {
    if (!title.trim() && !intro.trim() && !body.trim()) {
      toast.error("لا يوجد نص لنسخه بعد.");
      return;
    }

    try {
      await navigator.clipboard.writeText(buildMessageText());
      setCopied(true);
      toast.success("تم نسخ النص إلى الحافظة.");
      window.setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Copy error:", error);
      toast.error("تعذّر نسخ النص.");
    }
  }

  function printPoster() {
    if (busy || exporting) return;
    window.print();
  }

  async function shareToWhatsApp() {
    if (!posterRef.current || busy || exporting) return;

    setExporting(true);

    try {
      await waitForImages(posterRef.current);

      const messageText = buildMessageText();
      const dataUrl = await toPng(posterRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
        skipFonts: false,
      });

      const safeTitle =
        title.trim().replace(/[\\/:*?"<>|]/g, "-").slice(0, 60) || "الأسبوعي";
      const fileName = `التوجيه_الطلابي_${safeTitle}.png`;

      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const file = new File([blob], fileName, { type: "image/png" });

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
          toast.success("تم فتح نافذة المشاركة.");
          return;
        } catch (err) {
          if ((err as { name?: string })?.name === "AbortError") return;
        }
      }

      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();

      const waUrl = `https://wa.me/?text=${encodeURIComponent(messageText)}`;
      window.open(waUrl, "_blank", "noopener,noreferrer");

      toast.success("تم تنزيل الصورة وفتح واتساب.");
    } catch (error) {
      console.error("WhatsApp share error:", error);
      toast.error("تعذّر تجهيز المشاركة.");
    } finally {
      setExporting(false);
    }
  }

  const isDisabled = busy || exporting;
  const canExport = Boolean(title.trim() || intro.trim() || body.trim());

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:p-6" dir="rtl">
      {/* =========================================================
          لوحة التحكم
      ========================================================== */}
      <section className="overflow-hidden rounded-3xl border bg-card shadow-sm print:hidden">
        <div className="border-b bg-gradient-to-l from-primary/10 via-primary/5 to-transparent px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Sparkles className="size-5" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold">التوجيه الطلابي الأسبوعي</h2>
                <p className="text-xs text-muted-foreground">
                  إعداد خطاب توجيهي رسمي بالذكاء الاصطناعي
                </p>
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
              <Label htmlFor="topic" className="font-bold">
                موضوع التوجيه الأسبوعي
              </Label>
              <Input
                id="topic"
                className="mt-1.5 h-11"
                placeholder="مثال: الأمانة، احترام الوقت، التنمر..."
                value={topic}
                disabled={isDisabled}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isDisabled) {
                    e.preventDefault();
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
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              {busy ? "جارٍ التوليد..." : "توليد بالذكاء الاصطناعي"}
            </Button>
          </div>

          {/* اختيار الثيم */}
          <div className="mt-5">
            <ThemeSwitcher activeKey={themeKey} disabled={isDisabled} onSelect={setThemeKey} />
          </div>

          {/* صادر / تاريخ */}
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="docNumber" className="text-xs font-semibold text-muted-foreground">
                رقم الصادر (اختياري)
              </Label>
              <Input
                id="docNumber"
                className="mt-1.5"
                placeholder="مثال: 1447/123"
                value={docNumber}
                disabled={isDisabled}
                onChange={(e) => setDocNumber(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="docDate" className="text-xs font-semibold text-muted-foreground">
                التاريخ (اختياري)
              </Label>
              <Input
                id="docDate"
                className="mt-1.5"
                placeholder="مثال: 1447/03/15هـ"
                value={docDate}
                disabled={isDisabled}
                onChange={(e) => setDocDate(e.target.value)}
              />
            </div>
          </div>

          {/* الحقول */}
          <div className="mt-6 grid gap-4">
            <div>
              <div className="flex items-baseline justify-between">
                <Label htmlFor="title" className="text-xs font-semibold text-muted-foreground">
                  العنوان / الكلمة المحورية
                </Label>
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {title.length}/{FIELD_LIMITS.title}
                </span>
              </div>
              <Input
                id="title"
                value={title}
                disabled={isDisabled}
                maxLength={FIELD_LIMITS.title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1.5 font-bold"
                placeholder="مثال: الانضباط، الأمانة..."
              />
            </div>

            <CountedTextarea
              id="intro"
              label="الفقرة التمهيدية"
              value={intro}
              maxLength={FIELD_LIMITS.intro}
              disabled={isDisabled}
              rows={3}
              placeholder="اكتب أو ولّد بالذكاء الاصطناعي..."
              onChange={setIntro}
            />

            <CountedTextarea
              id="body"
              label="الفقرة التفصيلية"
              value={body}
              maxLength={FIELD_LIMITS.body}
              disabled={isDisabled}
              rows={5}
              onChange={setBody}
            />

            <CountedTextarea
              id="reminder"
              label="التذكير الختامي"
              value={reminder}
              maxLength={FIELD_LIMITS.reminder}
              disabled={isDisabled}
              rows={4}
              onChange={setReminder}
            />
          </div>

          {/* الأزرار */}
          <div className="mt-6 flex flex-wrap items-center gap-2 border-t pt-5">
            <Button
              type="button"
              onClick={() => void shareToWhatsApp()}
              disabled={isDisabled || !canExport}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {exporting ? <Loader2 className="size-4 animate-spin" /> : <Share2 className="size-4" />}
              إرسال للواتساب
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={printPoster}
              disabled={isDisabled || !canExport}
            >
              <Printer className="size-4" />
              طباعة
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => void copyText()}
              disabled={isDisabled || !canExport}
            >
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? "تم النسخ" : "نسخ النص"}
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
          المعاينة — A4 (794 × 1123)
      ========================================================== */}
      <section className="flex justify-center overflow-auto rounded-3xl border bg-muted/30 p-3 sm:p-5 print:border-0 print:bg-transparent print:p-0">
        <div
          id="printable-poster"
          ref={posterRef}
          dir="rtl"
          className="relative overflow-hidden bg-white text-[#1f2937] shadow-xl print:shadow-none"
          style={{
            width: "794px",
            height: "1123px",
            minWidth: "794px",
            minHeight: "1123px",
            maxHeight: "1123px",
            padding: "48px 56px",
            fontFamily: "'Cairo', sans-serif",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            ...watermarkStyle,
          }}
        >
          <CornerOrnaments theme={theme} />

          {/* الجزء العلوي: الترويسة والمحتوى */}
          <div className="flex flex-col gap-6">
            <header>
              <p
                className="mb-2 text-center text-xs font-semibold"
                style={{ color: theme.primary }}
              >
                بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
              </p>

              <div
                className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 rounded-[20px] px-6 py-4"
                style={{
                  background: theme.headerBg,
                  border: `1px solid ${theme.accent}66`,
                  boxShadow: "0 4px 18px rgba(0,0,0,0.04)",
                }}
              >
                <div className="text-right text-[11px] font-bold leading-6 text-[#1f2937]">
                  <p className="font-extrabold">{SCHOOL_INFO.ministry}</p>
                  <p>{SCHOOL_INFO.authority}</p>
                  <p>{SCHOOL_INFO.department}</p>
                  <div
                    className="my-1 h-px w-12"
                    style={{ background: theme.accent }}
                  />
                  <p className="text-[12px] font-extrabold" style={{ color: theme.primary }}>
                    {SCHOOL_INFO.school}
                  </p>
                </div>

                <div className="flex flex-col items-center justify-center">
                  <img
                    src={moeLogo}
                    alt="شعار وزارة التعليم"
                    className="max-h-[74px] max-w-[96px] object-contain"
                    crossOrigin="anonymous"
                    loading="eager"
                  />
                </div>

                <div className="text-left text-[11px] font-bold leading-6 text-[#1f2937]">
                  <p className="text-[14px] font-extrabold" style={{ color: theme.primary }}>
                    التوجيه الطلابي
                  </p>
                  <p className="text-[#4b5563]">الأسبوعي</p>
                  <div
                    className="my-1 h-px w-12 ml-auto"
                    style={{ background: theme.accent }}
                  />
                  {docNumber && <p>الرقم: {docNumber}</p>}
                  {docDate && <p>التاريخ: {docDate}</p>}
                </div>
              </div>
            </header>

            <ThemedDivider theme={theme} />

            {/* العنوان والمحتوى الرئيسي */}
            <main className="flex flex-col gap-5 text-center mt-2">
              {title && (
                <div className="inline-block mx-auto rounded-xl px-6 py-2" style={{ background: `${theme.accent}22`, border: `1px solid ${theme.accent}44` }}>
                  <h1 className="text-2xl font-black" style={{ color: theme.primary }}>
                    {title}
                  </h1>
                </div>
              )}

              {intro && (
                <p className="text-base font-semibold leading-relaxed text-gray-800 px-4">
                  {intro}
                </p>
              )}

              {body && (
                <div
                  className="rounded-2xl p-6 text-right text-sm leading-8 text-gray-700 bg-gray-50/80 border"
                  style={{ borderColor: `${theme.accent}33` }}
                >
                  {body}
                </div>
              )}

              {reminder && (
                <div
                  className="rounded-xl p-4 text-center text-xs font-bold leading-6"
                  style={{
                    background: theme.headerBg,
                    color: theme.primary,
                    border: `1px dashed ${theme.accent}`,
                  }}
                >
                  <span className="block text-sm font-extrabold mb-1">تذكر دائماً</span>
                  {reminder}
                </div>
              )}
            </main>
          </div>

          {/* الجزء السفلي: التوقيع والختام */}
          <footer className="mt-auto border-t pt-4" style={{ borderColor: `${theme.accent}44` }}>
            <div className="flex items-end justify-between px-6 text-xs font-bold text-gray-600">
              <div className="text-right">
                <p>الموجه الطلابي</p>
                <p className="mt-6 text-gray-400">( التوقيع )</p>
              </div>
              <div className="text-left">
                <p>مدير المدرسة</p>
                <p className="mt-6 text-gray-400">( الاعتماد )</p>
              </div>
            </div>
          </footer>
        </div>
      </section>
    </div>
  );
}
