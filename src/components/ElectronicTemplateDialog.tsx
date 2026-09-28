import { useMemo, useState } from "react";
import { Loader2, Sparkles, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { useSchool } from "@/lib/school";
import { generateSmartFill } from "@/lib/deepseek.functions";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";


type TemplateField = { label: string; multiline?: boolean; placeholder?: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  fields: TemplateField[];
};

export function ElectronicTemplateDialog({
  open,
  onOpenChange,
  title,
  description,
  fields,
}: Props) {

  const { data: school } = useSchool();
  const [values, setValues] = useState<Record<string, string>>({});

  const [smartBusy, setSmartBusy] = useState(false);
  const [smartPrompt, setSmartPrompt] = useState("");
  const normalizedFields = useMemo(
    () => (fields.length ? fields : [{ label: "الملاحظات", multiline: true }]),
    [fields],
  );

  function setValue(label: string, value: string) {
    setValues((current) => ({ ...current, [label]: value }));
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
      const suggestions = result.suggestions ?? {};
      const usable = Object.fromEntries(
        Object.entries(suggestions).filter(([name, text]) => !values[name]?.trim() && text.trim()),
      );
      setValues((current) => ({ ...current, ...usable }));
      toast.success(
        Object.keys(usable).length
          ? `تمت تعبئة ${Object.keys(usable).length} حقول — راجعها يدويًا قبل اعتماد النموذج.`
          : "لم تتوفر معلومات كافية للتعبئة.",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذّرت التعبئة الذكية");
    } finally {
      setSmartBusy(false);
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
            {description} — املأ الحقول وراجعها قبل اعتماد النموذج.
          </p>
        </DialogHeader>
        <div className="grid gap-5 bg-muted/20 p-4 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-4 rounded-2xl border bg-card p-5 shadow-sm">
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
              هذا نموذج إلكتروني داخل المنصة؛ يمكنك مراجعته وتعديله قبل الحفظ. للحفظ الدائم اربطه
              بالسجل المناسب من لوحة العمل.
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
                {smartBusy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}
                {smartBusy ? "جارٍ التعبئة..." : "تعبئة الحقول"}
              </Button>
              <p className="text-[10px] leading-5 text-muted-foreground">
                يمكنك تعديل كل نتيجة يدويًا. لا تكتب اسم الطالب أو رقم هويته أو جواله.
              </p>
            </div>
            <Button variant="ghost" className="w-full gap-2" onClick={() => onOpenChange(false)}>
              <X className="size-4" /> إغلاق
            </Button>
          </aside>
        </div>
        <DialogFooter className="border-t px-5 py-4 sm:px-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إغلاق
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
