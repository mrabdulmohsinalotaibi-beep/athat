import { useMemo, useState } from "react";
import { FileArchive, Loader2, Save, Sparkles, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StudentCombobox, type StudentOption } from "@/components/StudentCombobox";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/lib/school";
import { generateSmartFill } from "@/lib/deepseek.functions";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type TemplateField = { label: string; multiline?: boolean; placeholder?: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  fields: TemplateField[];
  templateId?: string;
  category?: string;
};

function studentValueForField(label: string, student: StudentOption) {
  const normalized = label.replace(/\s+/g, " ");
  if (/اسم الطالب.*الصف|الطالب.*الصف/.test(normalized)) {
    return [student.full_name, student.grade, student.classroom].filter(Boolean).join(" — ");
  }
  if (/اسم الطالب/.test(normalized)) return student.full_name;
  if (/رقم الطالب/.test(normalized)) return student.student_no;
  if (/الصف/.test(normalized) && !/وصف|هدف/.test(normalized)) return student.grade;
  if (/الفصل/.test(normalized)) return student.classroom;
  if (/ولي الأمر/.test(normalized) && /اسم/.test(normalized)) return student.guardian_name;
  if (/جوال|هاتف/.test(normalized) && /ولي الأمر/.test(normalized)) return student.guardian_phone;
  return "";
}

export function ElectronicTemplateDialog({
  open,
  onOpenChange,
  title,
  description,
  fields,
  templateId,
  category,
}: Props) {
  const queryClient = useQueryClient();
  const { data: school } = useSchool();
  const [values, setValues] = useState<Record<string, string>>({});
  const [selectedStudent, setSelectedStudent] = useState<StudentOption | null>(null);
  const [smartBusy, setSmartBusy] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [savedId, setSavedId] = useState("");
  const [smartPrompt, setSmartPrompt] = useState("");

  const normalizedFields = useMemo(
    () => (fields.length ? fields : [{ label: "الملاحظات", multiline: true }]),
    [fields],
  );

  function setValue(label: string, value: string) {
    setValues((current) => ({ ...current, [label]: value }));
  }

  function selectStudent(student: StudentOption) {
    setSelectedStudent(student);
    setValues((current) => {
      const next = { ...current };
      for (const field of normalizedFields) {
        const value = studentValueForField(field.label, student);
        if (value && !next[field.label]?.trim()) next[field.label] = value;
      }
      return next;
    });
  }

  function clearStudent() {
    setSelectedStudent(null);
  }

  async function fillWithAi() {
    const brief = smartPrompt.trim();
    if (brief.length < 5 || smartBusy) return;
    const fieldsForAi = normalizedFields.map((field) => ({
      name: field.label,
      label: field.label,
      type: field.multiline ? ("textarea" as const) : ("text" as const),
    }));
    setSmartBusy(true);
    try {
      const result = await generateSmartFill({
        data: {
          recordType: "electronic-template",
          recordTitle: title,
          brief,
          schoolName: school?.school_name ?? "",
          fields: fieldsForAi,
          values,
        },
      });
      const suggestions = result?.suggestions ?? {};
      const usable = Object.fromEntries(
        Object.entries(suggestions).filter(([name, text]) => !values[name]?.trim() && text.trim()),
      );
      setValues((current) => ({ ...current, ...usable }));
      toast.success(
        Object.keys(usable).length
          ? `تمت تعبئة ${Object.keys(usable).length} حقول — راجعها يدويًا قبل الحفظ.`
          : "لم تتوفر معلومات كافية للتعبئة.",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذّرت التعبئة الذكية");
    } finally {
      setSmartBusy(false);
    }
  }

  async function saveDocument() {
    if (saveBusy) return;
    const hasContent = normalizedFields.some((field) => values[field.label]?.trim());
    if (!hasContent) {
      toast.error("عبّئ حقلًا واحدًا على الأقل قبل الحفظ.");
      return;
    }

    setSaveBusy(true);
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!auth.user) throw new Error("انتهت جلسة الدخول. سجّل الدخول ثم حاول مرة أخرى.");

      const content = normalizedFields
        .map((field) => `${field.label}: ${values[field.label]?.trim() || "—"}`)
        .join("\n\n");

      const payload = {
        user_id: auth.user.id,
        title,
        content,
        status: "نهائي",
        document_kind: "electronic-template",
        template_id: templateId ?? null,
        student_id: selectedStudent?.id ?? null,
        student_name: selectedStudent?.full_name ?? null,
        student_no: selectedStudent?.student_no ?? null,
        grade: selectedStudent?.grade ?? null,
        classroom: selectedStudent?.classroom ?? null,
        form_values: values,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await (supabase as any)
        .from("free_documents")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw error;

      setSavedId(String(data.id));
      await queryClient.invalidateQueries({ queryKey: ["free-documents"] });
      if (selectedStudent) {
        await queryClient.invalidateQueries({
          queryKey: [
            "student-profile",
            selectedStudent.id,
            selectedStudent.full_name,
            selectedStudent.student_no,
          ],
        });
      }
      toast.success(
        selectedStudent
          ? "تم حفظ المستند وربطه بملف الطالب. ستجده في المستندات المحفوظة وملف الطالب."
          : "تم حفظ المستند في المستندات المحفوظة.",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذّر حفظ المستند.");
    } finally {
      setSaveBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        dir="rtl"
        className="electronic-template-dialog max-h-[94vh] max-w-5xl overflow-y-auto p-0"
      >
        <DialogHeader className="border-b bg-card px-5 py-4 sm:px-6">
          <DialogTitle className="text-lg font-black">{title}</DialogTitle>
          <p className="text-xs leading-6 text-muted-foreground">
            {description} — اختر الطالب أولًا ليتم ربط بياناته بالمستند تلقائيًا، ثم راجع الحقول قبل الحفظ.
          </p>
        </DialogHeader>

        <div className="grid gap-5 bg-muted/20 p-4 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-4 rounded-2xl border bg-card p-5 shadow-sm">
            <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
              <Label className="mb-2 block font-black">ربط المستند بالطالب</Label>
              <StudentCombobox
                value={selectedStudent?.full_name ?? ""}
                onSelect={selectStudent}
                onType={() => toast.info("اختر الطالب من كشف الطلاب لضمان الربط التلقائي بملفه.")}
                onClear={clearStudent}
              />
              {selectedStudent && (
                <div className="mt-3 grid gap-2 rounded-xl bg-background/70 p-3 text-xs sm:grid-cols-2">
                  <p><span className="text-muted-foreground">رقم الطالب:</span> <b>{selectedStudent.student_no || "—"}</b></p>
                  <p><span className="text-muted-foreground">الصف:</span> <b>{selectedStudent.grade || "—"} {selectedStudent.classroom || ""}</b></p>
                  <p><span className="text-muted-foreground">ولي الأمر:</span> <b>{selectedStudent.guardian_name || "—"}</b></p>
                  <p><span className="text-muted-foreground">الجوال:</span> <b>{selectedStudent.guardian_phone || "—"}</b></p>
                </div>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {normalizedFields.map((field) => (
                <div
                  key={field.label}
                  className={field.multiline ? "space-y-2 sm:col-span-2" : "space-y-2"}
                >
                  <Label>{field.label}</Label>
                  {field.multiline ? (
                    <Textarea
                      rows={4}
                      value={values[field.label] ?? ""}
                      placeholder={field.placeholder}
                      onChange={(event) => setValue(field.label, event.target.value)}
                    />
                  ) : (
                    <Input
                      value={values[field.label] ?? ""}
                      placeholder={field.placeholder}
                      onChange={(event) => setValue(field.label, event.target.value)}
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-primary/15 bg-primary/5 p-3 text-xs leading-6 text-muted-foreground">
              عند الحفظ يُنشأ مستند دائم في أرشيف المستندات، وإذا اخترت طالبًا فسيظهر المستند تلقائيًا داخل ملفه أيضًا.
              {category ? ` التصنيف: ${category}.` : ""}
            </div>
          </div>

          <aside className="space-y-3 rounded-2xl border bg-card p-4">
            <p className="text-sm font-black">إجراءات النموذج</p>
            <div className="space-y-2 rounded-xl border border-primary/15 bg-primary/5 p-3">
              <p className="flex items-center gap-2 text-xs font-black text-primary">
                <Sparkles className="size-3.5" /> التعبئة بالذكاء الاصطناعي
              </p>
              <Textarea
                rows={3}
                value={smartPrompt}
                onChange={(event) => setSmartPrompt(event.target.value)}
                placeholder="اكتب ملخصًا عن الموضوع ليقترح DeepSeek الحقول المناسبة"
                disabled={smartBusy}
              />
              <Button
                className="w-full gap-2"
                variant="secondary"
                onClick={() => void fillWithAi()}
                disabled={smartBusy || smartPrompt.trim().length < 5}
              >
                {smartBusy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                {smartBusy ? "جارٍ التعبئة..." : "تعبئة الحقول"}
              </Button>
              <p className="text-[10px] leading-5 text-muted-foreground">
                بيانات الطالب تأتي من كشف الطلاب ولا يلزم إدخالها في وصف الذكاء الاصطناعي.
              </p>
            </div>

            <Button className="w-full gap-2" onClick={() => void saveDocument()} disabled={saveBusy}>
              {saveBusy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              {saveBusy ? "جارٍ الحفظ..." : "حفظ واعتماد"}
            </Button>

            {savedId && (
              <Button asChild variant="outline" className="w-full gap-2">
                <Link to="/free-documents">
                  <FileArchive className="size-4" /> فتح المستندات المحفوظة
                </Link>
              </Button>
            )}

            <Button variant="ghost" className="w-full gap-2" onClick={() => onOpenChange(false)}>
              <X className="size-4" /> إغلاق
            </Button>
          </aside>
        </div>

        <DialogFooter className="border-t px-5 py-4 sm:px-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>إغلاق</Button>
          <Button onClick={() => void saveDocument()} disabled={saveBusy}>
            <Save className="size-4" /> حفظ واعتماد
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
