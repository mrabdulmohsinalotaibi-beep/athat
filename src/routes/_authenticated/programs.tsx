import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarRange, Loader2, Sparkles } from "lucide-react";
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
      { name: "description", content: "البرامج الإرشادية الوزارية المعتمدة موزعة على أسابيع وفصول العام الدراسي بالتواريخ الهجرية." },
      { property: "og:title", content: "البرامج والأنشطة | منصة الذات" },
      {
        property: "og:description",
        content: "البرامج الإرشادية الوقائية والإنمائية والعلاجية موزعة على الأسابيع الدراسية بالتواريخ الهجرية.",
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
      const { data: existing } = await supabase.from("programs").select("name");
      const known = new Set((existing ?? []).map((p) => String((p as { name: string | null }).name ?? "").trim()));
      
      const payloads = list
        .filter((p) => !known.has(p.name))
        .map((p) => ({
          program_no: `${p.term} - الأسبوع ${p.week}`,
          name: p.name,
          ptype: p.ptype,
          domain: p.domain,
          target_group: p.target_group,
          term: `${p.term} — الأسبوع ${p.week} (${p.hijri_date || ""})`,
          goal: p.goal,
          indicator: p.indicator,
          exec_status: "لم يبدأ",
          required_evidence: "صور وتقرير تنفيذ البرنامج",
        }));

      if (!payloads.length) {
        toast.info("جميع البرامج المحددة مضافة مسبقاً.");
        return;
      }
      const { error } = await supabase.from("programs").insert(payloads as never);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      toast.success(`تمت إضافة ${payloads.length} برنامجاً وزارياً بالتواريخ الهجرية بنجاح`);
      setOpen(false);
    } catch (error) {
      toast.error(`تعذّرت التغذية: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button 
        onClick={() => setOpen(true)}
        className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-sm hover:opacity-95 transition-all"
      >
        <CalendarRange className="size-4 ml-2" /> البرامج الوزارية والتواريخ الهجرية
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto rounded-xl border border-border/40 bg-background shadow-2xl" dir="rtl">
          <DialogHeader className="space-y-2 pb-4 border-b">
            <div className="flex items-center gap-2 text-primary">
              <Sparkles className="size-5" />
              <DialogTitle className="text-xl font-bold">البرامج الإرشادية الوزارية المعتمدة (بالتواريخ الهجرية)</DialogTitle>
            </div>
            <DialogDescription className="text-muted-foreground text-sm">
              اختر الفصل الدراسي لاستعراض وتغذية سجل البرامج بالخطة الزمنية الرسمية الموزعة على الأسابيع والتواريخ الهجرية.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-3 py-2">
            <label className="text-xs font-semibold text-foreground/80">تصفية حسب الفصل الدراسي:</label>
            <select
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="all">كل الفصول الدراسية</option>
              {MINISTRY_TERMS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border/60 shadow-xs">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b bg-muted/70 text-muted-foreground font-medium">
                  <th className="p-3">الفصل / الأسبوع</th>
                  <th className="p-3">التاريخ الهجري</th>
                  <th className="p-3">اسم البرنامج</th>
                  <th className="p-3">النوع والمجال</th>
                  <th className="p-3">الفئة المستهدفة</th>
                  <th className="p-3">مؤشر التحقق</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {list.map((p, idx) => (
                  <tr key={`${p.term}-${p.week}-${idx}`} className="hover:bg-muted/30 transition-colors">
                    <td className="whitespace-nowrap p-3 font-medium text-foreground">
                      {p.term} — الأسبوع {p.week}
                    </td>
                    <td className="whitespace-nowrap p-3 text-primary font-semibold">
                      {p.hijri_date || "—"}
                    </td>
                    <td className="p-3 font-bold text-foreground">{p.name}</td>
                    <td className="p-3 text-muted-foreground">{p.ptype} ({p.domain})</td>
                    <td className="p-3 text-muted-foreground">{p.target_group}</td>
                    <td className="p-3 text-muted-foreground">{p.indicator}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <DialogFooter className="gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={seed} disabled={busy} className="bg-primary text-primary-foreground">
              {busy ? <Loader2 className="size-4 animate-spin ml-2" /> : null} إضافة {list.length} برنامجاً للسجل بالتواريخ الهجرية
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
        <div className="flex items-center gap-2">
          <MinistryProgramsDialog />
        </div>
      }
    />
  );
}