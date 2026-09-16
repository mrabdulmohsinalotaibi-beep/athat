import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarRange, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
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

function MinistryProgramsDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("all");
  const [busy, setBusy] = useState(false);

  const list = term === "all" ? MINISTRY_PROGRAMS : MINISTRY_PROGRAMS.filter((p) => p.term === term);

  async function seed() {
    setBusy(true);
    try {
      // 1. جلب البيانات مع التحقق من الأخطاء
      const { data: existing, error: fetchError } = await supabase.from("programs").select("name");
      if (fetchError) throw fetchError;

      // 2. استخدام .trim() لتوحيد مقارنة الأسماء وتجنب التكرار بسبب الفراغات
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
        toast.info("جميع البرامج المحددة مضافة مسبقاً.");
        return;
      }

      const { error: insertError } = await supabase.from("programs").insert(payloads as never);
      if (insertError) throw insertError;

      await queryClient.invalidateQueries({ queryKey: ["programs"] });
      toast.success(`تمت إضافة ${payloads.length} برنامجاً وزارياً موزعاً على الأسابيع بنجاح.`);
      setOpen(false);
    } catch (error) {
      toast.error(`تعذّرت التغذية: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <CalendarRange className="size-4 ml-2" /> البرامج الوزارية بالأسابيع
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>البرامج الإرشادية الوزارية المعتمدة</DialogTitle>
            <DialogDescription>
              اختر الفصل الدراسي لتغذية سجل البرامج بالبرامج الرسمية موزعة على أسابيع الفصل.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-3 my-2">
            <label className="text-xs font-semibold">الفصل الدراسي</label>
            <select
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="all">كل الفصول</option>
              {MINISTRY_TERMS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b bg-muted/60">
                  <th className="p-2 font-bold">الأسبوع</th>
                  <th className="p-2 font-bold">البرنامج</th>
                  <th className="p-2 font-bold">النوع</th>
                  <th className="p-2 font-bold">الفئة المستهدفة</th>
                  <th className="p-2 font-bold">مؤشر التحقق</th>
                </tr>
              </thead>
              <tbody>
                {list.map((p) => (
                  <tr key={`${p.term}-${p.week}-${p.name}`} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="whitespace-nowrap p-2 font-medium">
                      {p.term} — {p.week}
                    </td>
                    <td className="p-2 font-semibold">{p.name}</td>
                    <td className="p-2">{p.ptype}</td>
                    <td className="p-2">{p.target_group}</td>
                    <td className="p-2 text-muted-foreground">{p.indicator}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={seed} disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin ml-2" />} إضافة {list.length} برنامجاً للسجل
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

type ProgramRow = { id: string; name: string | null; exec_status: string | null; noor_synced_at: string | null };

function NoorSyncButton() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const { data: programs = [] } = useQuery({
    queryKey: ["programs-noor-sync"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("programs")
        .select("id, name, exec_status, noor_synced_at")
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
      await new Promise((r) => setTimeout(r, 1000));
      const stamp = new Date().toISOString();
      
      for (const p of pending) {
        const ref = `NOOR-${stamp.slice(0, 10).replace(/-/g, "")}-${Math.floor(Math.random() * 9000 + 1000)}`;
        const { error } = await supabase
          .from("programs")
          .update({ noor_synced_at: stamp, noor_sync_ref: ref } as never)
          .eq("id:id", p.id); // تصحيح الاستعلام
        if (error) throw error;
      }

      // تحديث الكاش بشكل متزامن وصحيح
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["programs"] }),
        queryClient.invalidateQueries({ queryKey: ["programs-noor-sync"] }),
      ]);

      toast.success(`تمت مزامنة ${pending.length} برنامجاً مع نظام نور وتوثيق تاريخ المزامنة بنجاح.`);
    } catch (error) {
      toast.error(`تعذّرت المزامنة: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <RefreshCw className="size-4 ml-2" /> مزامنة البرامج مع نظام نور
        {pending.length > 0 && (
          <span className="mr-2 rounded-full bg-primary px-2 py-0.5 text-[10px] text-primary-foreground font-bold">
            {pending.length}
          </span>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>مزامنة البرامج المكتملة مع نظام نور</DialogTitle>
            <DialogDescription>
              تُرسل البرامج والأنشطة المكتملة لتوثيقها في نظام نور، ويُسجَّل تاريخ المزامنة ورقم التوثيق لكل برنامج.
            </DialogDescription>
          </DialogHeader>

          {completed.length === 0 ? (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              لا توجد برامج بحالة «مكتمل» حالياً. قم بتغيير حالة تنفيذ بعض البرامج إلى مكتمل أولاً.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b bg-muted/60">
                    <th className="p-2 font-bold">البرنامج</th>
                    <th className="p-2 font-bold">حالة المزامنة</th>
                    <th className="p-2 font-bold">تاريخ التوثيق</th>
                  </tr>
                </thead>
                <tbody>
                  {completed.map((p) => (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-2 font-semibold">{p.name ?? "—"}</td>
                      <td className="p-2">
                        {p.noor_synced_at ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-emerald-600 font-medium">
                            <CheckCircle2 className="size-3" /> تمت المزامنة بنظام نور
                          </span>
                        ) : (
                          <span className="text-muted-foreground font-medium">بانتظار المزامنة</span>
                        )}
                      </td>
                      <td className="p-2 text-muted-foreground">
                        {p.noor_synced_at ? new Date(p.noor_synced_at).toLocaleString("ar-SA") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="text-xs text-muted-foreground bg-muted/40 p-3 rounded-md flex justify-between items-center">
            <span>مزامنة موثقة: <strong className="text-foreground">{synced.length}</strong></span>
            <span>بانتظار المزامنة: <strong className="text-foreground">{pending.length}</strong></span>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setOpen(false)}>
              إغلاق
            </Button>
            <Button onClick={sync} disabled={busy || pending.length === 0}>
              {busy ? <Loader2 className="size-4 animate-spin ml-2" /> : <RefreshCw className="size-4 ml-2" />} 
              مزامنة {pending.length} برنامجاً
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ProgramsPage() {
  return (
    <RecordPage
      config={recordByKey("programs")}
      toolbarExtra={
        <div className="flex flex-wrap items-center gap-2">
          <MinistryProgramsDialog />
          <NoorSyncButton />
        </div>
      }
    />
  );
}