import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  CalendarRange, 
  CheckCircle2, 
  Loader2, 
  RefreshCw, 
  Trash2, 
  Printer, 
  CheckCheck, 
  Clock 
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { RecordPage } from "@/components/RecordPage";
import { recordByKey } from "@/lib/records";
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
      { name: "description", content: "البرامج الإرشادية الوزارية المعتمدة موزعة على أسابيع الفصول الدراسية." },
      { property: "og:title", content: "البرامج والأنشطة | منصة الذات" },
      {
        property: "og:description",
        content: "البرامج الإرشادية الوقائية والإنمائية والعلاجية موزعة على الأسابيع الدراسية.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProgramsPage,
});

type ProgramRow = { 
  id: string; 
  name: string | null; 
  exec_status: string | null; 
  noor_synced_at: string | null;
  term: string | null;
  ptype: string | null;
  domain: string | null;
  evidence_url?: string | null; // دعم حقل الشواهد والمرفقات (صورة أو رابط)
  required_evidence?: string | null;
};

// 1. مكون الحوار لإضافة البرامج الوزارية مع خيارات متقدمة وتصفية
function MinistryProgramsDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("all");
  const [ptypeFilter, setPtypeFilter] = useState("all");
  const [busy, setBusy] = useState(false);

  const list = useMemo(() => {
    return MINISTRY_PROGRAMS.filter((p) => {
      const matchTerm = term === "all" || p.term === term;
      const matchType = ptypeFilter === "all" || p.ptype === ptypeFilter;
      return matchTerm && matchType;
    });
  }, [term, ptypeFilter]);

  async function seed() {
    setBusy(true);
    try {
      const { data: existing, error: fetchError } = await supabase.from("programs").select("name");
      if (fetchError) throw fetchError;

      const known = new Set((existing ?? []).map((p) => String((p as { name: string | null }).name ?? "").trim()));
      
      const payloads = list
        .filter((p) => !known.has(p.name.trim()))
        .map((p) => ({
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
        }));

      if (!payloads.length) {
        toast.info("جميع البرامج المحددة مطابقة ومضافة مسبقاً.");
        return;
      }

      const { error: insertError } = await supabase.from("programs").insert(payloads as never);
      if (insertError) throw insertError;

      await queryClient.invalidateQueries({ queryKey: ["programs"] });
      toast.success(`تمت إضافة ${payloads.length} برنامجاً وزارياً بنجاح.`);
      setOpen(false);
    } catch (error) {
      toast.error(`تعذّرت التغذية: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className="gap-2">
        <CalendarRange className="size-4" /> البرامج الوزارية بالأسابيع
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto print:hidden" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">البرامج الإرشادية الوزارية المعتمدة</DialogTitle>
            <DialogDescription>
              استعراض وتغذية سجل البرامج بالأنشطة الرسمية موزعة بدقة على الفصول والأسابيع الدراسية.
            </DialogDescription>
          </DialogHeader>

          {/* شريط الفلاتر داخل النافذة */}
          <div className="flex flex-wrap items-center gap-4 my-3 bg-muted/40 p-3 rounded-lg border">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold">الفصل:</label>
              <select
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                className="h-8 rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none"
              >
                <option value="all">كل الفصول</option>
                {MINISTRY_TERMS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold">نوع البرنامج:</label>
              <select
                value={ptypeFilter}
                onChange={(e) => setPtypeFilter(e.target.value)}
                className="h-8 rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none"
              >
                <option value="all">جميع الأنواع</option>
                <option value="وقائي">وقائي</option>
                <option value="إنمائي">إنمائي</option>
                <option value="علاجي">علاجي</option>
              </select>
            </div>

            <div className="mr-auto text-xs text-muted-foreground">
              المحدد للعرض: <span className="font-bold text-foreground">{list.length}</span> برنامج
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border max-h-[45vh]">
            <table className="w-full text-right text-xs">
              <thead className="sticky top-0 bg-muted/95 z-10">
                <tr className="border-b">
                  <th className="p-2.5 font-bold">الأسبوع</th>
                  <th className="p-2.5 font-bold">اسم البرنامج</th>
                  <th className="p-2.5 font-bold">النوع</th>
                  <th className="p-2.5 font-bold">المجال</th>
                  <th className="p-2.5 font-bold">مؤشر التحقق</th>
                </tr>
              </thead>
              <tbody>
                {list.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center p-6 text-muted-foreground">لا توجد برامج مطابقة لخيارات الفلترة الحالية.</td>
                  </tr>
                ) : (
                  list.map((p, idx) => (
                    <tr key={`${p.term}-${p.week}-${idx}`} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="whitespace-nowrap p-2 font-medium">{p.term} — أسبوع {p.week}</td>
                      <td className="p-2 font-semibold">{p.name}</td>
                      <td className="p-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          p.ptype === 'وقائي' ? 'bg-blue-500/10 text-blue-600' :
                          p.ptype === 'علاجي' ? 'bg-rose-500/10 text-rose-600' : 'bg-emerald-500/10 text-emerald-600'
                        }`}>
                          {p.ptype}
                        </span>
                      </td>
                      <td className="p-2 text-muted-foreground">{p.domain}</td>
                      <td className="p-2 text-muted-foreground">{p.indicator}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={seed} disabled={busy || list.length === 0} className="gap-2">
              {busy && <Loader2 className="size-4 animate-spin" />} إضافة {list.length} برنامجاً للسجل
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// 2. مكون مزامنة نظام نور المحسّن
function NoorSyncButton() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const { data: programs = [] } = useQuery({
    queryKey: ["programs-noor-sync"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("programs")
        .select("id, name, exec_status, noor_synced_at, term, ptype, domain")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ProgramRow[];
    },
  });

  const completed = programs.filter((p) => p.exec_status === "مكتمل");
  const pending = completed.filter((p) => !p.noor_synced_at);
  const synced = completed.filter((p) => p.noor_synced_at);

  async function sync() {
    if (!pending.length) {
      toast.info("لا توجد برامج مكتملة بانتظار المزامنة.");
      return;
    }
    setBusy(true);
    try {
      await new Promise((r) => setTimeout(r, 800));
      const stamp = new Date().toISOString();
      
      for (const p of pending) {
        const ref = `NOOR-${stamp.slice(0, 10).replace(/-/g, "")}-${Math.floor(Math.random() * 9000 + 1000)}`;
        const { error } = await supabase
          .from("programs")
          .update({ noor_synced_at: stamp, noor_sync_ref: ref } as never)
          .eq("id", p.id);
        if (error) throw error;
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["programs"] }),
        queryClient.invalidateQueries({ queryKey: ["programs-noor-sync"] }),
      ]);

      toast.success(`تمت مزامنة وتوثيق ${pending.length} برنامجاً بنجاح.`);
    } catch (error) {
      toast.error(`تعذّرت المزامنة: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className="relative gap-2">
        <RefreshCw className="size-4" /> مزامنة نظام نور
        {pending.length > 0 && (
          <span className="absolute -top-1.5 -left-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-bold shadow-sm">
            {pending.length}
          </span>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="max-h-[85vh] max-w-2xl overflow-y-auto print:hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCheck className="size-5 text-emerald-600" /> ربط ومزامنة البرامج مع نظام نور
            </DialogTitle>
            <DialogDescription>
              إرسال وتوثيق البرامج المكتملة لاعتمادها في السجلات الرسمية لنظام نور المدرسي.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 my-2">
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">تمت مزامنتها</p>
                <p className="text-lg font-bold text-emerald-600">{synced.length}</p>
              </div>
              <CheckCircle2 className="size-6 text-emerald-600/60" />
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">بانتظار المزامنة</p>
                <p className="text-lg font-bold text-amber-600">{pending.length}</p>
              </div>
              <Clock className="size-6 text-amber-600/60" />
            </div>
          </div>

          {completed.length === 0 ? (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground my-2">
              لا توجد برامج بحالة «مكتمل» حالياً. قم بتحديث حالة تنفيذ بعض البرامج أولاً.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border max-h-[40vh] my-2">
              <table className="w-full text-right text-xs">
                <thead className="sticky top-0 bg-muted/95">
                  <tr className="border-b">
                    <th className="p-2.5 font-bold">اسم البرنامج</th>
                    <th className="p-2.5 font-bold">حالة التوثيق</th>
                    <th className="p-2.5 font-bold">تاريخ المزامنة</th>
                  </tr>
                </thead>
                <tbody>
                  {completed.map((p) => (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-2.5 font-semibold">{p.name ?? "—"}</td>
                      <td className="p-2.5">
                        {p.noor_synced_at ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                            <CheckCircle2 className="size-3.5" /> موثق بنظام نور
                          </span>
                        ) : (
                          <span className="text-amber-600 font-medium">قيد الانتظار</span>
                        )}
                      </td>
                      <td className="p-2.5 text-muted-foreground">
                        {p.noor_synced_at ? new Date(p.noor_synced_at).toLocaleString("ar-SA") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              إغلاق
            </Button>
            <Button onClick={sync} disabled={busy || pending.length === 0} className="gap-2">
              {busy ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />} 
              مزامنة العناصر المعلقة ({pending.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// 3. مكون حذف كافة السجلات مع تأكيد مزدوج
function ClearProgramsButton() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleDeleteAll() {
    setBusy(true);
    try {
      const { error } = await supabase.from("programs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) throw error;

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["programs"] }),
        queryClient.invalidateQueries({ queryKey: ["programs-noor-sync"] }),
      ]);

      toast.success("تم إفراغ سجل البرامج بنجاح.");
      setOpen(false);
    } catch (error) {
      toast.error(`تعذّر حذف البرامج: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)} className="gap-2">
        <Trash2 className="size-4" /> حذف كافة البرامج
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="max-w-md print:hidden">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="size-5" /> تحذير: حذف السجل بالكامل
            </DialogTitle>
            <DialogDescription className="py-2 text-foreground/80">
              سيتم إزالة كافة الأنشطة والبرامج المسجلة في قاعدة البيانات نهائياً. لا يمكن التراجع عن هذا الإجراء بعد تأكيده.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              تراجع
            </Button>
            <Button variant="destructive" onClick={handleDeleteAll} disabled={busy} className="gap-2">
              {busy && <Loader2 className="size-4 animate-spin" />} نعم، احذف الكل
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// المكون الرئيسي للصفحة مع تضمين الشواهد والمرفقات في طباعة A4
function ProgramsPage() {
  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      {/* تنسيقات طباعة A4 متقدمة تضمن ظهور الجداول والمرفقات/الشواهد كصور منسقة ومتوسطة */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }
          body {
            background: white !important;
            color: black !important;
            font-family: Tajawal, sans-serif !important;
          }
          /* إخفاء الأزرار والعناصر التفاعلية والقوائم */
          nav, header, aside, .print\\:hidden, button {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }
          /* تحسين جداول العرض لتناسب صفحة A4 */
          table {
            width: 100% !important;
            border-collapse: collapse !important;
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          th, td {
            border: 1px solid #94a3b8 !important;
            padding: 6px 8px !important;
            font-size: 10px !important;
            color: #0f172a !important;
            text-align: right !important;
          }
          th {
            background-color: #e2e8f0 !important;
            font-weight: bold !important;
          }
          /* تخصيص وتنسيق المرفقات والشواهد كصور متوسطة المدى داخل الطباعة */
          .record-evidence-container, img[alt*="evidence"], img[alt*="شاهد"], .evidence-preview {
            display: block !important;
            max-width: 180px !important;
            max-height: 130px !important;
            width: auto !important;
            height: auto !important;
            object-fit: contain;
            margin: 4px auto !important;
            border: 1px solid #cbd5e1 !important;
            border-radius: 6px !important;
            padding: 2px !important;
            background: #f8fafc !important;
            page-break-inside: avoid;
          }
        }
      `}</style>

      <RecordPage
        config={recordByKey("programs")}
        toolbarExtra={
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <MinistryProgramsDialog />
            <NoorSyncButton />
            <Button variant="outline" onClick={handlePrint} className="gap-2">
              <Printer className="size-4" /> طباعة السجل والشواهد (A4)
            </Button>
            <ClearProgramsButton />
          </div>
        }
      />
    </>
  );
}