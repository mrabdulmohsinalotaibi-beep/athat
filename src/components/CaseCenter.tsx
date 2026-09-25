import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  CircleDot,
  Clock3,
  HeartHandshake,
  MoreHorizontal,
  Plus,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type CaseRow = {
  id: string;
  student_name: string | null;
  domain: string | null;
  priority: string | null;
  case_status: string | null;
  followup_at: string | null;
  next_action: string | null;
  summary: string | null;
};

const COLUMNS = [
  {
    status: "مفتوحة",
    label: "جديدة",
    icon: CircleDot,
    tone: "text-primary bg-primary/10 border-primary/20",
  },
  {
    status: "قيد المتابعة",
    label: "قيد المتابعة",
    icon: Clock3,
    tone: "text-amber-700 bg-amber-500/10 border-amber-500/20",
  },
  {
    status: "مغلقة",
    label: "مغلقة",
    icon: CheckCircle2,
    tone: "text-emerald-700 bg-emerald-500/10 border-emerald-500/20",
  },
] as const;

function today() {
  return new Date().toISOString().slice(0, 10);
}

function isOverdue(item: CaseRow) {
  return Boolean(
    item.case_status !== "مغلقة" && item.followup_at && item.followup_at < today(),
  );
}

export function CaseCenter() {
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState<"all" | "overdue">("all");
  const { data: cases = [], isLoading } = useQuery({
    queryKey: ["case-center"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("counseling_cases")
        .select(
          "id, student_name, domain, priority, case_status, followup_at, next_action, summary",
        )
        .order("followup_at", { ascending: true, nullsFirst: false })
        .limit(120);
      if (error) throw error;
      return (data ?? []) as CaseRow[];
    },
  });

  const visibleCases = useMemo(
    () =>
      activeFilter === "overdue"
        ? cases.filter(isOverdue)
        : cases,
    [activeFilter, cases],
  );

  async function moveCase(id: string, status: string) {
    const { error } = await (supabase as any)
      .from("counseling_cases")
      .update({
        case_status: status,
        ...(status === "مغلقة"
          ? { closed_at: today() }
          : { closed_at: null }),
      })
      .eq("id", id);
    if (error) {
      toast.error(`تعذّر تحديث الحالة: ${error.message}`);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["case-center"] });
    await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    toast.success("تم تحديث مرحلة الحالة");
  }

  const overdueCount = cases.filter(isOverdue).length;

  return (
    <section className="dashboard-panel rounded-3xl border border-primary/12 bg-card p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-primary/10 p-3 text-primary">
            <HeartHandshake className="size-5" />
          </div>
          <div>
            <h2 className="text-base font-black">مركز متابعة الحالات</h2>
            <p className="mt-1 text-xs leading-6 text-muted-foreground">
              تابعي الحالات حسب مرحلتها، وانقليها بسرعة بعد كل إجراء إرشادي.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={activeFilter === "overdue" ? "default" : "outline"}
            onClick={() => setActiveFilter((value) => (value === "overdue" ? "all" : "overdue"))}
            className="gap-1.5"
          >
            <AlertTriangle className="size-3.5" />
            المتأخرة ({overdueCount})
          </Button>
          <Button asChild size="sm" variant="outline" className="gap-1.5">
            <Link to="/cases">
              <Plus className="size-3.5" />
              حالة جديدة
            </Link>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          جارٍ تحميل مركز المتابعة...
        </div>
      ) : visibleCases.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-8 text-center">
          <CheckCircle2 className="mx-auto size-8 text-emerald-600" />
          <p className="mt-2 text-sm font-bold">
            {activeFilter === "overdue" ? "لا توجد حالات متأخرة" : "لا توجد حالات مسجلة بعد"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {activeFilter === "overdue"
              ? "ممتاز، جميع المتابعات ضمن مواعيدها."
              : "ابدئي بإضافة حالة إرشادية لبناء سجل متابعة متكامل."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {COLUMNS.map((column) => {
            const Icon = column.icon;
            const items = visibleCases.filter(
              (item) => (item.case_status || "مفتوحة") === column.status,
            );
            return (
              <div key={column.status} className="min-w-0 rounded-2xl border bg-background/60 p-3">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={cn("rounded-lg border p-1.5", column.tone)}>
                      <Icon className="size-3.5" />
                    </span>
                    <h3 className="text-xs font-black">{column.label}</h3>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {items.length}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {items.slice(0, 6).map((item) => (
                    <div key={item.id} className="rounded-xl border bg-card p-3 shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <p className="line-clamp-1 text-xs font-extrabold">
                          {item.student_name || "حالة بلا اسم"}
                        </p>
                        {isOverdue(item) && (
                          <span title="متابعة متأخرة" className="shrink-0 text-rose-600">
                            <AlertTriangle className="size-3.5" />
                          </span>
                        )}
                      </div>
                      <p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">
                        {item.domain || "مجال غير محدد"} · {item.priority || "أولوية غير محددة"}
                      </p>
                      {item.followup_at && (
                        <p className={cn(
                          "mt-2 flex items-center gap-1 text-[10px] font-semibold",
                          isOverdue(item) ? "text-rose-600" : "text-muted-foreground",
                        )}>
                          <CalendarClock className="size-3" />
                          متابعة {item.followup_at}
                        </p>
                      )}
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <select
                          aria-label={`تغيير حالة ${item.student_name || "الحالة"}`}
                          value={item.case_status || "مفتوحة"}
                          onChange={(event) => void moveCase(item.id, event.target.value)}
                          className="h-8 min-w-0 flex-1 rounded-md border bg-background px-2 text-[10px]"
                        >
                          {COLUMNS.map((option) => (
                            <option key={option.status} value={option.status}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <Button asChild size="icon" variant="ghost" className="size-8" title="فتح الحالات">
                          <Link to="/cases">
                            <ArrowLeft className="size-3.5" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                  {items.length > 6 && (
                    <p className="pt-1 text-center text-[10px] text-muted-foreground">
                      + {items.length - 6} حالات أخرى
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between border-t pt-4 text-xs">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <MoreHorizontal className="size-3.5" /> تعرض القائمة آخر 120 حالة
        </span>
        <Link to="/cases" className="flex items-center gap-1 font-bold text-primary hover:underline">
          فتح سجل الحالات الكامل <ArrowLeft className="size-3.5" />
        </Link>
      </div>
    </section>
  );
}
