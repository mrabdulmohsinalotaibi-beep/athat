import { useMemo, useRef, useState } from "react";
import {
  CheckSquare,
  Copy,
  Download,
  FileDown,
  FileText,
  Link2,
  Loader2,
  MessageSquareText,
  Printer,
  Square,
  Sparkles,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { aiErrorMessage, requestAi } from "@/lib/ai";
import { useSchool } from "@/lib/school";
import { elementToPdf } from "@/lib/pdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OfficialFooter, OfficialHeader } from "@/components/OfficialHeader";

interface FeedbackMessage {
  id: string;
  sender_name: string;
  sender_contact: string | null;
  category: string;
  message: string;
  status: string;
  ai_summary: string | null;
  ai_category: string | null;
  created_at: string;
}

export default function MessagesDashboard() {
  const { data: school } = useSchool();
  const queryClient = useQueryClient();
  const printRef = useRef<HTMLDivElement>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["feedback_messages"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("feedback_messages")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as FeedbackMessage[];
    },
  });

  const publicLink =
    typeof window === "undefined" || !school?.public_feedback_token
      ? ""
      : `${window.location.origin}/feedback/${school.public_feedback_token}`;
  const filtered = useMemo(
    () =>
      messages.filter((item) =>
        `${item.sender_name} ${item.category} ${item.message}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [messages, search],
  );
  const selected = filtered.filter((item) => selectedIds.includes(item.id));

  function toggle(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  }

  async function assist(item: FeedbackMessage) {
    setBusyId(item.id);
    try {
      const data = await requestAi("feedback", { message: item.message, category: item.category });
      await (supabase as any)
        .from("feedback_messages")
        .update({ ai_summary: data?.summary ?? null, ai_category: data?.category ?? null })
        .eq("id", item.id);
      await queryClient.invalidateQueries({ queryKey: ["feedback_messages"] });
      toast.success("تم تلخيص الرسالة وتصنيفها.");
    } catch (error) {
      toast.error(aiErrorMessage(error));
    } finally {
      setBusyId(null);
    }
  }

  function copyLink() {
    if (!publicLink) return;
    navigator.clipboard.writeText(publicLink);
    toast.success("تم نسخ رابط النموذج");
  }
  function shareLink() {
    if (!publicLink) return;
    window.open(
      `https://wa.me/?text=${encodeURIComponent(`نرحب بمشاركتك عبر نموذج الآراء والرسائل: ${publicLink}`)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  function exportCsv() {
    const rows = filtered.map((item) => [
      item.sender_name,
      item.sender_contact ?? "",
      item.category,
      item.message,
      item.status,
      new Date(item.created_at).toLocaleString("ar-SA"),
    ]);
    const csv = [
      "الاسم,التواصل,التصنيف,الرسالة,الحالة,التاريخ",
      ...rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")),
    ].join("\n");
    const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "الآراء_والرسائل.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function exportPdf() {
    if (!printRef.current) return;
    await elementToPdf(printRef.current, "تقرير الآراء والرسائل");
  }

  return (
    <div className="space-y-6" dir="rtl">
      <section className="rounded-[2rem] bg-gradient-to-br from-primary via-primary/95 to-[oklch(0.29_0.09_25)] p-6 text-primary-foreground shadow-xl shadow-primary/15">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <div className="flex items-center gap-2 text-amber-200">
              <MessageSquareText className="size-5" />
              <span className="text-xs font-bold">التواصل مع المستفيدين</span>
            </div>
            <h1 className="mt-2 text-2xl font-black">الآراء والرسائل</h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-primary-foreground/75">
              أنشئ رابطًا عامًا لاستقبال المشاركات، ثم استعرضها وحللها واحفظها بصيغة PDF.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={copyLink} disabled={!publicLink}>
              <Copy className="size-4" /> نسخ الرابط
            </Button>
            <Button variant="secondary" onClick={shareLink} disabled={!publicLink}>
              <Link2 className="size-4" /> مشاركة
            </Button>
          </div>
        </div>
        {publicLink && (
          <div className="mt-5 flex items-center gap-2 rounded-xl bg-black/15 p-3 text-xs">
            <span className="truncate font-mono">{publicLink}</span>
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-primary/12 bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-black">الردود الواردة</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              حدد الردود للطباعة أو استخدم المساعدة الذكية للتلخيص والتصنيف.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={exportCsv}>
              <Download className="size-4" /> CSV
            </Button>
            <Button variant="outline" onClick={exportPdf} disabled={!selected.length}>
              <FileDown className="size-4" /> حفظ PDF
            </Button>
            <Button variant="outline" onClick={() => window.print()} disabled={!selected.length}>
              <Printer className="size-4" /> طباعة PDF
            </Button>
          </div>
        </div>
        <div className="mt-4">
          <Label htmlFor="feedback-search">بحث</Label>
          <Input
            id="feedback-search"
            className="mt-1"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث بالاسم أو التصنيف أو نص الرسالة"
          />
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-primary/12 bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-right text-sm">
            <thead className="bg-muted/50 text-xs">
              <tr>
                <th className="p-4">تحديد</th>
                <th className="p-4">المرسل</th>
                <th className="p-4">التصنيف</th>
                <th className="p-4">الرسالة</th>
                <th className="p-4">التاريخ</th>
                <th className="p-4">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-muted-foreground">
                    جارٍ تحميل الردود...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-muted-foreground">
                    لا توجد ردود مطابقة حتى الآن.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="border-t border-border/60 align-top">
                    <td className="p-4">
                      <button aria-label="تحديد الرد" onClick={() => toggle(item.id)}>
                        {selectedIds.includes(item.id) ? (
                          <CheckSquare className="text-primary" />
                        ) : (
                          <Square className="text-muted-foreground" />
                        )}
                      </button>
                    </td>
                    <td className="p-4 font-bold">
                      {item.sender_name}
                      <span className="block text-xs font-normal text-muted-foreground">
                        {item.sender_contact}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-foreground">
                        {item.ai_category || item.category}
                      </span>
                    </td>
                    <td className="max-w-md p-4 leading-7">
                      {item.message}
                      {item.ai_summary && (
                        <p className="mt-2 rounded-lg bg-muted/50 p-2 text-xs text-muted-foreground">
                          ملخص: {item.ai_summary}
                        </p>
                      )}
                    </td>
                    <td className="p-4 text-xs text-muted-foreground">
                      {new Date(item.created_at).toLocaleDateString("ar-SA")}
                    </td>
                    <td className="p-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => assist(item)}
                        disabled={busyId === item.id}
                      >
                        <Sparkles className="size-4" />
                        {busyId === item.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          "مساعدة ذكية"
                        )}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div
        ref={printRef}
        className="print-area hidden bg-paper p-6 text-paper-foreground print:block"
      >
        <OfficialHeader
          school={school}
          title="تقرير الآراء والرسائل"
          reportType="تواصل المستفيدين"
        />
        <div className="mt-5 space-y-4">
          {selected.map((item) => (
            <article
              key={item.id}
              className="break-inside-avoid rounded-xl border border-paper-border p-4"
            >
              <div className="flex justify-between border-b border-paper-border pb-2 text-xs font-bold">
                <span>{item.sender_name}</span>
                <span>{new Date(item.created_at).toLocaleDateString("ar-SA")}</span>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-8">{item.message}</p>
              {item.ai_summary && (
                <p className="mt-3 border-t border-paper-border pt-2 text-xs">
                  الملخص: {item.ai_summary}
                </p>
              )}
            </article>
          ))}
        </div>
        <OfficialFooter school={school} />
      </div>
    </div>
  );
}
