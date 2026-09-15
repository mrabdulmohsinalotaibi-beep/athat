import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, CalendarRange, Loader2, Sparkles, CheckCircle2 } from "lucide-react";
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
      { name: "description", content: "البرامج الإرشادية الوزارية المعتمدة وإدارة الأنشطة." },
      { property: "og:title", content: "البرامج والأنشطة | منصة الذات" },
      {
        property: "og:description",
        content: "البرامج الإرشادية الوقائية والإنمائية والعلاجية الموزعة على الأسابيع الدراسية.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProgramsPage,
});

function AddSingleMinistryProgramDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedProgramName, setSelectedProgramName] = useState("");
  const [busy, setBusy] = useState(false);

  const selectedProgramObj = MINISTRY_PROGRAMS.find((p) => p.name === selectedProgramName);

  async function handleAdd() {
    if (!selectedProgramObj) {
      toast.error("الرجاء اختيار برنامج وزاري صالح.");
      return;
    }

    setBusy(true);
    try {
      // التحقق مما إذا كان البرنامج مضافاً مسبقاً
      const { data: existing } = await supabase
        .from("programs")
        .select("id")
        .eq("name", selectedProgramObj.name)
        .maybeSingle();

      if (existing) {
        toast.info("هذا البرنامج مضاف مسبقاً في السجل.");
        setBusy(false);
        return;
      }

      const payload = {
        program_no: `${selectedProgramObj.term} - ${selectedProgramObj.week}`,
        name: selectedProgramObj.name,
        ptype: selectedProgramObj.ptype,
        domain: selectedProgramObj.domain,
        target_group: selectedProgramObj.target_group,
        term: selectedProgramObj.term,
        goal: selectedProgramObj.goal,
        indicator: selectedProgramObj.indicator,
        exec_status: "قيد التنفيذ",
        summary: `برنامج إرشادي وزاري (${selectedProgramObj.name}) موجه لـ ${selectedProgramObj.target_group} بهدف: ${selectedProgramObj.goal}.`,
        required_evidence: "صور وتقرير تنفيذ البرنامج",
      };

      const { error } = await supabase.from("programs").insert(payload as never);
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["programs"] });
      toast.success("تمت إضافة البرنامج الوزاري بنجاح إلى السجل");
      setOpen(false);
      setSelectedProgramName("");
    } catch (error) {
      toast.error(`تعذرت الإضافة: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button 
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-xs font-extrabold text-primary-foreground shadow-sm transition-all hover:scale-105 active:scale-95"
      >
        <Plus className="size-4" /> إضافة برنامج وزاري
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] max-w-xl overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-black">
              <Sparkles className="size-4 text-primary" />
              إضافة برنامج وزاري معتمد
            </DialogTitle>
            <DialogDescription className="text-xs">
              اختر البرنامج الوزاري المناسب من القائمة المعتمدة لإضافته مباشرة إلى سجل البرامج والأنشطة.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-xs font-extrabold text-foreground">اختر البرنامج الوزاري</label>
              <select
                value={selectedProgramName}
                onChange={(e) => setSelectedProgramName(e.target.value)}
                className="w-full h-10 rounded-xl border border-input bg-background px-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">-- اختر البرنامج من القائمة الوزارية --</option>
                {MINISTRY_PROGRAMS.map((p, idx) => (
                  <option key={idx} value={p.name}>
                    {p.term} ({p.week}) - {p.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedProgramObj && (
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-2.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-extrabold text-primary">تفاصيل البرنامج المختار:</span>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                    {selectedProgramObj.term} · {selectedProgramObj.week}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-foreground/90">
                  <div><span className="font-bold text-muted-foreground">نوع البرنامج:</span> {selectedProgramObj.ptype}</div>
                  <div><span className="font-bold text-muted-foreground">المجال:</span> {selectedProgramObj.domain}</div>
                  <div className="col-span-2"><span className="font-bold text-muted-foreground">الفئة المستهدفة:</span> {selectedProgramObj.target_group}</div>
                  <div className="col-span-2"><span className="font-bold text-muted-foreground">الهدف:</span> {selectedProgramObj.goal}</div>
                  <div className="col-span-2"><span className="font-bold text-muted-foreground">مؤشر التحقق:</span> {selectedProgramObj.indicator}</div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)} className="rounded-xl text-xs font-bold">
              إلغاء
            </Button>
            <Button onClick={handleAdd} disabled={busy || !selectedProgramName} className="rounded-xl text-xs font-extrabold">
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} اعتماد وإضافة للسجل
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
        <>
          <AddSingleMinistryProgramDialog />
        </>
      }
    />
  );
}