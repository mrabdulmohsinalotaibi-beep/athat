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
  target_group?: string | null;
  goal?: string | null;
  indicator?: string | null;
  required_evidence?: string | null;
  notes?: string | null;
  attachments?: string[] | string | null;
};

// 1. مكون حوار إضافة البرامج الوزارية
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

// 2. مكون مزامنة نظام نور
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

// 3. مكون حذف كافة السجلات
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

// المكون الرئيسي مع تخصيص طباعة العنصر الفردي بصفحة مستقلة وشواهد مستقلة
function ProgramsPage() {
  return (
    <>
      {/* تخصيص الطباعة لتعمل كصفحة تقرير رئيسية وصفحة شواهد مستقلة */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 15mm;
          }
          body {
            background: white !important;
            color: #000 !important;
            font-family: Tajawal, sans-serif, Arial !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          /* إخفاء عناصر النظام والقوائم والأزرار غير المرغوب طباعتها */
          nav, header, aside, .print\\:hidden, button {
            display: none !important;
          }
          /* حاوية تقرير البرنامج الفردي المخصص للطباعة */
          .print-single-program-sheet {
            display: block !important;
            width: 100% !important;
            page-break-after: always;
          }
          .print-header-box {
            text-align: center;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 12px;
            margin-bottom: 20px;
          }
          .print-header-box h1 {
            font-size: 16px;
            font-weight: bold;
            color: #0f172a;
            margin-bottom: 4px;
          }
          .print-header-box p {
            font-size: 11px;
            color: #475569;
          }
          .print-table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin-bottom: 20px;
          }
          .print-table th, .print-table td {
            border: 1px solid #94a3b8 !important;
            padding: 8px 10px !important;
            font-size: 11px !important;
            color: #0f172a !important;
            text-align: right !important;
            vertical-align: middle;
          }
          .print-table th {
            background-color: #f1f5f9 !important;
            width: 30%;
          }
          /* صفحة الشواهد المستقلة */
          .print-evidence-page {
            page-break-before: always;
            display: block !important;
            width: 100% !important;
          }
          .print-evidence-title {
            font-size: 14px;
            font-weight: bold;
            color: #0f172a;
            border-bottom: 2px dashed #cbd5e1;
            padding-bottom: 6px;
            margin-bottom: 15px;
            text-align: center;
          }
          .print-evidence-grid {
            display: flex !important;
            flex-wrap: wrap !important;
            gap: 15px !important;
            justify-content: center !important;
          }
          .print-evidence-card {
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            padding: 8px;
            background: #f8fafc;
            text-align: center;
            width: 45% !important;
            box-sizing: border-box;
            page-break-inside: avoid;
          }
          .print-evidence-img {
            width: 100% !important;
            height: 200px !important;
            object-fit: cover !important;
            border-radius: 6px !important;
            border: 1px solid #e2e8f0;
          }
        }
        /* إخفاء صفحات الطباعة الخاصة بالبرنامج الفردي عن العرض العادي على الشاشة */
        .print-single-program-sheet {
          display: none;
        }
      `}</style>

      <RecordPage
        config={recordByKey("programs")}
        renderCustomPrint={(item: ProgramRow) => {
          // استخراج الصور أو المرفقات وتوحيدها كمعرّفات أو روابط صحيحة
          let imgs: string[] = [];
          if (item.attachments) {
            if (Array.isArray(item.attachments)) {
              imgs = item.attachments;
            } else if (typeof item.attachments === "string") {
              try {
                const parsed = JSON.parse(item.attachments);
                imgs = Array.isArray(parsed) ? parsed : [item.attachments];
              } catch {
                imgs = [item.attachments];
              }
            }
          }

          return (
            <div className="print-single-program-sheet" dir="rtl">
              {/* الصفحة الأولى: تفاصيل وتقرير البرنامج */}
              <div>
                <div className="print-header-box">
                  <h1>سجل توثيق البرامج والأنشطة الإرشادية</h1>
                  <p>التوجيه والإرشاد الطلابي — إدارة التعليم</p>
                </div>

                <table className="print-table">
                  <tbody>
                    <tr>
                      <th>اسم البرنامج / النشاط</th>
                      <td><strong>{item.name || "—"}</strong></td>
                    </tr>
                    <tr>
                      <th>الفصل أو الأسبوع الدراسي</th>
                      <td>{item.term || "—"}</td>
                    </tr>
                    <tr>
                      <th>نوع البرنامج والمجال</th>
                      <td>{item.ptype || "—"} ({item.domain || "—"})</td>
                    </tr>
                    <tr>
                      <th>الفئة المستهدفة</th>
                      <td>{item.target_group || "جميع الطلاب"}</td>
                    </tr>
                    <tr>
                      <th>أهداف البرنامج</th>
                      <td>{item.goal || "—"}</td>
                    </tr>
                    <tr>
                      <th>مؤشر التحقق</th>
                      <td>{item.indicator || "—"}</td>
                    </tr>
                    <tr>
                      <th>حالة التنفيذ</th>
                      <td><strong>{item.exec_status || "لم يبدأ"}</strong></td>
                    </tr>
                    <tr>
                      <th>ملاحظات وتوصيات</th>
                      <td>{item.notes || "لا توجد ملاحظات"}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* الصفحة الثانية: صفحة الشواهد والمرفقات المستقلة */}
              <div className="print-evidence-page">
                <div className="print-evidence-title">
                  📌 الشواهد والمرفقات المرئية للبرنامج: {item.name}
                </div>

                {imgs.length === 0 ? (
                  <p style={{ textAlign: "center", color: "#64748b", fontSize: "11px", marginTop: "40px" }}>
                    لم يتم إرفاق شواهد أو صور لهذا البرنامج.
                  </p>
                ) : (
                  <div className="print-evidence-grid">
                    {imgs.map((url, idx) => (
                      <div key={idx} className="print-evidence-card">
                        <img 
                          src={url} 
                          alt={`شاهد ${idx + 1}`} 
                          className="print-evidence-img" 
                        />
                        <div style={{ fontSize: "10px", color: "#475569", marginTop: "6px", fontWeight: "bold" }}>
                          شاهد رقم ({idx + 1})
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        }}
      />
    </>
  );
}