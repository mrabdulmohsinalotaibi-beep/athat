import { useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  BookOpenText,
  CalendarClock,
  ClipboardList,
  ExternalLink,
  GraduationCap,
  MessageSquare,
  ShieldAlert,
  Trash2,
  UserRound,
  ArrowDownUp,
  Activity,
  FileArchive,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { displayRecordValue } from "@/lib/display";
import { normalizeSaudiPhone, whatsappLink } from "@/lib/whatsapp";
import { recordByKey } from "@/lib/records";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { OfficialFooter, OfficialHeader } from "@/components/OfficialHeader";
import { PdfPreviewButton } from "@/components/PdfPreviewButton";
import { useSchool } from "@/lib/school";
import { hasPermission, type PermissionKey } from "@/lib/team-permissions";

type Row = Record<string, unknown> & { id: string };

// الخانات (السجلات) المرتبطة باسم الطالب داخل الموقع — كل سجل فيه حقل "student: true"
const LINKED_SECTIONS = [
  { key: "cases", icon: ClipboardList, dateField: "opened_at", titleField: "summary" },
  { key: "interviews", icon: MessageSquare, dateField: "idate", titleField: "topic" },
  { key: "attendance", icon: CalendarClock, dateField: "adate", titleField: "case_type" },
  { key: "behavior", icon: ShieldAlert, dateField: "bdate", titleField: "observation" },
  { key: "referrals", icon: ExternalLink, dateField: "referral_date", titleField: "reason" },
] as const;

export function StudentProfileDialog({
  open,
  onOpenChange,
  student,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  student: Row | null;
}) {
  const queryClient = useQueryClient();
  const { data: school } = useSchool();
  const { data: accessContext } = useQuery({
    queryKey: ["school-access-context"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_my_school_context");
      if (error) throw error;
      return data ?? { membership: null };
    },
    staleTime: 30_000,
  });
  const membership = accessContext?.membership ?? null;
  const printRef = useRef<HTMLDivElement>(null);
  const fullName = String(student?.["full_name"] ?? "");
  const studentNo = String(student?.["student_no"] ?? "");
  const studentId = String(student?.id ?? "");

  const sectionPermissions: Record<string, { view: PermissionKey; edit: PermissionKey }> = {
    cases: { view: "cases.view", edit: "cases.edit" },
    interviews: { view: "interviews.view", edit: "interviews.edit" },
    attendance: { view: "attendance.view", edit: "attendance.edit" },
    behavior: { view: "attendance.view", edit: "attendance.edit" },
    referrals: { view: "referrals.view", edit: "referrals.edit" },
  };
  const visibleLinkedSections = LINKED_SECTIONS.filter((section) =>
    hasPermission(membership, sectionPermissions[section.key]?.view ?? "students.view"),
  );
  const canEditSection = (sectionKey: string) =>
    hasPermission(membership, sectionPermissions[sectionKey]?.edit ?? "students.edit");
  const hasGuidanceDetails = visibleLinkedSections.length > 0;

  // نجلب فقط السجلات التي يسمح بها دور المستخدم ونطاقه
  const { data: sections = {}, isLoading } = useQuery({
    queryKey: ["student-profile", studentId, fullName, studentNo],
    enabled: open && Boolean(studentId || studentNo || fullName),
    queryFn: async () => {
      const entries = await Promise.all(
        visibleLinkedSections.map(async (section) => {
          const config = recordByKey(section.key);

          // New records use student_id, while historical records still match by
          // student number/name. Query every section in parallel so opening a
          // student file does not wait for each table sequentially.
          const [linked, legacy] = await Promise.all([
            studentId
              ? supabase
                  .from(config.table as never)
                  .select("*")
                  .eq("student_id", studentId)
              : Promise.resolve({ data: [], error: null }),
            studentNo
              ? supabase
                  .from(config.table as never)
                  .select("*")
                  .eq("student_no", studentNo)
              : supabase
                  .from(config.table as never)
                  .select("*")
                  .eq("student_name", fullName),
          ]);

          if (linked.error) {
            console.warn(`[student-profile] ${section.key} student_id:`, linked.error.message);
          }
          if (legacy.error) {
            console.warn(`[student-profile] ${section.key} legacy:`, legacy.error.message);
          }

          const merged = [
            ...((linked.error ? [] : linked.data ?? []) as unknown as Row[]),
            ...((legacy.error ? [] : legacy.data ?? []) as unknown as Row[]),
          ];
          const unique = new Map(merged.map((row) => [row.id, row]));
          const rows = Array.from(unique.values()).sort((a, b) => {
            const dateA = String(a[section.dateField] ?? a["created_at"] ?? "");
            const dateB = String(b[section.dateField] ?? b["created_at"] ?? "");
            return dateB.localeCompare(dateA, "ar");
          });

          return [section.key, rows] as const;
        }),
      );

      return Object.fromEntries(entries) as Record<string, Row[]>;
    },
  });

  const { data: linkedDocuments = [] } = useQuery({
    queryKey: ["student-documents", studentId, studentNo, fullName],
    enabled: open && Boolean(studentId || studentNo || fullName),
    queryFn: async () => {
      let query = (supabase as any)
        .from("free_documents")
        .select("id,title,document_kind,template_id,student_id,student_name,student_no,updated_at,status")
        .order("updated_at", { ascending: false });

      if (studentId) query = query.eq("student_id", studentId);
      else if (studentNo) query = query.eq("student_no", studentNo);
      else query = query.eq("student_name", fullName);

      const { data, error } = await query;
      if (error) {
        console.warn("[student-profile] linked documents:", error.message);
        return [];
      }
      return (data ?? []) as Array<Record<string, unknown> & { id: string }>;
    },
  });

  const stats = useMemo(
    () =>
      visibleLinkedSections.map((section) => ({
        key: section.key,
        count: sections[section.key]?.length ?? 0,
      })),
    [sections, visibleLinkedSections],
  );

  const phone = normalizeSaudiPhone(student?.["guardian_phone"]);
  const motherPhone = normalizeSaudiPhone(student?.["mother_phone"]);
  const cases = sections["cases"] ?? [];
  const interviews = sections["interviews"] ?? [];
  const activeCases = cases.filter((row) => !["مغلقة", "مغلق", "مكتمل"].includes(String(row["case_status"] ?? "")));
  const today = new Date().toISOString().slice(0, 10);
  const overdueFollowups = activeCases.filter((row) => {
    const followup = String(row["followup_at"] ?? "").slice(0, 10);
    return followup && followup <= today;
  });
  const timeline = useMemo(
    () =>
      visibleLinkedSections.flatMap((section) =>
        (sections[section.key] ?? []).map((row) => ({
          id: `${section.key}-${row.id}`,
          date: String(row[section.dateField] ?? row["created_at"] ?? ""),
          label: recordByKey(section.key)?.title ?? section.key,
          title: String(row[section.titleField] ?? ""),
          detail: String(
            row["next_action"] ??
              row["result"] ??
              row["action"] ??
              row["recommendations"] ??
              row["notes"] ??
              "",
          ),
        })),
      )
        .sort((a, b) => b.date.localeCompare(a.date, "ar"))
        .slice(0, 12),
    [sections, visibleLinkedSections],
  );
  const latestActivity = timeline[0];
  const priorityCase = overdueFollowups[0] ?? activeCases[0] ?? null;
  const nextStudentAction = priorityCase
    ? String(
        priorityCase["next_action"] ??
          priorityCase["recommendations"] ??
          priorityCase["summary"] ??
          "مراجعة الحالة وتحديد الإجراء التالي",
      )
    : "";

  async function deleteRow(sectionKey: string, table: string, id: string) {
    if (!confirm("هل تريد حذف هذا السجل من ملف الطالب؟")) return;
    const { error } = await supabase
      .from(table as never)
      .delete()
      .eq("id", id);
    if (error) {
      toast.error(`تعذّر الحذف: ${error.message}`);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["student-profile", studentId, fullName, studentNo] });
    queryClient.invalidateQueries({ queryKey: [table] });
    toast.success("تم حذف السجل من ملف الطالب");
  }


  if (!student) return null;

  const infoFields: { label: string; key: string }[] = [
    { label: "اسم الطالب", key: "full_name" },
    { label: "رقم الطالب", key: "student_no" },
    ...(student["national_id"] ? [{ label: "رقم الهوية", key: "national_id" }] : []),
    ...(student["stage"] ? [{ label: "المرحلة", key: "stage" }] : []),
    { label: "جوال ولي الأمر", key: "guardian_phone" },
    ...(student["grade"] ? [{ label: "الصف", key: "grade" }] : []),
    ...(student["classroom"] ? [{ label: "الفصل", key: "classroom" }] : []),
    { label: "ولي الأمر", key: "guardian_name" },
    ...(student["mother_phone"] ? [{ label: "جوال الأم", key: "mother_phone" }] : []),
    ...(student["nationality"] ? [{ label: "الجنسية", key: "nationality" }] : []),
    ...(student["health_status"] ? [{ label: "الحالة الصحية", key: "health_status" }] : []),
    ...(student["social_status"] ? [{ label: "الحالة الاجتماعية", key: "social_status" }] : []),
    ...(student["address"] ? [{ label: "العنوان", key: "address" }] : []),
    { label: "الحالة", key: "status" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94dvh] w-[calc(100vw-1rem)] max-w-[46rem] overflow-y-auto rounded-[1.75rem] p-3 sm:p-4 xl:max-w-4xl" dir="rtl">
        <DialogHeader data-pdf-exclude="true">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <DialogTitle className="flex items-center gap-2">
              <UserRound className="size-5 text-primary" />
              ملف الطالب: {fullName || "—"}
            </DialogTitle>
            <PdfPreviewButton elementRef={printRef} filename={`ملف-الطالب-${fullName || studentNo}`} title={`ملف الطالب: ${fullName || "—"}`} />
          </div>
        </DialogHeader>

        <div ref={printRef} className="record-pdf-document space-y-4 rounded-2xl bg-paper p-3 text-paper-foreground sm:p-4">
          <OfficialHeader school={school} title={`ملف الطالب: ${fullName || "—"}`} reportType="ملف طالب" reportNo={studentNo || undefined} />
          {/* بيانات الطالب الأساسية */}
          <div className="rounded-3xl border border-primary/10 bg-gradient-to-bl from-[#E4ECDF] via-[#FFFDF9] to-[#EFE1D7] p-4 shadow-[var(--shadow-card)]">
            <div className="mb-4 flex items-center gap-3">
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-[#E4ECDF] text-[#264938]">
                <UserRound className="size-6" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-base font-black text-navy">{fullName || "طالب"}</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {[student["stage"], student["grade"], student["classroom"]].filter(Boolean).join(" · ") || "البيانات الأساسية"}
                </p>
              </div>
              <Badge className="mr-auto rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                {displayRecordValue(student["status"]) || "نشط"}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm xl:grid-cols-3">
              {infoFields.map((f) => (
                <div key={f.key}>
                  <p className="text-[11px] text-muted-foreground">{f.label}</p>
                  <p className="font-semibold">{displayRecordValue(student[f.key])}</p>
                </div>
              ))}
            </div>
            <div data-pdf-exclude="true" className="mt-3 flex flex-wrap gap-2">
              {phone && (
                <Button asChild size="sm" variant="outline">
                  <a
                    href={whatsappLink(
                      student["guardian_phone"],
                      `السلام عليكم، بخصوص الطالب: ${fullName}`,
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageSquare className="size-4" /> تواصل عبر واتساب مع ولي الأمر
                  </a>
                </Button>
              )}
              {motherPhone && (
                <Button asChild size="sm" variant="outline">
                  <a
                    href={whatsappLink(
                      student["mother_phone"],
                      `السلام عليكم، بخصوص الطالب: ${fullName}`,
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageSquare className="size-4" /> تواصل عبر واتساب مع الأم
                  </a>
                </Button>
              )}
            </div>
          </div>

          {!isLoading && hasPermission(membership, "cases.view") && nextStudentAction && (
            <div data-pdf-exclude="true" className="rounded-2xl border border-[#9A6C78]/25 bg-[#F1E5E8]/60 p-3 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-black text-primary">
                    {overdueFollowups.length ? "الإجراء التالي · متابعة مستحقة" : "الإجراء التالي"}
                  </p>
                  <p className="mt-1 text-sm font-black">{nextStudentAction}</p>
                  {Boolean(priorityCase?.["followup_at"]) && (
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      موعد المتابعة: {displayRecordValue(priorityCase?.["followup_at"])}
                    </p>
                  )}
                </div>
                <Button asChild size="sm">
                  <a href={`/cases?student=${encodeURIComponent(studentId)}`} onClick={() => onOpenChange(false)}>
                    فتح الحالة
                  </a>
                </Button>
              </div>
            </div>
          )}

          {visibleLinkedSections.some((section) => canEditSection(section.key)) && (
            <div data-pdf-exclude="true" className="rounded-2xl border border-[#89AA74]/30 bg-[#E4ECDF]/70 p-3">
              <p className="mb-2 text-xs font-black text-primary">إجراء جديد للطالب</p>
              <div className="grid grid-cols-2 gap-2 xl:flex xl:flex-wrap">
                {canEditSection("cases") && <Button asChild size="sm" variant="outline"><a href={`/cases?new=student&studentId=${encodeURIComponent(studentId)}&studentNo=${encodeURIComponent(studentNo)}&studentName=${encodeURIComponent(fullName)}`} onClick={() => onOpenChange(false)}><ClipboardList className="size-4" /> فتح حالة</a></Button>}
                {canEditSection("interviews") && <Button asChild size="sm" variant="outline"><a href={`/interviews?new=student&studentId=${encodeURIComponent(studentId)}&studentNo=${encodeURIComponent(studentNo)}&studentName=${encodeURIComponent(fullName)}`} onClick={() => onOpenChange(false)}><MessageSquare className="size-4" /> إضافة جلسة</a></Button>}
                {canEditSection("referrals") && <Button asChild size="sm" variant="outline"><a href={`/referrals?new=student&studentId=${encodeURIComponent(studentId)}&studentNo=${encodeURIComponent(studentNo)}&studentName=${encodeURIComponent(fullName)}`} onClick={() => onOpenChange(false)}><ExternalLink className="size-4" /> إنشاء إحالة</a></Button>}
                {canEditSection("attendance") && <Button asChild size="sm" variant="outline"><a href={`/attendance?new=student&studentId=${encodeURIComponent(studentId)}&studentNo=${encodeURIComponent(studentNo)}&studentName=${encodeURIComponent(fullName)}`} onClick={() => onOpenChange(false)}><CalendarClock className="size-4" /> تسجيل مواظبة</a></Button>}
                {canEditSection("behavior") && <Button asChild size="sm" variant="outline"><a href={`/behavior?new=student&studentId=${encodeURIComponent(studentId)}&studentNo=${encodeURIComponent(studentNo)}&studentName=${encodeURIComponent(fullName)}`} onClick={() => onOpenChange(false)}><ShieldAlert className="size-4" /> تسجيل سلوك</a></Button>}
              </div>
            </div>
          )}

          {/* ملخص عدد السجلات المرتبطة */}
          <div className="flex flex-wrap gap-2">
            <Badge variant={linkedDocuments.length ? "default" : "outline"} className="gap-1">
              المستندات: {linkedDocuments.length}
            </Badge>
            {stats.map((s) => {
              const config = recordByKey(s.key)!;
              return (
                <Badge key={s.key} variant={s.count ? "default" : "outline"} className="gap-1">
                  {config.title}: {s.count}
                </Badge>
              );
            })}
          </div>

          {!isLoading && hasGuidanceDetails && (
            <section className="break-inside-avoid rounded-2xl border border-paper-border bg-paper-muted p-4">
              <div className="mb-3 flex items-center gap-2">
                <ClipboardList className="size-4 text-primary" />
                <h3 className="text-sm font-black">ملخص متابعة التوجيه الطلابي</h3>
              </div>
              <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                <FollowStat label="الحالات النشطة" value={activeCases.length} />
                <FollowStat label="الجلسات" value={interviews.length} />
                <FollowStat label="متابعات مستحقة" value={overdueFollowups.length} />
                <FollowStat label="إجمالي السجلات" value={stats.reduce((sum, item) => sum + item.count, 0)} />
              </div>
              {latestActivity ? (
                <p className="mt-3 text-xs leading-6 text-paper-muted-foreground">
                  آخر نشاط مسجل: <strong className="text-paper-foreground">{latestActivity.label}</strong>
                  {latestActivity.title ? ` — ${latestActivity.title}` : ""}.
                </p>
              ) : (
                <p className="mt-3 text-xs text-paper-muted-foreground">لا توجد متابعة في التوجيه الطلابي مسجلة للطالب حتى الآن.</p>
              )}
            </section>
          )}

          {!isLoading && timeline.length > 0 && (
            <section className="break-inside-avoid rounded-2xl border border-paper-border bg-paper p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Activity className="size-4 text-primary" />
                  <h3 className="text-sm font-black">الخط الزمني للطالب</h3>
                </div>
                <span className="text-[10px] text-paper-muted-foreground">أحدث 12 إجراء</span>
              </div>
              <div className="space-y-2">
                {timeline.map((item) => (
                  <div key={item.id} className="relative border-r-2 border-primary/20 pr-4">
                    <span className="absolute -right-[5px] top-2 size-2 rounded-full bg-primary" />
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-black text-paper-foreground">{item.label}</p>
                      <span className="text-[10px] text-paper-muted-foreground">
                        {displayRecordValue(item.date)}
                      </span>
                    </div>
                    {item.title && <p className="mt-0.5 text-xs">{item.title}</p>}
                    {item.detail && (
                      <p className="mt-1 line-clamp-2 text-[10px] leading-5 text-paper-muted-foreground">
                        {item.detail}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {isLoading && <p className="text-sm text-muted-foreground">جارٍ تحميل ملف الطالب...</p>}

          {!isLoading && (
            <section className="break-inside-avoid rounded-2xl border border-paper-border bg-paper p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <FileArchive className="size-4 text-primary" />
                  <h3 className="text-sm font-black">المستندات والنماذج المرتبطة ({linkedDocuments.length})</h3>
                </div>
                <Button asChild data-pdf-exclude="true" size="sm" variant="outline">
                  <Link to="/free-documents" onClick={() => onOpenChange(false)}>
                    فتح الأرشيف
                  </Link>
                </Button>
              </div>
              {linkedDocuments.length === 0 ? (
                <p className="rounded-lg border border-dashed p-4 text-center text-xs text-paper-muted-foreground">
                  لا توجد مستندات محفوظة مرتبطة بهذا الطالب حتى الآن.
                </p>
              ) : (
                <div className="space-y-2">
                  {linkedDocuments.slice(0, 10).map((doc) => (
                    <div key={doc.id} className="rounded-lg border border-paper-border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs font-black">{String(doc["title"] ?? "مستند")}</p>
                        <span className="text-[10px] text-paper-muted-foreground">
                          {displayRecordValue(doc["updated_at"])}
                        </span>
                      </div>
                      <p className="mt-1 text-[10px] text-paper-muted-foreground">
                        {doc["document_kind"] === "electronic-template" ? "نموذج إلكتروني محفوظ" : "مستند محفوظ"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* الأقسام المرتبطة باسم الطالب */}
          {!isLoading && hasGuidanceDetails && (
            <Accordion type="multiple" defaultValue={visibleLinkedSections.map((section) => section.key)} className="w-full">
              {visibleLinkedSections.map((section) => {
                const config = recordByKey(section.key)!;
                const Icon = section.icon;
                const rows = sections[section.key] ?? [];
                return (
                  <AccordionItem key={section.key} value={section.key}>
                    <AccordionTrigger className="text-sm font-bold">
                      <span className="flex items-center gap-2">
                        <Icon className="size-4 text-primary" />
                        {config.title} ({rows.length})
                        <span className="text-xs font-normal text-muted-foreground flex items-center gap-1 mr-2">
                          <ArrowDownUp className="size-3" /> الأحدث أولاً
                        </span>
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      {canEditSection(section.key) && (
                        <div data-pdf-exclude="true" className="mb-3 flex justify-end">
                          <Button asChild size="sm" variant="outline">
                            <a
                              href={`/${section.key}?new=student&studentId=${encodeURIComponent(studentId)}&studentNo=${encodeURIComponent(studentNo)}&studentName=${encodeURIComponent(fullName)}`}
                              onClick={() => onOpenChange(false)}
                            >
                              <GraduationCap className="size-4" /> إضافة سجل جديد
                            </a>
                          </Button>
                        </div>
                      )}

                      {rows.length === 0 ? (
                        <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                          لا توجد سجلات مرتبطة بهذا الطالب في {config.title} بعد.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {rows.map((row) => (
                            <div
                              key={row.id}
                              className="flex items-start justify-between gap-2 rounded-lg border p-3 text-sm"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-[11px] text-muted-foreground">
                                  {displayRecordValue(row[section.dateField])}
                                </p>
                                <p className="truncate font-medium">
                                  {displayRecordValue(row[section.titleField]) || "—"}
                                </p>
                              </div>
                              {canEditSection(section.key) && (
                                <Button
                                  data-pdf-exclude="true"
                                  variant="ghost"
                                  size="icon"
                                  title="حذف السجل"
                                  onClick={() => deleteRow(section.key, config.table, row.id)}
                                >
                                  <Trash2 className="size-4 text-destructive" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}

          <p data-pdf-exclude="true" className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <BookOpenText className="size-3.5" />
            {hasGuidanceDetails
              ? "يعرض هذا الملف السجلات المرتبطة بالطالب التي تسمح بها صلاحيات حسابك فقط."
              : "يعرض هذا الملف البيانات الأساسية والمستندات المسموح بها لحسابك، دون إظهار سجلات التوجيه الحساسة."}
          </p>
          <OfficialFooter school={school} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FollowStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-paper-border bg-paper p-3 text-center">
      <p className="text-lg font-black text-[var(--letterhead-primary)]">{value}</p>
      <p className="mt-1 text-[10px] text-paper-muted-foreground">{label}</p>
    </div>
  );
}
