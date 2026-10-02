import { useEffect, useRef, useState } from "react";
import { Check, Copy, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { generateCounselorAssistant } from "@/lib/deepseek.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const TASKS = [
  { value: "message", label: "صياغة رسالة مهنية", hint: "لولي أمر أو طالب أو معلم" },
  { value: "plan", label: "بناء خطة إرشادية", hint: "هدف، خطوات، مؤشر نجاح ومتابعة" },
  { value: "next_steps", label: "اقتراح الخطوات التالية", hint: "للمراجعة قبل التوثيق أو الإحالة" },
] as const;

const AUDIENCES = ["ولي أمر", "طالب", "معلم", "إدارة المدرسة", "الموجه الطلابي"] as const;

type Task = (typeof TASKS)[number]["value"];
type Audience = (typeof AUDIENCES)[number];

export function AiCounselorAssistant({ compact = false }: { compact?: boolean }) {
  const [task, setTask] = useState<Task>("message");
  const [audience, setAudience] = useState<Audience>("ولي أمر");
  const [brief, setBrief] = useState("");
  const [answer, setAnswer] = useState<{ answer: string; bullets: string[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!answer) return;

    window.requestAnimationFrame(() => {
      resultRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  }, [answer]);

  async function generate() {
    if (brief.trim().length < 5 || busy) return;

    setBusy(true);
    setCopied(false);

    try {
      const result = await generateCounselorAssistant({
        data: { task, audience, brief: brief.trim() },
      });

      setAnswer(result);
      toast.success("تم إنشاء النص وسيظهر أمامك في مربع «رد مستشارك الذكي»");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذّر تشغيل خدمة الذكاء الاصطناعي");
    } finally {
      setBusy(false);
    }
  }

  async function copyAnswer() {
    if (!answer) return;

    await navigator.clipboard.writeText([answer.answer, ...answer.bullets].join("\n"));
    setCopied(true);
    toast.success("تم نسخ النص");
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <section
      dir="rtl"
      className="dashboard-panel rounded-3xl border border-primary/20 bg-card p-5 shadow-sm sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-primary/10 p-3 text-primary">
            <Sparkles className="size-5" />
          </div>

          <div>
            <h2 className="text-base font-black">مستشارك الذكي</h2>
            <p className="mt-1 text-xs leading-6 text-muted-foreground">
              اكتب ما تحتاجه، وسيصيغ لك مستشارك الذكي النص أو الخطة ويعرضها أمامك مباشرة لتراجعها
              قبل الاستخدام.
            </p>
          </div>
        </div>

        <span className="rounded-full bg-accent/20 px-3 py-1 text-[11px] font-bold text-accent-foreground">
          اقتراحات قابلة للمراجعة
        </span>
      </div>

      <div
        className={`mt-5 grid gap-4 ${compact ? "xl:grid-cols-[1fr_1.2fr]" : "xl:grid-cols-[320px_1fr]"}`}
      >
        <div className="space-y-3 rounded-2xl border bg-background/60 p-4">
          <label className="block text-xs font-bold">نوع المساعدة</label>

          <select
            value={task}
            onChange={(event) => setTask(event.target.value as Task)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {TASKS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>

          <p className="text-[11px] leading-5 text-muted-foreground">
            {TASKS.find((item) => item.value === task)?.hint}
          </p>

          <label className="block pt-2 text-xs font-bold">الجمهور</label>

          <select
            value={audience}
            onChange={(event) => setAudience(event.target.value as Audience)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {AUDIENCES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-2 block text-xs font-bold">اكتب طلبك هنا</label>
            <Textarea
              value={brief}
              onChange={(event) => setBrief(event.target.value)}
              rows={compact ? 4 : 5}
              placeholder={
                task === "message"
                  ? "مثال: أريد رسالة قصيرة لولي أمر طالب يحتاج إلى متابعة في المواظبة دون ذكر معلومات شخصية."
                  : task === "plan"
                    ? "مثال: أحتاج خطة وقائية لتعزيز الاستعداد للاختبارات لطلاب المرحلة المتوسطة."
                    : "مثال: تمت مقابلة الطالب حول تكرر التأخر، ما الخطوات العامة التالية التي ينبغي مراجعتها؟"
              }
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-xl text-[11px] leading-5 text-muted-foreground">
              لا تكتب اسم الطالب أو رقم هويته أو هاتفه أو أي معلومة تعريفية. ستتم محجبة الأرقام
              آليًا، لكن راجع النص قبل الإرسال.
            </p>

            <Button
              onClick={() => void generate()}
              disabled={busy || brief.trim().length < 5}
              className="gap-2"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              {busy ? "جارٍ الكتابة..." : "اكتب النص"}
            </Button>
          </div>

          <div
            ref={resultRef}
            aria-live="polite"
            className="rounded-2xl border border-primary/25 bg-primary/5 p-4 shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-black">رد مستشارك الذكي</h3>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  النص الذي يتم إنشاؤه سيظهر هنا مباشرة.
                </p>
              </div>

              {answer && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void copyAnswer()}
                  className="gap-2"
                >
                  {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  {copied ? "تم النسخ" : "نسخ النص"}
                </Button>
              )}
            </div>

            {answer ? (
              <>
                <div className="mt-4 rounded-xl border bg-background p-4">
                  <p className="whitespace-pre-wrap text-sm leading-8">{answer.answer}</p>
                </div>

                {answer.bullets.length > 0 && (
                  <div className="mt-4">
                    <p className="mb-2 text-xs font-black">نقاط مساعدة إضافية</p>
                    <ul className="space-y-2 text-xs leading-6">
                      {answer.bullets.map((bullet) => (
                        <li key={bullet} className="flex gap-2">
                          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <p className="mt-4 text-[11px] font-bold text-amber-700">
                  تنبيه: راجع النص قبل اعتماده أو إرساله وتأكد من ملاءمته ودقته.
                </p>
              </>
            ) : (
              <div className="mt-4 flex min-h-28 items-center justify-center rounded-xl border border-dashed bg-background/70 p-5 text-center">
                <p className="max-w-sm text-sm leading-7 text-muted-foreground">
                  بعد كتابة طلبك والضغط على «اكتب النص» سيظهر الرد هنا، ولن تحتاج للبحث عنه في أي
                  صفحة أخرى.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
