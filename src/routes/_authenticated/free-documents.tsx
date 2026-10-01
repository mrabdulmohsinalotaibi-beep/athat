import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, FilePlus2, Loader2, Save, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { OfficialFooter, OfficialHeader } from "@/components/OfficialHeader";
import { PdfPreviewButton } from "@/components/PdfPreviewButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { generateFreeDocument } from "@/lib/deepseek.functions";
import { useSchool } from "@/lib/school";

export const Route = createFileRoute("/_authenticated/free-documents")({ component: FreeDocumentsPage });

type FreeDoc = { id: string; title: string; document_no: string | null; content: string; status: string; updated_at: string };

function FreeDocumentsPage() {
  const queryClient = useQueryClient();
  const { data: school } = useSchool();
  const paperRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState("");
  const [title, setTitle] = useState("مستند جديد");
  const [documentNo, setDocumentNo] = useState("");
  const [content, setContent] = useState("");
  const [instruction, setInstruction] = useState("");
  const [aiBusy, setAiBusy] = useState(false);

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["free-documents"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("free_documents").select("*").order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as FreeDoc[];
    },
  });

  function load(doc: FreeDoc) {
    setSelectedId(doc.id); setTitle(doc.title); setDocumentNo(doc.document_no ?? ""); setContent(doc.content ?? "");
  }
  function fresh() {
    setSelectedId(""); setTitle("مستند جديد"); setDocumentNo(""); setContent(""); setInstruction("");
  }

  const save = useMutation({
    mutationFn: async () => {
      const payload = { title: title.trim() || "مستند جديد", document_no: documentNo.trim() || null, content, updated_at: new Date().toISOString() };
      if (selectedId) {
        const { data, error } = await (supabase as any).from("free_documents").update(payload).eq("id", selectedId).select().single();
        if (error) throw error; return data as FreeDoc;
      }
      const { data, error } = await (supabase as any).from("free_documents").insert(payload).select().single();
      if (error) throw error; return data as FreeDoc;
    },
    onSuccess: (doc) => { setSelectedId(doc.id); queryClient.invalidateQueries({ queryKey: ["free-documents"] }); toast.success("تم حفظ المستند"); },
    onError: (e: any) => toast.error(e?.message || "تعذر حفظ المستند"),
  });

  async function useAi(mode: "write" | "rewrite" | "expand" | "shorten") {
    if (!instruction.trim() && mode === "write") { toast.error("اكتب وصفًا لما تريد من الذكاء الاصطناعي."); return; }
    if (!content.trim() && mode !== "write") { toast.error("اكتب نصًا أولًا ثم اختر أداة التحسين."); return; }
    setAiBusy(true);
    try {
      const result = await generateFreeDocument({ data: { instruction: instruction.trim() || "حسّن النص مع الحفاظ على معناه", currentText: content, mode } });
      setContent(result.text); toast.success("تم إعداد النص، راجعه قبل الحفظ.");
    } catch (e) { toast.error((e as Error).message); } finally { setAiBusy(false); }
  }

  async function remove() {
    if (!selectedId || !confirm("حذف هذا المستند؟")) return;
    const { error } = await (supabase as any).from("free_documents").delete().eq("id", selectedId);
    if (error) return toast.error(error.message);
    fresh(); queryClient.invalidateQueries({ queryKey: ["free-documents"] }); toast.success("تم حذف المستند");
  }

  async function duplicate() {
    const { data, error } = await (supabase as any).from("free_documents").insert({ title: title + " - نسخة", document_no: null, content }).select().single();
    if (error) return toast.error(error.message);
    load(data as FreeDoc); queryClient.invalidateQueries({ queryKey: ["free-documents"] }); toast.success("تم إنشاء نسخة");
  }

  const filename = useMemo(() => (title.trim() || "مستند") + ".pdf", [title]);

  return <div dir="rtl" className="mx-auto max-w-7xl space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-2xl font-black">المستندات الحرة</h1><p className="mt-1 text-sm text-muted-foreground">ورقة رسمية فارغة تكتب فيها ما تشاء، مع مساعد ذكاء اصطناعي وطباعة A4.</p></div>
      <Button onClick={fresh}><FilePlus2 className="size-4"/> مستند جديد</Button>
    </div>

    <div className="grid gap-5 xl:grid-cols-[18rem_minmax(0,1fr)]">
      <aside className="rounded-2xl border bg-card p-3">
        <p className="mb-3 text-sm font-black">مستنداتي</p>
        {isLoading ? <Loader2 className="mx-auto size-5 animate-spin"/> : docs.length ? <div className="space-y-2">
          {docs.map((doc) => <button key={doc.id} onClick={() => load(doc)} className={"w-full rounded-xl border p-3 text-right text-xs transition hover:bg-accent " + (selectedId===doc.id?"border-primary bg-primary/5":"")}>
            <b className="block truncate">{doc.title}</b><span className="mt-1 block text-[10px] text-muted-foreground">{new Date(doc.updated_at).toLocaleDateString("ar-SA")}</span>
          </button>)}
        </div> : <p className="py-8 text-center text-xs text-muted-foreground">لا توجد مستندات بعد.</p>}
      </aside>

      <section className="space-y-4">
        <div className="rounded-2xl border bg-card p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="عنوان المستند"/>
            <Input value={documentNo} onChange={(e)=>setDocumentNo(e.target.value)} placeholder="رقم المستند - اختياري"/>
          </div>
          <div className="mt-4 rounded-2xl border border-primary/15 bg-primary/[0.035] p-4">
            <div className="flex items-center gap-2 font-black text-primary"><Sparkles className="size-4"/> مساعد DeepSeek للكتابة</div>
            <Textarea className="mt-3 min-h-20" value={instruction} onChange={(e)=>setInstruction(e.target.value)} placeholder="مثال: اكتب خطابًا لولي أمر عن أهمية الانتظام الدراسي دون ذكر أسماء..."/>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" onClick={()=>void useAi("write")} disabled={aiBusy}>{aiBusy?<Loader2 className="size-4 animate-spin"/>:<Sparkles className="size-4"/>} كتابة من الوصف</Button>
              <Button size="sm" variant="outline" onClick={()=>void useAi("rewrite")} disabled={aiBusy}>تحسين الصياغة</Button>
              <Button size="sm" variant="outline" onClick={()=>void useAi("expand")} disabled={aiBusy}>توسيع</Button>
              <Button size="sm" variant="outline" onClick={()=>void useAi("shorten")} disabled={aiBusy}>اختصار</Button>
            </div>
          </div>
          <Textarea value={content} onChange={(e)=>setContent(e.target.value)} className="mt-4 min-h-[22rem] resize-y text-base leading-8" placeholder="اكتب محتوى المستند هنا بحرية..."/>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={()=>save.mutate()} disabled={save.isPending}><Save className="size-4"/> {save.isPending?"جارٍ الحفظ...":"حفظ"}</Button>
            {selectedId && <Button variant="outline" onClick={()=>void duplicate()}><Copy className="size-4"/> إنشاء نسخة</Button>}
            {selectedId && <Button variant="destructive" onClick={()=>void remove()}><Trash2 className="size-4"/> حذف</Button>}
            <PdfPreviewButton elementRef={paperRef} filename={filename} title={title || "مستند"} />
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border bg-muted/30 p-2 sm:p-5">
          <div ref={paperRef} className="mx-auto min-h-[1123px] w-[794px] bg-white text-[#17343d] shadow-sm">
            <OfficialHeader school={school} title={title || "مستند"} reportNo={documentNo || undefined}/>
            <article className="min-h-[690px] px-14 py-10">
              <h2 className="mb-8 text-center text-xl font-black">{title || "مستند"}</h2>
              <div className="whitespace-pre-wrap text-[14px] leading-[2.15]">{content || <span className="text-gray-300">محتوى المستند</span>}</div>
            </article>
            <OfficialFooter school={school}/>
          </div>
        </div>
      </section>
    </div>
  </div>;
}
