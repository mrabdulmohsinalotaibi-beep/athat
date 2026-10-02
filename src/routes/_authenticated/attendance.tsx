import { useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { createFileRoute } from "@tanstack/react-router";
import { FileText, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { RecordPage } from "@/components/RecordPage";
import { Button } from "@/components/ui/button";
import { recordByKey } from "@/lib/records";
import { supabase } from "@/integrations/supabase/client";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

type ImportedAttendance = { student_name: string; student_no: string; adate: string; count_days: number; selected: boolean; raw: string };

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
  const [preview, setPreview] = useState<ImportedAttendance[]>([]);
  const [rawText, setRawText] = useState("");

  const pickPdf = (file?: File) => {
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("يرجى اختيار ملف PDF صادر من إتقان.");
      return;
    }
    setPdf(file);
    toast.success(`تم اختيار ${file.name}`);
  };

  const startImport = async () => {
    if (!pdf) return inputRef.current?.click();
    setBusy(true);
    try {
      const bytes = new Uint8Array(await pdf.arrayBuffer());
      const doc = await pdfjsLib.getDocument({ data: bytes }).promise;
      const pageLines: string[] = [];
      for (let pageNo = 1; pageNo <= doc.numPages; pageNo += 1) {
        const page = await doc.getPage(pageNo);
        const content = await page.getTextContent();
        const items = content.items
          .filter((item): item is typeof item & { str: string; transform: number[] } => "str" in item && "transform" in item)
          .map((item) => ({ str: item.str.trim(), x: item.transform[4] ?? 0, y: item.transform[5] ?? 0 }))
          .filter((item) => item.str);
        const rows = new Map<number, typeof items>();
        for (const item of items) {
          const key = Math.round(item.y / 3) * 3;
          rows.set(key, [...(rows.get(key) ?? []), item]);
        }
        [...rows.entries()].sort((a,b)=>b[0]-a[0]).forEach(([, row]) => {
          pageLines.push(row.sort((a,b)=>b.x-a.x).map((item)=>item.str).join(" "));
        });
      }
      const text = pageLines.join("\n");
      setRawText(text);
      const arabicName = /[\u0600-\u06FF]/;
      const idPattern = /\b(\d{8,12})\b/;
      const datePattern = /\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})\b/;
      const parsed: ImportedAttendance[] = [];
      for (const line of pageLines) {
        const id = line.match(idPattern)?.[1] ?? "";
        const date = line.match(datePattern);
        if (!id || !date || !arabicName.test(line)) continue;
        const year = Number(date[3]); const month = Number(date[2]); const day = Number(date[1]);
        const iso = year >= 1900 ? `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}` : "";
        const cleaned = line.replace(id, "").replace(date[0], "").replace(/[|،,:]+/g," ").replace(/\s+/g," ").trim();
        const name = cleaned.replace(/\b\d+\b/g,"").trim();
        if (!name || !iso) continue;
        parsed.push({ student_name:name, student_no:id, adate:iso, count_days:1, selected:true, raw:line });
      }
      const unique = parsed.filter((row, index, all) => all.findIndex((x)=>x.student_no===row.student_no && x.adate===row.adate)===index);
      setPreview(unique);
      if (unique.length) toast.success(`تمت قراءة ${unique.length} سجلًا. راجعها قبل الحفظ.`);
      else toast.error("تم فتح PDF لكن لم أتعرف على صفوف الغياب. قد يكون الملف صورة ممسوحة أو تنسيق إتقان مختلفًا.");
    } catch (error) {
      console.error(error);
      toast.error("تعذر قراءة ملف PDF. تأكد أن الملف نصي وغير محمي.");
    } finally { setBusy(false); }
  };

  const saveImported = async () => {
    const rows = preview.filter((row)=>row.selected);
    if (!rows.length) return toast.error("حدد سجلًا واحدًا على الأقل.");
    setBusy(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData.user) throw new Error("انتهت جلسة الدخول.");
      const { data: existing, error: existingError } = await supabase.from("attendance").select("student_no,adate").eq("user_id",authData.user.id);
      if (existingError) throw existingError;
      const keys = new Set((existing ?? []).map((x:any)=>`${x.student_no}|${x.adate}`));
      const fresh = rows.filter((x)=>!keys.has(`${x.student_no}|${x.adate}`));
      if (!fresh.length) return toast.info("كل السجلات المحددة موجودة مسبقًا.");
      const { error } = await supabase.from("attendance").insert(fresh.map((x)=>({user_id:authData.user!.id,student_no:x.student_no,student_name:x.student_name,adate:x.adate,case_type:"غياب",count_days:x.count_days,action:"تم الاستيراد من كشف إتقان PDF",notes:"استيراد إتقان"})) as never);
      if (error) throw error;
      toast.success(`تم حفظ ${fresh.length} سجل غياب.`);
      setPreview([]);
      setPdf(null);
      window.dispatchEvent(new Event("focus"));
    } catch(error){ console.error(error); toast.error(error instanceof Error ? error.message : "تعذر حفظ السجلات."); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-3xl border border-primary/15 bg-card p-4 shadow-[var(--shadow-soft)] sm:p-5">
        <div aria-hidden="true" className="pointer-events-none absolute -left-12 -top-12 size-40 rounded-full bg-primary/8 blur-2xl" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
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

      {preview.length > 0 && (
        <section className="rounded-2xl border bg-card p-3 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div><h3 className="text-sm font-black">معاينة سجلات إتقان</h3><p className="text-[11px] text-muted-foreground">راجع السجلات وحدد ما تريد حفظه.</p></div>
            <Button onClick={saveImported} disabled={busy}>اعتماد وحفظ ({preview.filter(x=>x.selected).length})</Button>
          </div>
          <div className="max-h-80 space-y-2 overflow-auto">
            {preview.map((row,index)=>(
              <label key={row.student_no+"-"+row.adate+"-"+index} className="flex items-center gap-2 rounded-xl border p-2 text-xs">
                <input type="checkbox" checked={row.selected} onChange={(e)=>setPreview((old)=>old.map((x,i)=>i===index?{...x,selected:e.target.checked}:x))} />
                <span className="min-w-0 flex-1"><strong className="block truncate">{row.student_name}</strong><span className="text-muted-foreground">{row.student_no} · {row.adate}</span></span>
              </label>
            ))}
          </div>
        </section>
      )}
      {rawText && preview.length === 0 && <details className="rounded-xl border bg-card p-3 text-xs"><summary className="cursor-pointer font-black">عرض النص المستخرج للتشخيص</summary><pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap text-[10px]">{rawText.slice(0,12000)}</pre></details>}

      <section className="rounded-3xl border bg-card p-3.5 shadow-[var(--shadow-card)] sm:p-4"><RecordPage config={recordByKey("attendance")} /></section>
    </div>
  );
}
