import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  CalendarDays,
  ClipboardList,
  FileCheck2,
  FolderCheck,
  HeartHandshake,
  Inbox,
  MessageSquareText,
  Plus,
  Search,
  Send,
  ShieldAlert,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type StudentResult = {
  id: string;
  full_name: string | null;
  student_no: string | null;
  grade: string | null;
  classroom: string | null;
};

export function QuickActionLauncher({
  guidanceAllowed,
  className,
  mobile = false,
}: {
  guidanceAllowed: boolean;
  className?: string;
  mobile?: boolean;
}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [studentTerm, setStudentTerm] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<StudentResult | null>(null);
  const normalized = studentTerm.trim();

  const { data: schoolContext } = useQuery({
    queryKey: ["school-access-context"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_my_school_context");
      if (error) throw error;
      return data ?? { membership: null };
    },
    staleTime: 30_000,
  });
  const role = String(schoolContext?.membership?.role ?? "");

  const { data: students = [], isFetching } = useQuery({
    queryKey: ["quick-action-student-search", normalized],
    enabled: open && guidanceAllowed && normalized.length >= 2,
    queryFn: async () => {
      const pattern = `%${normalized}%`;
      const { data, error } = await supabase
        .from("students")
        .select("id,full_name,student_no,grade,classroom")
        .or(`full_name.ilike.${pattern},student_no.ilike.${pattern}`)
        .order("full_name", { ascending: true })
        .limit(8);
      if (error) throw error;
      return (data ?? []) as StudentResult[];
    },
    staleTime: 30_000,
  });

  function go(to: string) {
    setOpen(false);
    setStudentTerm("");
    setSelectedStudent(null);
    navigate({ to: to as never });
  }

  const studentUrl = (route: string) => {
    if (!selectedStudent) return route;
    const params = new URLSearchParams({
      new: "student",
      studentId: selectedStudent.id,
      studentNo: selectedStudent.student_no ?? "",
      studentName: selectedStudent.full_name ?? "",
    });
    return `${route}?${params.toString()}`;
  };

  const counselorActions = [
    { label: "طالب جديد", detail: "إضافة طالب للسجل", to: "/students?new=1", icon: UserPlus },
    { label: "حالة", detail: "فتح حالة طلابية", to: "/cases?new=1", icon: HeartHandshake },
    { label: "جلسة", detail: "مقابلة أو جلسة", to: "/interviews?new=1", icon: MessageSquareText },
    { label: "إحالة", detail: "إنشاء إحالة طالب", to: "/referrals?new=1", icon: Send },
    { label: "مواظبة", detail: "تسجيل متابعة مواظبة", to: "/attendance?new=1", icon: CalendarDays },
    { label: "سلوك", detail: "تسجيل متابعة سلوكية", to: "/behavior?new=1", icon: ShieldAlert },
    { label: "برنامج", detail: "برنامج أو نشاط", to: "/programs?new=1", icon: Sparkles },
    { label: "شاهد", detail: "رفع شاهد وتوثيق", to: "/evidences?new=1", icon: FolderCheck },
    { label: "موعد", detail: "إضافة موعد للتقويم", to: "/calendar?new=1", icon: CalendarDays },
    { label: "مهمة", detail: "مهام المدرسة", to: "/school-tasks", icon: ClipboardList },
    { label: "تقرير", detail: "التقارير والإحصاءات", to: "/reports", icon: FileCheck2 },
    { label: "الوارد", detail: "كل ما يحتاج إجراء", to: "/inbox", icon: Inbox },
  ];

  const staffActions = [
    { label: "مهمة مدرسية", detail: "فتح مهامي وإسناداتي", to: "/school-tasks", icon: ClipboardList },
    { label: "مراسلة", detail: "التقارير والاعتمادات", to: "/school-inbox", icon: FileCheck2 },
    { label: "الوارد", detail: "كل ما يحتاج إجراء", to: "/inbox", icon: Inbox },
    { label: "فريق المدرسة", detail: "الأعضاء والصلاحيات", to: "/school-team", icon: Users },
  ];

  const teacherActions = [
    { label: "طلابي", detail: "عرض الطلاب ضمن نطاقك", to: "/students", icon: Users },
    { label: "إحالة طالب", detail: "إنشاء أو متابعة إحالة", to: "/referrals?new=1", icon: Send },
    { label: "مهامي", detail: "فتح المهام المسندة لك", to: "/school-tasks", icon: ClipboardList },
    { label: "الرسائل", detail: "التواصل والخدمات", to: "/messages", icon: MessageSquareText },
  ];
  const studentActions = [
    { label: "ملفي", detail: "فتح ملفك الطلابي", to: "/students", icon: Users },
    { label: "الرسائل", detail: "التواصل والخدمات المتاحة", to: "/messages", icon: MessageSquareText },
    { label: "مستنداتي", detail: "المستندات المرتبطة بك", to: "/free-documents", icon: FileCheck2 },
    { label: "حسابي", detail: "بيانات الحساب", to: "/profile", icon: Users },
  ];
  const parentActions = [
    { label: "أبنائي", detail: "ملفات الأبناء المرتبطين بحسابك", to: "/students", icon: Users },
    { label: "الرسائل", detail: "التواصل والخدمات المتاحة", to: "/messages", icon: MessageSquareText },
    { label: "المستندات", detail: "المستندات المرتبطة بالأبناء", to: "/free-documents", icon: FileCheck2 },
    { label: "حسابي", detail: "بيانات الحساب", to: "/profile", icon: Users },
  ];

  const actions = guidanceAllowed
    ? counselorActions
    : role === "teacher"
      ? teacherActions
      : role === "student"
        ? studentActions
        : role === "parent"
          ? parentActions
          : staffActions;

  return (
    <>
      {mobile ? (
        <Button
          type="button"
          variant="ghost"
          onClick={() => setOpen(true)}
          className={cn("flex h-auto min-h-[4.15rem] flex-col items-center justify-center gap-1 p-0 text-[10px] font-black text-primary", className)}
          aria-label="إجراء جديد"
        >
          <span className="-mt-5 flex size-12 items-center justify-center rounded-full border-4 border-card bg-primary text-primary-foreground shadow-[var(--shadow-soft)]">
            <Plus className="size-6" />
          </span>
          <span>جديد</span>
        </Button>
      ) : (
        <Button
          type="button"
          onClick={() => setOpen(true)}
          className={cn("gap-2", className)}
          size="sm"
        >
          <Plus className="size-4" />
          إجراء جديد
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="max-h-[88vh] max-w-3xl overflow-y-auto max-sm:inset-x-0 max-sm:bottom-0 max-sm:top-auto max-sm:w-full max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-b-none max-sm:rounded-t-[2rem] max-sm:border-x-0 max-sm:border-b-0 max-sm:px-4 max-sm:pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <DialogHeader>
            <DialogTitle>إجراء جديد</DialogTitle>
          </DialogHeader>

          {guidanceAllowed && (
            <section className="rounded-2xl border border-primary/15 bg-primary/[0.03] p-3">
              <div className="flex items-center gap-2">
                <Search className="size-4 text-primary" />
                <div>
                  <h3 className="text-sm font-black">ابدأ من الطالب</h3>
                  <p className="text-[10px] text-muted-foreground">اختر الطالب مرة واحدة ثم أنشئ الإجراء وبياناته الأساسية معبأة تلقائيًا.</p>
                </div>
              </div>

              {!selectedStudent ? (
                <>
                  <Input
                    autoFocus
                    value={studentTerm}
                    onChange={(event) => setStudentTerm(event.target.value)}
                    placeholder="ابحث باسم الطالب أو رقمه..."
                    className="mt-3"
                  />
                  {normalized.length >= 2 && (
                    <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                      {isFetching && <p className="col-span-full p-3 text-center text-xs text-muted-foreground">جارٍ البحث...</p>}
                      {!isFetching && students.length === 0 && <p className="col-span-full p-3 text-center text-xs text-muted-foreground">لا توجد نتيجة مطابقة.</p>}
                      {students.map((student) => (
                        <button
                          key={student.id}
                          type="button"
                          onClick={() => setSelectedStudent(student)}
                          className="rounded-xl border bg-background p-3 text-right transition hover:border-primary/40"
                        >
                          <p className="truncate text-xs font-black">{student.full_name || "طالب"}</p>
                          <p className="mt-1 text-[10px] text-muted-foreground">
                            {student.student_no || "بدون رقم"} · {student.grade || "—"} {student.classroom ? `· ${student.classroom}` : ""}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="mt-3">
                  <div className="flex items-center justify-between gap-3 rounded-xl border bg-background p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black">{selectedStudent.full_name || "طالب"}</p>
                      <p className="text-[10px] text-muted-foreground">{selectedStudent.student_no || "بدون رقم"} · {selectedStudent.grade || "—"}</p>
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedStudent(null)}>تغيير</Button>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
                    {[
                      { label: "فتح حالة", route: "/cases", icon: HeartHandshake },
                      { label: "جلسة", route: "/interviews", icon: MessageSquareText },
                      { label: "إحالة", route: "/referrals", icon: Send },
                      { label: "مواظبة", route: "/attendance", icon: CalendarDays },
                      { label: "سلوك", route: "/behavior", icon: ShieldAlert },
                    ].map((item) => {
                      const Icon = item.icon;
                      return (
                        <button key={item.route} type="button" onClick={() => go(studentUrl(item.route))} className="rounded-xl border bg-background p-3 text-center transition hover:border-primary/40 hover:bg-primary/[0.04]">
                          <Icon className="mx-auto size-4 text-primary" />
                          <p className="mt-1 text-[10px] font-black">{item.label}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>
          )}

          <section>
            <h3 className="mb-2 text-xs font-black text-muted-foreground">كل الإجراءات</h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {actions.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => go(item.to)}
                    className="flex items-center gap-3 rounded-xl border bg-background p-3 text-right transition hover:border-primary/40 hover:bg-primary/[0.04]"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs font-black">{item.label}</span>
                      <span className="mt-0.5 block truncate text-[9px] text-muted-foreground">{item.detail}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </DialogContent>
      </Dialog>
    </>
  );
}
