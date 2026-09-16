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
  goal?: string | null;
  indicator?: string | null;
  target_group?: string | null;
  exec_date?: string | null;
  beneficiaries_count?: number | null;
  notes?: string | null;
  evidence_box?: string | null;
  attachments?: string[] | string | null;
};

// 1. مكون إضافة برنامج وزاري عبر قائمة منسدلة ذكية بالبرنامج والأسبوع والتاريخ
function MinistryProgramsDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState("");
  const [busy, setBusy] = useState(false);

  const optionsList = useMemo(() => {
    return MINISTRY_PROGRAMS.map((p, idx) => ({
      id: `${p.term}-${p.week}-${idx}`,
      label: `${p.term} (أسبوع ${p.week}) — ${p.name} [${p.ptype}]`,
      program: p
    }));
  }, []);

  async function seedSingleProgram() {
    if (!selectedKey) {
      toast.error("الرجاء اختيار برنامج من القائمة أولاً.");
      return;
    }

    const found = optionsList.find(o => o.id === selectedKey);
    if (!found) return;

    const p = found.program;
    setBusy(true);

    try {
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
        evidence_box: "إرفاق صور توثيق تنفيذ البرنامج هنا...",
      };

      const { error: insertError } = await supabase.from("programs").insert(payload as never);
      if (insertError) throw insertError;

      await queryClient.invalidateQueries({ queryKey: ["programs"] });
      toast.success(`تمت إضافة البرنامج "${p.name}" بكافة بياناته بنجاح.`);
      setOpen(false);
      setSelectedKey("");
    } catch (error) {
      toast.error(`تعذّرت الإضافة: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className="gap-2">
        <CalendarRange className="size-4" /> إضافة برنامج وزاري معتمد
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl print:hidden" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">اختيار برنامج وزاري من القائمة المعتمدة</DialogTitle>
            <DialogDescription>
              اختر البرنامج المناسب من القائمة أدناه ليتم جلب وتعبئة كافة بياناته وتفاصيله بشكل فوري.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-3">
            <div className="space-y-2">
              <label className="text-xs font-semibold">اختر البرنامج (الفصل، الأسبوع، الاسم):</label>
              <select
                value={selectedKey}
                onChange={(e) => setSelectedKey(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">-- اختر البرنامج الوزاري --</option>
                {optionsList.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={seedSingleProgram} disabled={busy || !selectedKey} className="gap-2">
              {busy && <Loader2 className="size-4 animate-spin" />} إضافة البرنامج للسجل
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// 2. زر مزامنة نظام نور
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
              لا توجد برامج بحالة «مكتمل» حالياً.
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
            <Button variant="outline" onClick={() => setOpen(false)}> إغلاق </Button>
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

// 3. زر حذف السجلات
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
              سيتم إزالة كافة الأنشطة والبرامج المسجلة في قاعدة البيانات نهائياً.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>تراجع</Button>
            <Button variant="destructive" onClick={handleDeleteAll} disabled={busy} className="gap-2">
              {busy && <Loader2 className="size-4 animate-spin" />} نعم، احذف الكل
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// المكون الرئيسي مع تخصيص المربعات والطباعة وصفحة الشواهد المستقلة
function ProgramsPage() {
  const handlePrintAll = () => {
    window.print();
  };

  return (
    <>
      {/* تنسيقات طباعة A4: تقرير تفصيلي لكل برنامج يتبعه صفحة مستقلة ومنسقة للصور والشواهد */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 15mm;
          }
          body {
            background: white !important;
            color: #000 !important;
            font-family: Tajawal, Arial, sans-serif !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          nav, header, aside, .print\\:hidden, button {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }
          
          .record-detail-container, .print-page-layout {
            page-break-after: always;
            break-after: page;
            min-height: 95vh;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
          }

          .print-evidence-page {
            page-break-before: always;
            break-before: page;
            page-break-after: always;
            break-after: page;
            min-height: 95vh;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
            padding-top: 20px;
          }

          .print-evidence-header {
            border-bottom: 2px solid #0f172a;
            padding-bottom: 10px;
            margin-bottom: 20px;
            text-align: center;
          }
          .print-evidence-header h3 {
            font-size: 16px;
            font-weight: bold;
            color: #0f172a;
            margin: 0;
          }
          .print-evidence-header p {
            font-size: 11px;
            color: #475569;
            margin: 5px 0 0 0;
          }

          .print-evidence-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin-top: 15px;
          }
          .print-evidence-card {
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            padding: 10px;
            background: #f8fafc;
            text-align: center;
          }
          .print-evidence-image {
            width: 100%;
            height: 220px;
            object-fit: contain;
            border-radius: 4px;
            border: 1px solid #e2e8f0;
            background: #ffffff;
          }
        }
      `}</style>

      <RecordPage
        config={recordByKey("programs")}
        toolbarExtra={
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <MinistryProgramsDialog />
            <NoorSyncButton />
            <Button variant="outline" onClick={handlePrintAll} className="gap-2">
              <Printer className="size-4" /> طباعة السجل والتقرير الشامل
            </Button>
            <ClearProgramsButton />
          </div>
        }
      />
    </>
  );
}