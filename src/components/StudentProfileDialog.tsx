import { useMemo } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  const fullName = String(student?.["full_name"] ?? "");
  const studentNo = String(student?.["student_no"] ?? "");

  // نجلب كل السجلات المرتبطة بهذا الطالب من كل الجداول المرتبطة باسمه دفعة واحدة
  const { data: sections = {}, isLoading } = useQuery({
    queryKey: ["student-profile", fullName, studentNo],
    enabled: open && !!fullName,
    queryFn: async () => {
      const result: Record<string, Row[]> = {};
      for (const section of LINKED_SECTIONS) {
        const config = recordByKey(section.key);
        if (!config) continue;
        const { data, error } = await supabase
          .from(config.table as never)
          .select("*")
          .eq("student_name", fullName)
          .order("created_at", { ascending: false });
        if (error) {
          result[section.key] = [];
          continue;
        }
        result[section.key] = (data ?? []) as unknown as Row[];
      }
      return result;
    },
  });

  const stats = useMemo(
    () =>
      LINKED_SECTIONS.map((section) => ({
        key: section.key,
        count: sections[section.key]?.length ?? 0,
      })),
    [sections],
  );

  const phone = normalizeSaudiPhone(student?.["guardian_phone"]);
  const motherPhone = normalizeSaudiPhone(student?.["mother_phone"]);

  async function deleteRow(sectionKey: string, table: string, id: string) {
    if (!confirm("هل تريد حذف هذا السجل من ملف الطالب؟")) return;
    const { error } = await supabase.from(table as never).delete().eq("id", id);
    if (error) {
      toast.error(`تعذّر الحذف: ${error.message}`);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["student-profile", fullName, studentNo] });
    queryClient.invalidateQueries({ queryKey: [table] });
    toast.success("تم حذف السجل من ملف الطالب");
  }

  if (!student) return null;

  // تجهيز الحقول الأساسية والإضافية (الصف، الفصل، جوال الأم إن وجدت)
  const infoFields: { label: string; key: string }[] = [
    { label: "اسم الطالب", key: "full_name" },
    { label: "جوال ولي الأمر", key: "guardian_phone" },
    { label: "رقم الطالب", key: "student_no" },
    ...(student["grade"] ? [{ label: "الصف", key: "grade" }] : []),
    ...(student["classroom"] ? [{ label: "الفصل", key: "classroom" }] : []),
    { label: "ولي الأمر", key: "guardian_name" },
    ...(student["mother_phone"] ? [{ label: "جوال الأم", key: "mother_phone" }] : []),
    { label: "الحالة", key: "status" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserRound className="size-5 text-primary" />
            ملف الطالب: {fullName || "—"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* بيانات الطالب الأساسية */}
          <div className="rounded-xl border bg-muted/30 p-4">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
              {infoFields.map((f) => (
                <div key={f.key}>
                  <p className="text-[11px] text-muted-foreground">{f.label}</p>
                  <p className="font-semibold">{displayRecordValue(student[f.key])}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
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

          {/* ملخص عدد السجلات المرتبطة */}
          <div className="flex flex-wrap gap-2">
            {stats.map((s) => {
              const config = recordByKey(s.key)!;
              return (
                <Badge key={s.key} variant={s.count ? "default" : "outline"} className="gap-1">
                  {config.title}: {s.count}
                </Badge>
              );
            })}
          </div>

          {isLoading && <p className="text-sm text-muted-foreground">جارٍ تحميل ملف الطالب...</p>}

          {/* الأقسام المرتبطة باسم الطالب */}
          {!isLoading && (
            <Accordion type="multiple" className="w-full">
              {LINKED_SECTIONS.map((section) => {
                const config = recordByKey(section.key)!;
                const Icon = section.icon;
                const rows = sections[section.key] ?? [];
                return (
                  <AccordionItem key={section.key} value={section.key}>
                    <AccordionTrigger className="text-sm font-bold">
                      <span className="flex items-center gap-2">
                        <Icon className="size-4 text-primary" />
                        {config.title} ({rows.length})
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="mb-2 flex justify-end">
                        <Button asChild size="sm" variant="outline">
                          <Link to={`/${section.key}` as never} onClick={() => onOpenChange(false)}>
                            <GraduationCap className="size-4" /> إضافة سجل جديد لهذا الطالب في {config.title}
                          </Link>
                        </Button>
                      </div>
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
                              <Button
                                variant="ghost"
                                size="icon"
                                title="حذف السجل"
                                onClick={() => deleteRow(section.key, config.table, row.id)}
                              >
                                <Trash2 className="size-4 text-destructive" />
                              </Button>
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

          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <BookOpenText className="size-3.5" />
            هذا الملف يجمع تلقائياً كل سجل داخل الموقع مرتبط باسم الطالب «{fullName}» في الحالات والمقابلات والمواظبة
            والسلوك والإحالات.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}