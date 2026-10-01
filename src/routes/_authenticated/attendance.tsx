import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, FileText, Loader2, TriangleAlert, Upload } from "lucide-react";
import { toast } from "sonner";

import { RecordPage } from "@/components/RecordPage";
import { Button } from "@/components/ui/button";
import { recordByKey } from "@/lib/records";
import { readEtqanAttendancePdf, type EtqanAttendanceRow } from "@/lib/etqan-pdf";
import { supabase } from "@/integrations/supabase/client";

type PreviewRow = EtqanAttendanceRow & { studentId: string | null; studentNo: string | null; matchedName: string | null; status: "new" | "duplicate" | "review" };

export const Route = createFileRoute("/_authenticated/attendance")({
  head: () => ({
    meta: [
      { title: "الحضور والمواظبة | الذات" },
      { name: "description", content: "رصد الغياب والتأخر وإجراءات التوجيه الطلابي المتخذة." },
      { property: "og:title", content: "الحضور والمواظبة | الذات" },
      { property: "og:description", content: "رصد الغياب والتأخر وإجراءات التوجيه الطلابي المتخذة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AttendancePage,
});

function AttendancePage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pdf, setPdf] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [saving, setSaving] = useState(false);

  const pickPdf = (file?: File) => {
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("يرجى اختيار ملف PDF صادر من إتقان.");
      return;
    }
    setPdf(file);
    setRows([]);
    toast.success(`تم اختيار ${file.name}`);
  };

  const startImport = async () => {
    if (!pdf) return inputRef.current?.click();
    setBusy(true);
    try {
      const parsed = await readEtqanAttendancePdf(pdf);
      if (!parsed.length) {
        toast.error("لم يتم العثور على سجلات غياب قابلة للقراءة في الملف.");
        return;
      }
      const ids = [...new Set(parsed.map((row) => row.nationalId))];
      const { data: students, error: studentsError } = await supabase
        .from("students").select("id,student_no,national_id,full_name").in("national_id", ids);
      if (studentsError) throw studentsError;
      const studentById = new Map((students || []).map((student) => [String(student.national_id || ""), student]));

      const dates = [...new Set(parsed.map((row) => row.date))];
      const { data: existingRows, error: attendanceError } = await supabase
        .from("attendance").select("student_id,student_no,adate").in("adate", dates);
      if (attendanceError) throw attendanceError;
      const existing = new Set((existingRows || []).map((row) => String(row.student_id || row.student_no || "") + "|" + String(row.adate || "")));

      const preview: PreviewRow[] = parsed.map((row) => {
        const student = studentById.get(row.nationalId);
        if (!student) return { ...row, studentId: null, studentNo: null, matchedName: null, status: "review" as const };
        const key = String(student.id || student.student_no || "") + "|" + row.date;
        return { ...row, studentId: student.id, studentNo: student.student_no, matchedName: student.full_name || row.studentName, status: existing.has(key) ? "duplicate" as const : "new" as const };
      });
      setRows(preview);
      toast.success("تمت قراءة ومطابقة " + preview.length + " سجلًا من كشف إتقان.");
    } finally {
      setBusy(false);
    }
  };

  const counts = rows.reduce((acc, row) => { acc[row.status] += 1; return acc; }, { new: 0, duplicate: 0, review: 0 });

  const approveImport = async () => {
    const ready = rows.filter((row) => row.status === "new" && row.studentId);
    if (!ready.length) { toast.info("لا توجد سجلات جديدة جاهزة للحفظ."); return; }
    setSaving(true);
    try {
      const payload = ready.map((row) => ({
        student_id: row.studentId!,
        student_no: row.studentNo || null,
        student_name: row.matchedName || row.studentName,
        adate: row.date,
        case_type: row.excuse === "بعذر" ? "غياب بعذر" : "غياب",
        count_days: 1,
        action: "مستورد من كشف إتقان",
        notes: ["إتقان", row.absenceType, row.excuse, row.phone ? "جوال: " + row.phone : ""].filter(Boolean).join(" | "),
      }));
      const { error } = await supabase.from("attendance").insert(payload);
      if (error) throw error;
      toast.success("تم اعتماد وحفظ " + payload.length + " سجل غياب.");
      setRows((current) => current.map((row) => row.status === "new" ? { ...row, status: "duplicate" } : row));
    } catch (error) {
      console.error(error);
      toast.error("تعذر حفظ سجلات الغياب. لم يتم اعتماد العملية.");
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 font-black">
              <FileText className="size-5 text-primary" />
              استيراد غياب إتقان PDF
            </div>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              ارفع كشف الغياب PDF الصادر من إتقان، ثم راجع السجلات قبل إضافتها إلى المواظبة.
              سيُستخدم رقم الهوية وتاريخ الغياب لاكتشاف التكرار قبل الاعتماد.
            </p>
            {pdf && (
              <p className="mt-2 text-xs font-bold text-primary">
                الملف المحدد: {pdf.name} — {(pdf.size / 1024 / 1024).toFixed(2)} MB
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(event) => pickPdf(event.target.files?.[0])}
            />
            <Button variant="outline" onClick={() => inputRef.current?.click()}>
              <Upload className="size-4" />
              اختيار PDF
            </Button>
            <Button onClick={startImport} disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
              {pdf ? "قراءة كشف إتقان" : "استيراد غياب إتقان"}
            </Button>
          </div>
        </div>
      </section>

      {rows.length > 0 && (
        <section className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 font-black"><CheckCircle2 className="size-5 text-primary" />معاينة كشف إتقان — {rows.length} سجل</div>
            <Button onClick={approveImport} disabled={saving || counts.new === 0}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
              اعتماد وإضافة الغياب ({counts.new})
            </Button>
          </div>
          <div className="mb-3 grid gap-2 sm:grid-cols-3">
            <div className="rounded-xl border p-3 font-bold">جديد: {counts.new}</div>
            <div className="rounded-xl border p-3 font-bold">مكرر: {counts.duplicate}</div>
            <div className="rounded-xl border p-3 font-bold">يحتاج مراجعة: {counts.review}</div>
          </div>
          <div className="max-h-[430px] overflow-auto rounded-xl border">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="sticky top-0 bg-muted">
                <tr><th className="p-2 text-right">الحالة</th><th className="p-2 text-right">الهوية</th><th className="p-2 text-right">الطالب</th><th className="p-2 text-right">الصف</th><th className="p-2 text-right">الفصل</th><th className="p-2 text-right">التاريخ</th><th className="p-2 text-right">العذر</th><th className="p-2 text-right">نوع الغياب</th></tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.nationalId + row.date + index} className="border-t">
                    <td className="p-2 font-bold">{row.status === "new" ? "جديد" : row.status === "duplicate" ? "مكرر" : "مراجعة"}</td><td className="p-2">{row.nationalId}</td><td className="p-2">{row.matchedName || row.studentName}</td>
                    <td className="p-2">{row.grade}</td><td className="p-2">{row.classroom}</td>
                    <td className="p-2">{row.date}</td><td className="p-2">{row.excuse || "—"}</td>
                    <td className="p-2">{row.absenceType}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
            <TriangleAlert className="size-4" /> معاينة فقط؛ لا يتم حفظ أي سجل قبل المطابقة والاعتماد.
          </p>
        </section>
      )}

      <RecordPage config={recordByKey("attendance")} />
    </div>
  );
}
