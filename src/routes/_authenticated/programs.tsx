import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarRange,
  CheckCircle2,
  Loader2,
  Plus,
  Sparkles,
  Printer,
  Share2,
  Calendar,
  Layers,
  FileText,
  Copy,
  Check,
  Send,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { MINISTRY_PROGRAMS, MINISTRY_TERMS } from "@/lib/ministry-programs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/programs")({
  head: () => ({
    meta: [
      { title: "البرامج والأنشطة | منصة الذات" },
      { name: "description", content: "البرامج الإرشادية الوزارية المعتمدة موزعة على الأسابيع الدراسية." },
      { property: "og:title", content: "البرامج والأنشطة | منصة الذات" },
      { property: "og:description", content: "سجل متابعة وتنفيذ البرامج والأنشطة الإرشادية مع المنشورات والتقارير." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProgramsPage,
});

type ProgramRecord = {
  id: string;
  name: string | null;
  program_no: string | null;
  ptype: string | null;
  domain: string | null;
  target_group: string | null;
  term: string | null;
  goal: string | null;
  indicator: string | null;
  exec_status: string | null;
  required_evidence: string | null;
  created_at?: string;
};

// 1. النافذة الجانبية لتصفح وإضافة البرامج الوزارية المجدولة بالتواريخ
function MinistryProgramsDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("all");
  const [addingId, setAddingId] = useState<string | null>(null);

  const list = term === "all" ? MINISTRY_PROGRAMS : MINISTRY_PROGRAMS.filter((p) => p.term === term);

  async function addSingleProgram(p: (typeof MINISTRY_PROGRAMS)[0]) {
    setAddingId(`${p.term}-${p.week}-${p.name}`);
    try {
      const { data: existing } = await supabase
        .from("programs")
        .select("name")
        .eq("name", p.name);

      if (existing && existing.length > 0) {
        toast.info(`البرنامج "${p.name}" مضاف مسبقاً في السجل.`);
        return;
      }

      const payload = {
        program_no: `${p.term} - الأسبوع ${p.week}`,
        name: p.name,
        ptype: p.ptype,
        domain: p.domain,
        target_group: p.target_group,
        term: `${p.term} — الأسبوع ${p.week}`,
        goal: p.goal,
        indicator: p.indicator,
        exec_status: "لم يبدأ",
        required_evidence: "صور وتقرير تنفيذ البرنامج",
      };

      const { error } = await supabase.from("programs").insert([payload] as never);
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["programs-list"] });
      toast.success(`تم إدراج برنامج "${p.name}" في جدول أعمالك`);
    } catch (error) {
      toast.error(`تعذر إضافة البرنامج: ${(error as Error).message}`);
    } finally {
      setAddingId(null);
    }
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="inline-flex h-11 items-center gap-2 rounded-2xl bg-primary px-5 text-xs font-black text-primary-foreground shadow-md transition-all hover:scale-105 active:scale-95"
      >
        <CalendarRange className="size-4" />
        <span>دليل البرامج الوزارية المجدولة</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] max-w-4xl overflow-y-auto rounded-3xl p-6" dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle className="text-xl font-black text-foreground">البرامج الإرشادية المعتمدة بالتواريخ</DialogTitle>
            <DialogDescription className="text-xs font-semibold text-muted-foreground">
              اختر البرنامج المناسب لإضافته إلى خطتك بالوقت والتاريخ الذي تريده.
            </DialogDescription>
          </DialogHeader>

          <div className="my-3 flex items-center justify-between gap-4 rounded-2xl border border-border/60 bg-muted/30 p-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-foreground">تصفية حسب الفصل:</span>
              <select
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                className="h-9 rounded-xl border border-border/80 bg-background px-3 text-xs font-bold shadow-sm outline-none focus:border-primary"
              >
                <option value="all">جميع الفصول الدراسية</option>
                {MINISTRY_TERMS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <span className="text-xs font-bold text-muted-foreground">العدد: {list.length} برنامجاً</span>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border/60 shadow-sm">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b bg-muted/70 text-muted-foreground">
                  <th className="p-3 font-black">الفصل والجدولة</th>
                  <th className="p-3 font-black">اسم البرنامج</th>
                  <th className="p-3 font-black">المجال والفئة</th>
                  <th className="p-3 font-black">مؤشر الإنجاز</th>
                  <th className="p-3 font-black text-center">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 bg-card">
                {list.map((p) => {
                  const key = `${p.term}-${p.week}-${p.name}`;
                  const isBusy = addingId === key;
                  return (
                    <tr key={key} className="transition-colors hover:bg-muted/20">
                      <td className="whitespace-nowrap p-3 font-bold text-primary">
                        {p.term} - الأسبوع {p.week}
                      </td>
                      <td className="p-3 font-black text-foreground">{p.name}</td>
                      <td className="p-3">
                        <span className="inline-block rounded-lg bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                          {p.ptype}
                        </span>
                        <p className="mt-1 text-[10px] text-muted-foreground">{p.target_group}</p>
                      </td>
                      <td className="p-3 text-muted-foreground">{p.indicator}</td>
                      <td className="p-3 text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => addSingleProgram(p)}
                          disabled={isBusy}
                          className="h-8 rounded-xl border-primary/30 text-xs font-bold hover:bg-primary hover:text-primary-foreground"
                        >
                          {isBusy ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
                          <span>إضافة للجدول</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="ghost" onClick={() => setOpen(false)} className="rounded-xl font-bold">
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// 2. مولد منشورات التواصل بالذكاء الاصطناعي
function AIPostGeneratorModal({ program }: { program: ProgramRecord }) {
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState<"x" | "whatsapp" | "instagram">("x");
  const [copied, setCopied] = useState(false);

  // توليد مسودة المنشور بناءً على تفاصيل البرنامج المختار
  const generatePost = () => {
    const title = program.name || "برنامج إرشادي";
    const goal = program.goal || "تعزيز السلوك الإيجابي والرعاية النفسية للطلاب";
    const target = program.target_group || "جميع الطلاب وأولياء الأمور";

    if (platform === "x") {
      return `📌 | حرصاً على بيئة تعليمية محفزة ومميزة:
نطلق اليوم في المدرسة برنامج: (${title})

🎯 الهدف: ${goal}
👥 الفئة المستهدفة: ${target}

معاً لبناء جيل واعي ومتميز. ✨
#التوجيه_والإرشاد #التعليم #منصة_الذات`;
    }

    if (platform === "whatsapp") {
      return `✨ *برنامج إرشادي وتوعوي* ✨

برعاية التوجيه الطلابي بالمدرسة، يسرنا تنفيذ برنامج:
*_${title}_*

🔹 *اهداف البرنامج:*
${goal}

🔹 *الفئة المستهدفة:* ${target}

نشكر اهتمامكم ومتابعتكم المستمرة لأبنائنا الطلاب 🌿`;
    }

    return `📸 | تغطية إرشادية

جانب من تنفيذ برنامج (${title}) والذي يهدف إلى ${goal}.

كل الشكر والتقدير لشركاء النجاح ولأبنائنا الطلاب على التفاعل الإيجابي 🌟

---
#إرشاد_طلابي #رعاية #تعليم #نشاط_مدرسي`;
  };

  const postText = generatePost();

  const handleCopy = () => {
    navigator.clipboard.writeText(postText);
    setCopied(true);
    toast.success("تم نسخ نص المنشور بنجاح!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setOpen(true)}
        className="h-8 rounded-xl border-amber-500/30 bg-amber-500/5 text-xs font-bold text-amber-600 hover:bg-amber-500 hover:text-white"
      >
        <Sparkles className="size-3.5" />
        <span>منشور الذكاء الاصطناعي</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl rounded-3xl p-6" dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle className="flex items-center gap-2 text-lg font-black text-foreground">
              <Sparkles className="size-5 text-amber-500" />
              <span>صانع منشورات التواصل بالذكاء الاصطناعي</span>
            </DialogTitle>
            <DialogDescription className="text-xs font-medium text-muted-foreground">
              توليد منشور إعلامي وإرشادي مخصص لبرنامج: <span className="font-bold text-foreground">{program.name}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="my-3 flex gap-2">
            {[
              { id: "x", label: "منصة X (تويتر)" },
              { id: "whatsapp", label: "واتساب" },
              { id: "instagram", label: "انستغرام" },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPlatform(p.id as never)}
                className={`flex-1 rounded-xl py-2 text-xs font-extrabold transition-all ${
                  platform === p.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="relative rounded-2xl border border-border/80 bg-muted/20 p-4 text-xs font-medium leading-relaxed">
            <pre className="whitespace-pre-wrap font-sans text-foreground">{postText}</pre>
          </div>

          <DialogFooter className="mt-4 flex items-center justify-between gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)} className="rounded-xl font-bold">
              إغلاق
            </Button>
            <Button onClick={handleCopy} className="inline-flex gap-2 rounded-xl bg-primary font-bold">
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              <span>{copied ? "تم النسخ" : "نسخ المنشور"}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// 3. الصفحة الرئيسية للبرامج والأنشطة الإرشادية
function ProgramsPage() {
  const queryClient = useQueryClient();
  const [selectedProgramForPrint, setSelectedProgramForPrint] = useState<ProgramRecord | null>(null);

  const { data: programs = [], isLoading } = useQuery({
    queryKey: ["programs-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("programs")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ProgramRecord[];
    },
  });

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("programs")
        .update({ exec_status: newStatus } as never)
        .eq("id", id);
      if (error) throw error;
      toast.success("تم تحديث حالة تنفيذ البرنامج");
      queryClient.invalidateQueries({ queryKey: ["programs-list"] });
    } catch (err) {
      toast.error("تعذر تحديث الحالة");
    }
  };

  const printSingleProgram = (program: ProgramRecord) => {
    setSelectedProgramForPrint(program);
    setTimeout(() => {
      window.print();
    }, 200);
  };

  return (
    <div className="space-y-6 dir-rtl">
      {/* الترويسة العليا والتصميم الرئيسي */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary/90 to-primary/80 p-6 text-primary-foreground shadow-xl shadow-primary/10 sm:p-8">
        <div className="absolute -left-12 -top-12 size-48 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -right-12 -bottom-12 size-48 rounded-full bg-black/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1 text-xs font-medium backdrop-blur-md">
              <Layers className="size-3.5 text-amber-300" />
              <span>السجل الخطي والعملي</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight sm:text-4xl">البرامج والأنشطة الإرشادية</h1>
            <p className="text-xs font-medium text-primary-foreground/80 sm:text-sm">
              إدارة خطط البرامج الإرشادية، التوثيق، وصناعة المحتوى التوعوي للطلاب.
            </p>
          </div>

          <MinistryProgramsDialog />
        </div>
      </div>

      {/* قائمة وتصاميم بطاقات البرامج المضافة */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black text-foreground">قائمة البرامج المسجلة ({programs.length})</h2>
        </div>

        {isLoading ? (
          <div className="flex h-40 items-center justify-center rounded-3xl border border-border/60 bg-card">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : programs.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/80 bg-card/50 p-12 text-center">
            <CalendarRange className="size-10 text-muted-foreground/60" />
            <h3 className="mt-3 text-sm font-bold text-foreground">لا توجد برامج مضافة في خطتك حالياً</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              يمكنك استعراض دليل البرامج الوزارية بالأسابيع واختيار ما يناسب جدولك.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {programs.map((program) => {
              const isCompleted = program.exec_status === "مكتمل";
              return (
                <div
                  key={program.id}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-border/60 bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
                >
                  <div>
                    <div className="flex items-center justify-between border-b border-border/40 pb-3">
                      <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-black text-primary">
                        {program.program_no || "برنامج عام"}
                      </span>
                      <button
                        onClick={() => updateStatus(program.id, isCompleted ? "لم يبدأ" : "مكتمل")}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold transition-all ${
                          isCompleted
                            ? "bg-emerald-500/10 text-emerald-600"
                            : "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20"
                        }`}
                      >
                        <CheckCircle2 className="size-3" />
                        <span>{program.exec_status || "لم يبدأ"}</span>
                      </button>
                    </div>

                    <h3 className="mt-3 text-base font-black leading-snug text-foreground">{program.name}</h3>

                    <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                      {program.goal && (
                        <p className="line-clamp-2">
                          <span className="font-bold text-foreground">الهدف: </span>
                          {program.goal}
                        </p>
                      )}
                      {program.target_group && (
                        <p>
                          <span className="font-bold text-foreground">المستهدفون: </span>
                          {program.target_group}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between gap-2 border-t border-border/40 pt-3">
                    <AIPostGeneratorModal program={program} />

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => printSingleProgram(program)}
                      className="h-8 rounded-xl font-bold text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <Printer className="size-3.5" />
                      <span>طباعة</span>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* صفحة وقالب الطباعة الفردية المخفي مخصص للطباعة فقط */}
      {selectedProgramForPrint && (
        <div className="hidden print:block print:fixed print:inset-0 print:z-50 print:bg-white print:p-8 print:text-black">
          <div className="border-b-2 border-black pb-4 text-center">
            <h1 className="text-2xl font-black">تقرير تنفيذ برنامج إرشادي</h1>
            <p className="mt-1 text-sm">{selectedProgramForPrint.name}</p>
          </div>

          <div className="mt-6 space-y-4 text-right text-sm leading-relaxed">
            <div className="grid grid-cols-2 gap-4 border-b pb-4">
              <div>
                <strong>رمز/أسبوع البرنامج:</strong> {selectedProgramForPrint.program_no || "غير محدد"}
              </div>
              <div>
                <strong>حالة التنفيذ:</strong> {selectedProgramForPrint.exec_status}
              </div>
              <div>
                <strong>نوع البرنامج:</strong> {selectedProgramForPrint.ptype || "إرشادي"}
              </div>
              <div>
                <strong>الفئة المستهدفة:</strong> {selectedProgramForPrint.target_group || "جميع الطلاب"}
              </div>
            </div>

            <div>
              <strong>الهدف الرئيسي من البرنامج:</strong>
              <p className="mt-1 rounded bg-gray-50 p-2">{selectedProgramForPrint.goal || "لا يوجد"}</p>
            </div>

            <div>
              <strong>مؤشر تحقيق الهدف:</strong>
              <p className="mt-1 rounded bg-gray-50 p-2">{selectedProgramForPrint.indicator || "لا يوجد"}</p>
            </div>

            <div>
              <strong>الشواهد والتوصيات المطلوبة:</strong>
              <p className="mt-1 rounded bg-gray-50 p-2">{selectedProgramForPrint.required_evidence || "صور، تقارير، استبانات"}</p>
            </div>
          </div>

          <div className="mt-12 flex justify-between border-t pt-4 text-xs font-bold">
            <div>توقيع الموجه الطلابي: ....................</div>
            <div>مصادقة مدير المدرسة: ....................</div>
          </div>
        </div>
      )}
    </div>
  );
}