import { useMemo, useRef, useState } from "react";
import { BookOpenCheck, FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { elementToPdf } from "@/lib/pdf";
import { useSchool } from "@/lib/school";
import { Button } from "@/components/ui/button";
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
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="380" height="200"><text x="10" y="70" font-family="Cairo, sans-serif" font-size="24" font-weight="700" fill="#7f1d1d" fill-opacity="0.055" transform="rotate(-18 190 70)">${safe} ${safe}</text><text x="-60" y="170" font-family="Cairo, sans-serif" font-size="24" font-weight="700" fill="#7f1d1d" fill-opacity="0.055" transform="rotate(-18 190 170)">${safe} ${safe}</text></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

export function WeeklyGuidancePoster() {
  const { data: school } = useSchool();
  const posterRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [topic, setTopic] = useState<WeeklyTopic>("الانضباط");
  const [title, setTitle] = useState<string>("الانضباط");
  const [intro, setIntro] = useState<string>(WEEKLY_TEMPLATES["الانضباط"].intro);
  const [body, setBody] = useState<string>(WEEKLY_TEMPLATES["الانضباط"].body);
  const [reminder, setReminder] = useState<string>(WEEKLY_TEMPLATES["الانضباط"].reminder);

  const watermarkStyle = useMemo(
    () => ({
      backgroundImage: watermarkBackground(school?.school_name || "منصة الذات"),
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
            <BookOpenCheck className="size-5" />
          </div>
          <div>
            <h1 className="font-black">التوجيه الطلابي الأسبوعي</h1>
            <p className="text-xs text-muted-foreground">
              استخدم قالبًا معتمدًا ثم خصّصه واحفظه PDF
            </p>
          </div>
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
                <option key={item}>{item}</option>
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
          <Button onClick={() => applyTemplate(topic)} variant="secondary">
            <BookOpenCheck className="size-4" /> إعادة تطبيق القالب
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
            className="relative mt-8 flex min-h-[720px] flex-col justify-between rounded-sm border-2 border-[#c9b48a] p-10"
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
