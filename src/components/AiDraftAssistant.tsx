import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { draftGuidanceReport, type GuidanceDraft } from "@/lib/ai.functions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function AiDraftAssistant({
  recordKey,
  context,
  onDraft,
}: {
  recordKey: "cases" | "interviews" | "behavior" | "reports";
  context: Record<string, string>;
  onDraft: (draft: GuidanceDraft) => void;
}) {
  const draftReport = useServerFn(draftGuidanceReport);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  async function generate() {
    if (notes.trim().length < 3) {
      toast.error("اكتب ملاحظات سريعة أو كلمات مفتاحية أولاً.");
      return;
    }
    setBusy(true);
    try {
      const draft = await draftReport({ data: { recordKey, notes: notes.trim(), context } });
      onDraft(draft);
      toast.success("تم إعداد المسودة. راجعها وعدّلها قبل الحفظ.");
    } catch (error) {
      toast.error((error as Error).message || "تعذّر توليد المسودة الذكية.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="ai-assistant-panel sm:col-span-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Label htmlFor="ai-quick-notes" className="flex items-center gap-2 font-bold">
            <Sparkles className="size-4 text-primary" /> المساعد الذكي
          </Label>
          <p className="mt-1 text-xs text-muted-foreground">اكتب كلمات مفتاحية فقط؛ لن تُحفظ هذه الملاحظات تلقائياً.</p>
        </div>
        <Button type="button" size="sm" onClick={generate} disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          {busy ? "جارٍ الصياغة..." : "إكمال التقرير بالذكاء الاصطناعي"}
        </Button>
      </div>
      <Textarea
        id="ai-quick-notes"
        className="mt-3 bg-background/80"
        rows={3}
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        placeholder="مثال: تكرار الغياب، تواصل مع ولي الأمر، تحسن ملحوظ، متابعة بعد أسبوع..."
      />
    </section>
  );
}