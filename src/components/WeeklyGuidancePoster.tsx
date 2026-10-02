import { useMemo, useRef, useState } from "react";
import { BookOpenCheck, ImageDown, Loader2, Share2, Sparkles } from "lucide-react";
import { toPng } from "html-to-image";
import { toast } from "sonner";



import { useSchool } from "@/lib/school";
import { generateSmartFill } from "@/lib/deepseek.functions";
import { formatHijriDate } from "@/lib/date";
import { Button } from "@/components/ui/button";
import { PdfPreviewButton } from "@/components/PdfPreviewButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import moeLogo from "@/assets/moe-logo-official.png";


const WEEKLY_TEMPLATES = {
  الانضباط: {
    intro: "مع انطلاقة هذا الأسبوع، نضع نصب أعيننا قيمة أساسية لصناعة النجاح.",
    body: "الانضباط مهارة حياتية وعنوان لشخصيتك الواعية؛ فهو يساعدك على تنظيم وقتك، والوفاء بوعودك، وتحقيق أهدافك بخطوات ثابتة داخل المدرسة وخارجها.",
    reminder: "ابدأ أسبوعك بخطة واضحة، واحرص على الحضور المبكر والاستعداد الجيد.",
  },
  الاحترام: {
    intro: "بيئتنا المدرسية تزدهر حين يكون الاحترام سلوكًا نمارسه كل يوم.",
    body: "احترام المعلم والزملاء وممتلكات المدرسة والاستماع للآخرين باهتمام من أهم القيم التي تبني مجتمعًا مدرسيًا آمنًا ومنتجًا.",
    reminder: "اجعل كلماتك لطيفة، وتصرّفاتك نموذجًا يحتذى به.",
  },
  "المواطنة الرقمية": {
    intro: "التقنية فرصة للتعلم والإبداع حين نستخدمها بوعي ومسؤولية.",
    body: "المواطن الرقمي الواعي يتحقق من المعلومات قبل نشرها، ويحفظ خصوصيته، ويحترم حقوق الآخرين، ويستخدم المنصات الرقمية في كل ما ينفعه وينفع مجتمعه.",
    reminder: "فكّر قبل أن تنشر، واحمِ بياناتك وبيانات الآخرين.",
  },
  "الاستعداد للاختبارات": {
    intro: "الاستعداد المبكر هو أقصر طريق للطمأنينة والتميز في الاختبارات.",
    body: "رتّب وقتك، راجع دروسك أولاً بأول، اسأل عما يصعب عليك، ونَم جيدًا. الاختبار فرصة لإظهار ما تعلمته، وليس سببًا للقلق.",
    reminder: "الثقة تأتي من المراجعة المنتظمة والهدوء وحسن التوكل على الله.",
  },
  "الصحة النفسية": {
    intro: "سلامتك النفسية جزء مهم من نجاحك الدراسي وحياتك اليومية.",
    body: "تحدث مع شخص تثق به عندما تشعر بالضغط، ونظّم نومك ووقتك، وامنح نفسك فرصة للراحة. طلب الدعم عند الحاجة تصرف واعٍ وقوي.",
    reminder: "لست وحدك؛ تواصل مع الموجه الطلابي أو من تثق به عند الحاجة.",
  },
  التعاون: {
    intro: "بالتعاون تصبح أعمالنا المدرسية أكثر جودة وأثرًا.",
    body: "التعاون يعني أن نستمع لبعضنا، ونتقاسم المسؤوليات، ونساعد زملاءنا، ونفرح بنجاح الفريق. كل طالب له دور مهم في نجاح المجموعة.",
    reminder: "كن مبادرًا بالمساعدة، واحترم دور كل عضو في فريقك.",
  },
  "الحد من الغياب": {
    intro: "الحضور المنتظم بداية كل إنجاز دراسي وشخصي.",
    body: "احرص على الحضور في الوقت المحدد، واستفد من كل يوم دراسي. إذا واجهتك ظروف تؤثر في حضورك، فتحدث مبكرًا مع أسرتك والموجه الطلابي للوصول إلى الحل المناسب.",
    reminder: "يومك الدراسي فرصة لا تتكرر؛ كن حاضرًا ومستعدًا.",
  },
  "الأمن السيبراني": {
    intro: "أمانك الرقمي مسؤولية تبدأ من قرار صغير تتخذه كل يوم.",
    body: "استخدم كلمات مرور قوية، ولا تشارك رموز التحقق، وتحقق من الروابط والرسائل قبل فتحها، وأبلغ شخصًا بالغًا عند التعرض لمحاولة ابتزاز أو احتيال إلكتروني.",
    reminder: "توقف، تحقق، ثم شارك — ولا تحفظ بياناتك في أجهزة الآخرين.",
  },
  "التوجيه المهني": {
    intro: "اكتشاف ميولك وقدراتك يساعدك على بناء مستقبل أكثر وضوحًا.",
    body: "تعرف على نقاط قوتك، واستكشف المهن والتخصصات، واسأل أهل الخبرة، وطوّر مهاراتك بالتعلم والممارسة. القرار المهني رحلة تبدأ بخطوة واعية.",
    reminder: "موهبتك بداية، والتعلم المستمر هو طريق تحويلها إلى إنجاز.",
  },
  "المحافظة على الممتلكات": {
    intro: "المرافق المدرسية أمانة وبيئة مشتركة نتعلم وننجح فيها.",
    body: "حافظ على الفصول والمختبرات والمكتبة والمرافق، وأبلغ عن أي تلف، واستخدم الأدوات بالطريقة الصحيحة؛ فالمحافظة على الممتلكات احترام لنفسك ولمجتمعك.",
    reminder: "اترك المكان أفضل مما وجدته.",
  },
  "التهيئة النفسية": {
    intro: "التهيئة الجيدة تجعل بداية العام الدراسي أكثر طمأنينة ونجاحًا.",
    body: "نظّم نومك ووقتك، جهّز أدواتك، تعرف على أهدافك، وتحدث عما يقلقك مع شخص تثق به. المدرسة بيئة للتعلم والنمو وطلب الدعم فيها أمر طبيعي.",
    reminder: "بداية صغيرة منظمة تصنع أسبوعًا دراسيًا ناجحًا.",
  },
} as const;

type WeeklyTopic = keyof typeof WEEKLY_TEMPLATES;

function watermarkBackground(text: string) {
  const safe = text.replace(/[<>&]/g, "");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="380" height="200"><text x="10" y="70" font-family="Cairo, sans-serif" font-size="24" font-weight="700" fill="#08667a" fill-opacity="0.055" transform="rotate(-18 190 70)">${safe} ${safe}</text><text x="-60" y="170" font-family="Cairo, sans-serif" font-size="24" font-weight="700" fill="#08667a" fill-opacity="0.055" transform="rotate(-18 190 170)">${safe} ${safe}</text></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

export function WeeklyGuidancePoster() {
  const { data: school } = useSchool();
  const posterRef = useRef<HTMLDivElement>(null);

  const [topic, setTopic] = useState<WeeklyTopic>("الانضباط");
  const [title, setTitle] = useState<string>("الانضباط");
  const [intro, setIntro] = useState<string>(WEEKLY_TEMPLATES["الانضباط"].intro);
  const [body, setBody] = useState<string>(WEEKLY_TEMPLATES["الانضباط"].body);
  const [reminder, setReminder] = useState<string>(WEEKLY_TEMPLATES["الانضباط"].reminder);
  const [aiBrief, setAiBrief] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [sharing, setSharing] = useState(false);

  const watermarkStyle = useMemo(
    () => ({
      backgroundImage: watermarkBackground(school?.school_name || "الذات"),
      backgroundRepeat: "repeat" as const,
    }),
    [school?.school_name],
  );

  function applyTemplate(nextTopic: WeeklyTopic) {
    const template = WEEKLY_TEMPLATES[nextTopic];
    setTopic(nextTopic);
    setTitle(nextTopic);
    setIntro(template.intro);
    setBody(template.body);
    setReminder(template.reminder);
  }


  async function fillWithAI() {
    const brief = aiBrief.trim() || title.trim();
    if (brief.length < 2) {
      toast.info("اكتب موضوع الأسبوع أو فكرة مختصرة أولاً.");
      return;
    }
    setAiLoading(true);
    try {
      const result = await generateSmartFill({
        data: {
          recordType: "weekly_guidance",
          recordTitle: "التوجيه الطلابي الأسبوعي",
          brief,
          mode: "fill",
          fields: [
            { name: "title", label: "العنوان", type: "text" },
            { name: "intro", label: "التمهيد", type: "textarea" },
            { name: "body", label: "الرسالة الإرشادية", type: "textarea" },
            { name: "reminder", label: "التذكير العملي", type: "textarea" },
          ],
          values: { title: "", intro: "", body: "", reminder: "" },
          schoolName: school?.school_name || "",
        },
      });
      const s = result.suggestions || {};
      if (s["title"]) setTitle(s["title"]);
      if (s["intro"]) setIntro(s["intro"]);
      if (s["body"]) setBody(s["body"]);
      if (s["reminder"]) setReminder(s["reminder"]);
      toast.success("تم إعداد محتوى الأسبوع بالذكاء الاصطناعي. راجعه قبل المشاركة.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذّر إعداد المحتوى بالذكاء الاصطناعي.");
    } finally {
      setAiLoading(false);
    }
  }

  async function posterBlob() {
    if (!posterRef.current) throw new Error("تعذّر الوصول إلى التصميم.");
    const dataUrl = await toPng(posterRef.current, { cacheBust: true, pixelRatio: 2, backgroundColor: "#fffdf8" });
    const response = await fetch(dataUrl);
    return response.blob();
  }

  async function downloadPoster() {
    try {
      const blob = await posterBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `التوجيه-الأسبوعي-${title || "الذات"}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذّر حفظ التصميم.");
    }
  }

  async function sharePoster() {
    if (sharing) return;
    setSharing(true);
    try {
      const blob = await posterBlob();
      const file = new File([blob], `التوجيه-الأسبوعي-${title || "الذات"}.png`, { type: "image/png" });
      const text = `التوجيه الطلابي الأسبوعي — ${title}\n${school?.school_name || ""}`;
      if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
        await navigator.share({ title: `التوجيه الطلابي الأسبوعي — ${title}`, text, files: [file] });
      } else {
        await downloadPoster();
        toast.info("تم حفظ التصميم كصورة؛ يمكنك مشاركته من جهازك.");
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      toast.error(error instanceof Error ? error.message : "تعذّرت مشاركة التصميم.");
    } finally {
      setSharing(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-4 p-3 sm:p-4 lg:grid-cols-[minmax(0,360px)_1fr] lg:gap-6" dir="rtl">
      {/* لوحة التحكم الجانبية */}
      <section className="h-fit rounded-3xl border border-primary/15 bg-card p-4 shadow-[var(--shadow-soft)] sm:p-5 lg:sticky lg:top-24">
        <div className="mb-5 flex items-center gap-2">
          <div className="rounded-xl bg-primary/10 p-2 text-primary">
            <BookOpenCheck className="size-5" />
          </div>
          <div>
            <h1 className="font-black">التوجيه الطلابي الأسبوعي</h1>
            <p className="text-xs text-muted-foreground">
              استخدم قالبًا معتمدًا، خصّص محتواه، وراجعه هنا
            </p>
          </div>
        </div>

        <div className="mb-5 rounded-2xl border border-primary/15 bg-primary/[0.04] p-4 shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-2 font-black text-primary"><Sparkles className="size-4" /> مساعد الذات الذكي</div>
          <p className="mt-1 text-xs leading-6 text-muted-foreground">اكتب موضوع الأسبوع أو هدفًا مختصرًا، وسيقترح الذكاء الاصطناعي محتوى الحقول كاملة.</p>
          <Textarea value={aiBrief} onChange={(e) => setAiBrief(e.target.value)} rows={3} className="mt-3 rounded-xl bg-background" placeholder="مثال: توجيه لطلاب المرحلة المتوسطة عن الانضباط والحضور المبكر..." />
          <Button type="button" onClick={() => void fillWithAI()} disabled={aiLoading} className="mt-3 w-full rounded-xl">
            {aiLoading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {aiLoading ? "جارٍ إعداد المحتوى..." : "تعبئة الحقول بالذكاء الاصطناعي"}
          </Button>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="weekly-topic">قالب الموضوع</Label>
            <select
              id="weekly-topic"
              value={topic}
              onChange={(event) => applyTemplate(event.target.value as WeeklyTopic)}
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {Object.keys(WEEKLY_TEMPLATES).map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="weekly-title">العنوان المخصص</Label>
            <Input
              id="weekly-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="mt-1 font-bold"
            />
          </div>

          <div>
            <Label htmlFor="weekly-intro">التمهيد</Label>
            <Textarea
              id="weekly-intro"
              value={intro}
              onChange={(event) => setIntro(event.target.value)}
              rows={3}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="weekly-body">الرسالة الإرشادية</Label>
            <Textarea
              id="weekly-body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={6}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="weekly-reminder">تذكّر دائمًا</Label>
            <Textarea
              id="weekly-reminder"
              value={reminder}
              onChange={(event) => setReminder(event.target.value)}
              rows={4}
              className="mt-1"
            />
          </div>
        </div>

        <div className="mt-5 grid gap-2">
          <Button onClick={() => applyTemplate(topic)} variant="secondary" className="w-full">
            <BookOpenCheck className="size-4 ml-2" /> إعادة تطبيق القالب
          </Button>
          <div className="grid grid-cols-2 gap-2">\n            <Button type="button" variant="outline" onClick={() => void downloadPoster()}><ImageDown className="size-4" /> حفظ صورة</Button>\n            <Button type="button" onClick={() => void sharePoster()} disabled={sharing}>{sharing ? <Loader2 className="size-4 animate-spin" /> : <Share2 className="size-4" />} مشاركة التصميم</Button>\n          </div>\n          <PdfPreviewButton elementRef={posterRef} filename={`لوحة-التوجيه-الطلابي-${title}`} title={`لوحة التوجيه الطلابي - ${title}`} />
        </div>
      </section>

      {/* معاينة البوستر الطباعي */}
      <div className="flex justify-center overflow-auto rounded-3xl border bg-card p-3 shadow-[var(--shadow-card)] sm:p-4">
        <div
          ref={posterRef}
          dir="rtl"
          className="bg-[#fffdf8] text-[#073f4f] shrink-0"
          style={{
            width: 794,
            minHeight: 1123,
            padding: 40,
            fontFamily: "'Cairo Variable', Cairo, sans-serif",
            boxSizing: "border-box",
          }}
        >
          {/* ترويسة البوستر */}
          <div className="grid grid-cols-3 items-center rounded-[28px] border-b-4 border-[#c99a45] bg-[#f8f6ef] px-8 py-4">
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
              <p>{formatHijriDate(new Date())}</p>
            </div>
          </div>

          {/* شارة التوجيه الطلابي الرئيسية */}
          <div className="mt-8 flex justify-center">
            <div className="flex items-center gap-3 rounded-xl border border-[#c99a45] bg-[#f8f6ef] px-8 py-3 shadow-[3px_3px_0_rgba(48,38,31,0.14)]">
              <span className="size-3 rounded-full bg-[#08667a]" />
              <h2 className="text-2xl font-extrabold">التوجيه الطلابي</h2>
            </div>
          </div>

          {/* المحتوى الداخلي للبوستر مع العلامة المائية */}
          <div
            className="relative mt-8 flex min-h-[720px] flex-col justify-between rounded-sm border-2 border-[#c99a45] p-10"
            style={watermarkStyle}
          >
            <div className="relative my-auto flex flex-col items-center justify-center gap-8 text-center">
              <div className="max-w-xl">
                <p className="text-xl font-bold leading-10">{intro}</p>
                {title && (
                  <p className="mt-2 text-2xl font-extrabold text-[#08667a]">&quot;{title}&quot;</p>
                )}
              </div>
              {body && <p className="max-w-xl text-lg leading-9">{body}</p>}
              {reminder && (
                <div className="mt-4 max-w-xl text-lg font-extrabold leading-9">
                  <p className="text-[#08667a]">تذكّر دائمًا:</p>
                  <p>{reminder}</p>
                </div>
              )}
            </div>

            {/* تذييل البوستر */}
            <div className="relative mt-8 flex items-center justify-between border-t border-[#c99a45]/40 pt-3 text-xs font-medium text-[#55717a]">
              <span>الموجه الطلابي: {school?.counselor_name || "—"}</span>
              <span className="flex items-center gap-2"><img src="/brand-final.svg?v=20261001-finalbrandbrand" alt="شعار الذات" className="h-8 w-8 rounded-lg object-contain" /> الذات للتوجيه الطلابي</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
