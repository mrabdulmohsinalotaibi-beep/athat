import { useMemo, useState } from "react";
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
  CopyX,
  ArrowDownUp,
  Upload,
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
  const [importingSection, setImportingSection] = useState<string | null>(null);

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
        let rows = (data ?? []) as unknown as Row[];

        // ترتيب الأبجدي تلقائياً بناءً على حقل العنوان باللغة العربية
        rows = rows.sort((a, b) => {
          const valA = String(a[section.titleField] ?? "").toLowerCase();
          const valB = String(b[section.titleField] ?? "").toLowerCase();
          return valA.localeCompare(valB, "ar");
        });

        result[section.key] = rows;
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

  // دالة حذف السجلات المتكررة داخل القسم الواحد بضغطة زر
  async function removeDuplicates(sectionKey: string, table: string, rows: Row[]) {
    if (!rows || rows.length === 0) return;
    if (!confirm("هل أنت متأكد من حذف السجلات المتكررة والإبقاء على نسخة واحدة فقط؟")) return;

    const seen = new Set<string>();
    const idsToDelete: string[] = [];

    for (const row of rows) {
      const sectionConfig = LINKED_SECTIONS.find((s) => s.key === sectionKey);
      const titleVal = String(row[sectionConfig?.titleField ?? ""] ?? "").trim();
      
      if (seen.has(titleVal)) {
        idsToDelete.push(String(row.id));
      } else {
        seen.add(titleVal);
      }
    }

    if (idsToDelete.length === 0) {
      toast.info("لا توجد سجلات متكررة للحذف.");
      return;
    }

    const { error } = await supabase.from(table as never).delete().in("id", idsToDelete);
    if (error) {
      toast.error(`تعذّر حذف المتكرر: ${error.message}`);
      return;
    }

    queryClient.invalidateQueries({ queryKey: ["student-profile", fullName, studentNo] });
    queryClient.invalidateQueries({ queryKey: [table] });
    toast.success(`تم بنجاح حذف ${idsToDelete.length} من السجلات المتكررة.`);
  }

  // دالة استيراد ملف CSV ورفع السجلات مباشرة لهذا القسم
  async function handleCSVImport(table: string, sectionKey: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split("\n").filter((l) => l.trim() !== "");
        if (lines.length < 2) {
          toast.error("ملف الـ CSV فارغ أو لا يحتوي على بيانات صحيحة.");
          return;
        }

        const headers = lines[0].split(",").map((h) => h.trim().replace(/^["']|["']$/g, ""));
        const recordsToInsert = [];

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(",").map((v) => v.trim().replace(/^["']|["']$/g, ""));
          const record: Record<string, any> = { student_name: fullName };

          headers.forEach((header, index) => {
            if (values[index] !== undefined) {
              record[header] = values[index];
            }
          });
          recordsToInsert.push(record);
        }

        setImportingSection(sectionKey);
        const { error } = await supabase.from(table as never).insert(recordsToInsert as never);
        
        if (error) {
          toast.error(`فشل الاستيراد: ${error.message}`);
        } else {
          toast.success("تم استيراد السجلات بنجاح!");
          queryClient.invalidateQueries({ queryKey: ["student-profile", fullName, studentNo] });
          queryClient.invalidateQueries({ queryKey: [table] });
        }
      } catch (err: any) {
        toast.error("حدث خطأ أثناء قراءة ملف الـ CSV");
      } finally {
        setImportingSection(null);
        e.target.value = ""; // إعادة تعيين الحقل
      }
    };
    reader.readAsText(file);
  }

  if (!student) return null;

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
                        <span className="text-xs font-normal text-muted-foreground flex items-center gap-1 mr-2">
                          <ArrowDownUp className="size-3" /> مرتب أبجديّاً
                        </span>
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap gap-2">
                          {rows.length > 0 && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => removeDuplicates(section.key, config.table, rows)}
                              className="gap-1"
                            >
                              <CopyX className="size-4" /> حذف المتكرر
                            </Button>
                          )}
                          
                          {/* زر استيراد CSV سريع */}
                          <label className="cursor-pointer">
                            <Button size="sm" variant="outline" asChild className="gap-1">
                              <span>
                                <Upload className="size-4" />
                                {importingSection === section.key ? "جارٍ الاستيراد..." : "استيراد CSV"}
                              </span>
                            </Button>
                            <input
                              type="file"
                              accept=".csv"
                              className="hidden"
                              onChange={(e) => handleCSVImport(config.table, section.key, e)}
                            />
                          </label>
                        </div>

                        <Button asChild size="sm" variant="outline">
                          <Link to={`/${section.key}` as never} onClick={() => onOpenChange(false)}>
                            <GraduationCap className="size-4" /> إضافة سجل جديد
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