import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { FileText, HeartHandshake, Search, Users, X } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function GlobalSearch() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const normalized = term.trim();
  const { data, isFetching } = useQuery({
    queryKey: ["global-search", normalized],
    enabled: open && normalized.length >= 2,
    queryFn: async () => {
      const pattern = `%${normalized}%`;
      const [students, cases, programs, tasks] = await Promise.all([
        supabase.from("students").select("id, full_name, student_no, grade").or(`full_name.ilike.${pattern},student_no.ilike.${pattern}`).limit(6),
        supabase.from("counseling_cases").select("id, student_name, domain, case_status").or(`student_name.ilike.${pattern},summary.ilike.${pattern}`).limit(6),
        supabase.from("programs").select("id, name, domain, exec_status").or(`name.ilike.${pattern},goal.ilike.${pattern}`).limit(6),
        supabase.from("plan_tasks").select("id, task, domain, exec_status").ilike("task", pattern).limit(6),
      ]);
      return {
        students: students.data ?? [],
        cases: cases.data ?? [],
        programs: programs.data ?? [],
        tasks: tasks.data ?? [],
      };
    },
  });

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function go(to: string) {
    setOpen(false);
    setTerm("");
    navigate({ to: to as never });
  }

  const hasResults = Boolean(data && Object.values(data).some((items) => items.length));

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        className="hidden min-w-48 justify-between gap-3 text-muted-foreground md:flex"
        title="البحث الموحد (Ctrl+K)"
      >
        <span className="flex items-center gap-2"><Search className="size-4" /> بحث موحد</span>
        <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px]">Ctrl K</kbd>
      </Button>
      <Button type="button" variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen(true)} aria-label="بحث موحد">
        <Search className="size-5" />
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-foreground/25 px-4 pt-[12vh]" onMouseDown={() => setOpen(false)}>
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl border bg-popover shadow-2xl" dir="rtl" onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex items-center gap-2 border-b px-4">
              <Search className="size-5 text-muted-foreground" />
              <Input autoFocus value={term} onChange={(event) => setTerm(event.target.value)} placeholder="ابحثي باسم الطالب أو الحالة أو البرنامج..." className="h-14 border-0 px-2 shadow-none focus-visible:ring-0" />
              {term && <Button type="button" variant="ghost" size="icon" onClick={() => setTerm("")}><X className="size-4" /></Button>}
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-3">
              {normalized.length < 2 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">اكتبي حرفين على الأقل لبدء البحث.</p>
              ) : isFetching ? (
                <p className="py-8 text-center text-sm text-muted-foreground">جارٍ البحث...</p>
              ) : !hasResults ? (
                <p className="py-8 text-center text-sm text-muted-foreground">لا توجد نتائج مطابقة.</p>
              ) : (
                <div className="space-y-4">
                  {data?.students.length ? <ResultGroup title="الطلاب" icon={Users} items={data.students.map((item: any) => ({ title: item.full_name || "طالب", detail: `${item.student_no || "بدون رقم"} · ${item.grade || ""}`, to: "/students" }))} onSelect={go} /> : null}
                  {data?.cases.length ? <ResultGroup title="الحالات الإرشادية" icon={HeartHandshake} items={data.cases.map((item: any) => ({ title: item.student_name || "حالة إرشادية", detail: `${item.domain || "مجال غير محدد"} · ${item.case_status || "مفتوحة"}`, to: "/cases" }))} onSelect={go} /> : null}
                  {data?.programs.length ? <ResultGroup title="البرامج والأنشطة" icon={FileText} items={data.programs.map((item: any) => ({ title: item.name || "برنامج", detail: `${item.domain || ""} · ${item.exec_status || ""}`, to: "/programs" }))} onSelect={go} /> : null}
                  {data?.tasks.length ? <ResultGroup title="مهام الخطة" icon={FileText} items={data.tasks.map((item: any) => ({ title: item.task || "مهمة", detail: `${item.domain || ""} · ${item.exec_status || ""}`, to: "/plan" }))} onSelect={go} /> : null}
                </div>
              )}
            </div>
            <div className="border-t px-4 py-2 text-[10px] text-muted-foreground">اختصار لوحة المفاتيح: Ctrl + K · Esc للإغلاق</div>
          </div>
        </div>
      )}
    </>
  );
}

function ResultGroup({ title, icon: Icon, items, onSelect }: { title: string; icon: typeof Users; items: Array<{ title: string; detail: string; to: string }>; onSelect: (to: string) => void }) {
  return (
    <section>
      <h3 className="mb-1.5 flex items-center gap-2 px-2 text-xs font-black text-muted-foreground"><Icon className="size-3.5" /> {title}</h3>
      <div className="grid gap-1 sm:grid-cols-2">
        {items.map((item, index) => <button type="button" key={`${item.title}-${index}`} onClick={() => onSelect(item.to)} className="rounded-xl border bg-background/70 px-3 py-2 text-right transition hover:border-primary/40 hover:bg-accent"><p className="truncate text-xs font-bold">{item.title}</p><p className="mt-1 truncate text-[10px] text-muted-foreground">{item.detail}</p></button>)}
      </div>
    </section>
  );
}
