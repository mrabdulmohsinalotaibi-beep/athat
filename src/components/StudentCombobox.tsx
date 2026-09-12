import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Search } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface StudentOption {
  id: string;
  full_name: string;
  student_no: string;
  national_id: string;
  grade: string;
  classroom: string;
  guardian_name: string;
  guardian_phone: string;
}

export function useStudentOptions() {
  return useQuery({
    queryKey: ["students-options"],
    queryFn: async (): Promise<StudentOption[]> => {
      const { data, error } = await supabase
        .from("students")
        .select("id, full_name, student_no, national_id, grade, classroom, guardian_name, guardian_phone")
        .order("full_name", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((s) => ({
        id: String(s.id),
        full_name: String(s.full_name ?? ""),
        student_no: String(s.student_no ?? ""),
        national_id: String(s.national_id ?? ""),
        grade: String(s.grade ?? ""),
        classroom: String(s.classroom ?? ""),
        guardian_name: String(s.guardian_name ?? ""),
        guardian_phone: String(s.guardian_phone ?? ""),
      }));
    },
  });
}

export function StudentCombobox({
  value,
  onSelect,
  onType,
}: {
  value: string;
  onSelect: (student: StudentOption) => void;
  onType: (name: string) => void;
}) {
  const { data: students = [], isLoading } = useStudentOptions();
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");

  const results = useMemo(() => {
    const q = term.trim();
    const list = q
      ? students.filter((s) =>
          [s.full_name, s.student_no, s.national_id, s.grade, s.classroom].some((v) => v.includes(q)),
        )
      : students;
    return list.slice(0, 60);
  }, [students, term]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          className="h-9 w-full justify-between font-normal"
        >
          <span className={cn(!value && "text-muted-foreground")}>{value || "اختر الطالب أو ابحث..."}</span>
          <ChevronsUpDown className="size-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent dir="rtl" align="start" className="w-[min(26rem,90vw)] p-0">
        <div className="relative border-b p-2">
          <Search className="absolute right-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="ابحث بالاسم أو رقم الهوية أو الفصل..."
            className="pr-9"
          />
        </div>
        <div className="max-h-64 overflow-y-auto p-1">
          {isLoading && <p className="p-3 text-center text-xs text-muted-foreground">جارٍ التحميل...</p>}
          {!isLoading && results.length === 0 && (
            <p className="p-3 text-center text-xs text-muted-foreground">لا يوجد طالب مطابق في كشف الطلاب.</p>
          )}
          {results.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                onSelect(s);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-md p-2 text-right text-sm hover:bg-accent"
            >
              <Check className={cn("size-4", value === s.full_name ? "opacity-100 text-primary" : "opacity-0")} />
              <span className="flex-1">
                <span className="font-semibold">{s.full_name}</span>
                <span className="block text-[11px] text-muted-foreground">
                  {[s.grade, s.classroom, s.national_id].filter(Boolean).join(" · ") || "—"}
                </span>
              </span>
            </button>
          ))}
        </div>
        {term.trim() && (
          <div className="border-t p-2">
            <Button
              type="button"
              variant="ghost"
              className="w-full text-xs"
              onClick={() => {
                onType(term.trim());
                setOpen(false);
              }}
            >
              استخدام الاسم المكتوب: «{term.trim()}»
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
