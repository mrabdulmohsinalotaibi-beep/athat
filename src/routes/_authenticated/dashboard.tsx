import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ClipboardList,
  FileText,
  FolderCheck,
  HeartHandshake,
  RefreshCw,
  Users,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/lib/school";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "لوحة التحكم | الذات" },
      { name: "description", content: "لوحة الموجه الطلابي." },
    ],
  }),
  component: Dashboard,
});

type Counts = {
  students: number;
  cases: number;
  programs: number;
  evidences: number;
};

const EMPTY: Counts = {
  students: 0,
  cases: 0,
  programs: 0,
  evidences: 0,
};

async function countTable(table: "students" | "counseling_cases" | "programs" | "evidences") {
  try {
    const request = supabase.from(table).select("id", { count: "exact", head: true });
    const timeout = new Promise<never>((_, reject) =>
      window.setTimeout(() => reject(new Error("timeout")), 8000),
    );
    const result = await Promise.race([request, timeout]);
    if (result.error) {
      console.warn(`[dashboard] ${table}:`, result.error.message);
      return 0;
    }
    return result.count ?? 0;
  } catch (error) {
    console.warn(`[dashboard] ${table} unavailable:`, error);
    return 0;
  }
}

function useDashboardCounts() {
  return useQuery({
    queryKey: ["dashboard-safe-counts"],
    queryFn: async (): Promise<Counts> => {
      const [students, cases, programs, evidences] = await Promise.all([
        countTable("students"),
        countTable("counseling_cases"),
        countTable("programs"),
        countTable("evidences"),
      ]);
      return { students, cases, programs, evidences };
    },
    retry: 0,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });
}

function Dashboard() {
  const { data: school } = useSchool();
  const {
    data = EMPTY,
    isLoading,
    isFetching,
    refetch,
  } = useDashboardCounts();

  const cards = [
    { label: "الطلاب", value: data.students, to: "/students" as const, icon: Users },
    { label: "الحالات", value: data.cases, to: "/cases" as const, icon: HeartHandshake },
    { label: "البرامج", value: data.programs, to: "/programs" as const, icon: ClipboardList },
    { label: "الشواهد", value: data.evidences, to: "/evidences" as const, icon: FolderCheck },
  ];

  return (
    <div dir="rtl" className="space-y-4">
      <section className="rounded-2xl border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-black">
              {school?.counselor_name ? `مرحبًا، ${school.counselor_name}` : "لوحة الموجه الطلابي"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {school?.school_name || "منصة الذات"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold disabled:opacity-60"
          >
            <RefreshCw className={`size-4 ${isFetching ? "animate-spin" : ""}`} />
            تحديث
          </button>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              to={card.to}
              className="rounded-2xl border bg-card p-4 shadow-sm transition hover:border-primary/40"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="rounded-xl bg-primary/10 p-2 text-primary">
                  <Icon className="size-5" />
                </span>
                <strong className="text-2xl font-black">{isLoading ? "—" : card.value}</strong>
              </div>
              <p className="mt-3 text-sm font-bold">{card.label}</p>
            </Link>
          );
        })}
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <Link
          to="/reports"
          className="flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-sm"
        >
          <FileText className="size-5 text-primary" />
          <div>
            <p className="font-black">التقارير</p>
            <p className="text-xs text-muted-foreground">فتح التقارير والإحصاءات</p>
          </div>
        </Link>
        <Link
          to="/settings"
          className="flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-sm"
        >
          <ClipboardList className="size-5 text-primary" />
          <div>
            <p className="font-black">إعدادات المدرسة</p>
            <p className="text-xs text-muted-foreground">بيانات المدرسة والموجه</p>
          </div>
        </Link>
      </section>
    </div>
  );
}
