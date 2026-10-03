import { useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  Check,
  CheckSquare,
  FileCheck2,
  Loader2,
  MessageCircle,
  Search,
  Send,
  Sparkles,
  Square,
  Trash2,
  Users,
  WandSparkles,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/lib/school";
import { generateSmartFill } from "@/lib/deepseek.functions";
import { normalizeSaudiPhone, whatsappLink } from "@/lib/whatsapp";
import { formatHijriDateTime } from "@/lib/date";
import { useStudentOptions } from "@/components/StudentCombobox";
import { OfficialFooter, OfficialHeader } from "@/components/OfficialHeader";
import { PdfPreviewButton } from "@/components/PdfPreviewButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/outgoing-messages")({
  head: () => ({
    meta: [
      { title: "الرسائل الصادرة | الذات" },
      {
        name: "description",
        content: "إنشاء رسائل لأولياء الأمور بالذكاء الاصطناعي وإرسالها وحفظ سجلها الرسمي.",
      },
    ],
  }),
  component: OutgoingMessagesPage,
});

type OutgoingMessage = {
  id: string;
  batch_id: string;
  recipient_source: "student" | "manual";
  student_id: string | null;
  student_name: string | null;
  recipient_name: string | null;
  phone: string;
  channel: "whatsapp";
  message: string;
  status: "prepared" | "opened" | "sent" | "archived";
  ai_assisted: boolean;
  opened_at: string | null;
  sent_at: string | null;
  created_at: string;
};

type Recipient = {
  key: string;
  source: "student" | "manual";
  studentId: string | null;
  studentName: string;
  recipientName: string;
  phone: string;
};

const STATUS_LABEL: Record<OutgoingMessage["status"], string> = {
  prepared: "جاهزة للإرسال",
  opened: "تم فتح واتساب",
  sent: "تم تأكيد الإرسال",
  archived: "مؤرشفة",
};

function personalizeMessage(
  source: string,
  recipient: Recipient,
  schoolName: string,
) {
  return source
    .replaceAll("{الطالب}", recipient.studentName || "الطالب")
    .replaceAll("{ولي الأمر}", recipient.recipientName || "ولي الأمر")
    .replaceAll("{المدرسة}", schoolName || "المدرسة");
}

function OutgoingMessagesPage() {
  const queryClient = useQueryClient();
  const { data: school } = useSchool();
  const { data: students = [], isLoading: studentsLoading } = useStudentOptions();

  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [brief, setBrief] = useState("");
  const [message, setMessage] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiAssisted, setAiAssisted] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [historyStatus, setHistoryStatus] = useState<"all" | OutgoingMessage["status"]>("all");
  const [lastBatchId, setLastBatchId] = useState<string | null>(null);
  const [selectedProofIds, setSelectedProofIds] = useState<string[]>([]);
  const [proofRows, setProofRows] = useState<OutgoingMessage[]>([]);
  const proofRef = useRef<HTMLDivElement>(null);

  const { data: rows = [], isLoading: historyLoading } = useQuery({
    queryKey: ["outgoing-messages"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("outgoing_messages")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as OutgoingMessage[];
    },
  });

  const visibleStudents = useMemo(() => {
    const q = studentSearch.trim().toLocaleLowerCase("ar");
    const filtered = q
      ? students.filter((student) =>
          [
            student.full_name,
            student.student_no,
            student.grade,
            student.classroom,
            student.guardian_name,
            student.guardian_phone,
          ]
            .join(" ")
            .toLocaleLowerCase("ar")
            .includes(q),
        )
      : students;
    return filtered.slice(0, 100);
  }, [students, studentSearch]);

  const recipients = useMemo<Recipient[]>(() => {
    const studentRecipients = students
      .filter((student) => selectedStudentIds.includes(student.id))
      .map((student) => ({
        key: `student:${student.id}`,
        source: "student" as const,
        studentId: student.id,
        studentName: student.full_name,
        recipientName: student.guardian_name || "ولي الأمر",
        phone: normalizeSaudiPhone(student.guardian_phone),
      }));

    const normalizedManual = normalizeSaudiPhone(manualPhone);
    const manualRecipient = normalizedManual
      ? [
          {
            key: `manual:${normalizedManual}`,
            source: "manual" as const,
            studentId: null,
            studentName: "",
            recipientName: manualName.trim() || "مستفيد",
            phone: normalizedManual,
          },
        ]
      : [];

    const unique = new Map<string, Recipient>();
    [...studentRecipients, ...manualRecipient].forEach((recipient) => {
      if (!recipient.phone) return;
      const existing = unique.get(recipient.phone);
      if (!existing || (existing.source === "manual" && recipient.source === "student")) {
        unique.set(recipient.phone, recipient);
      }
    });
    return Array.from(unique.values());
  }, [students, selectedStudentIds, manualName, manualPhone]);

  const recipientsWithoutPhone = useMemo(
    () =>
      students.filter(
        (student) =>
          selectedStudentIds.includes(student.id) &&
          !normalizeSaudiPhone(student.guardian_phone),
      ),
    [students, selectedStudentIds],
  );

  const history = useMemo(() => {
    const q = historySearch.trim().toLocaleLowerCase("ar");
    return rows.filter((row) => {
      const matchesStatus = historyStatus === "all" || row.status === historyStatus;
      const matchesText =
        !q ||
        [
          row.student_name ?? "",
          row.recipient_name ?? "",
          row.phone,
          row.message,
        ]
          .join(" ")
          .toLocaleLowerCase("ar")
          .includes(q);
      return matchesStatus && matchesText;
    });
  }, [rows, historySearch, historyStatus]);

  const currentBatch = lastBatchId
    ? rows.filter((row) => row.batch_id === lastBatchId)
    : [];

  function toggleStudent(id: string) {
    setSelectedStudentIds((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  }

  async function draftWithAi() {
    if (brief.trim().length < 2) {
      toast.error("اكتب فكرة الرسالة أو سبب التواصل أولًا.");
      return;
    }

    setAiBusy(true);
    try {
      const result = await generateSmartFill({
        data: {
          recordType: "outgoing-message",
          recordTitle: "رسالة لولي أمر",
          brief: [
            "صغ رسالة واتساب رسمية ومختصرة ومهنية لولي أمر طالب.",
            "لا تضف أي واقعة أو معلومة غير موجودة.",
            "يمكن استخدام الرموز {الطالب} و{ولي الأمر} و{المدرسة} ليتم استبدالها محلياً عند الإرسال.",
            `الموضوع الذي كتبه المستخدم: ${brief.trim()}`,
          ].join("\n"),
          fields: [
            {
              name: "message",
              label: "نص الرسالة لولي الأمر",
              type: "textarea",
            },
          ],
          values: {},
          schoolName: school?.school_name ?? "",
        },
      });

      const drafted = result?.suggestions?.["message"]?.trim();
      if (!drafted) {
        toast.info("لم ينتج الذكاء الاصطناعي نصًا. جرّب وصف الموضوع بشكل أوضح.");
        return;
      }

      setMessage(drafted);
      setAiAssisted(true);
      toast.success("تمت صياغة الرسالة. راجع النص وعدّله قبل الإرسال.");
    } catch (error) {
      toast.error((error as Error).message || "تعذّرت صياغة الرسالة.");
    } finally {
      setAiBusy(false);
    }
  }

  async function improveWithAi() {
    if (message.trim().length < 2) {
      toast.error("اكتب نص الرسالة أولًا.");
      return;
    }

    setAiBusy(true);
    try {
      const result = await generateSmartFill({
        data: {
          recordType: "outgoing-message",
          recordTitle: "رسالة لولي أمر",
          brief: message.trim(),
          mode: "rewrite",
          targetField: "message",
          fields: [
            {
              name: "message",
              label: "نص الرسالة لولي الأمر",
              type: "textarea",
            },
          ],
          values: { message: message.trim() },
          schoolName: school?.school_name ?? "",
        },
      });

      const rewritten = result?.suggestions?.["message"]?.trim();
      if (!rewritten) {
        toast.info("لم تتوفر صياغة بديلة.");
        return;
      }

      setMessage(rewritten);
      setAiAssisted(true);
      toast.success("تم تحسين الصياغة. راجع النص قبل الإرسال.");
    } catch (error) {
      toast.error((error as Error).message || "تعذّر تحسين الصياغة.");
    } finally {
      setAiBusy(false);
    }
  }

  async function prepareMessages() {
    if (!message.trim()) {
      toast.error("اكتب نص الرسالة أولًا.");
      return;
    }
    if (!recipients.length) {
      toast.error("اختر طالبًا واحدًا على الأقل أو أضف رقمًا يدويًا.");
      return;
    }
    if (recipientsWithoutPhone.length) {
      toast.error(
        `يوجد ${recipientsWithoutPhone.length} طالبًا بدون رقم ولي أمر. أضف الرقم في سجل الطالب أو ألغِ تحديده.`,
      );
      return;
    }

    setPreparing(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData.user) throw new Error("انتهت جلسة الدخول.");

      const batchId = crypto.randomUUID();
      const duplicateCount =
        selectedStudentIds.filter((id) => {
          const student = students.find((item) => item.id === id);
          const phone = normalizeSaudiPhone(student?.guardian_phone);
          return Boolean(phone) && recipients.filter((recipient) => recipient.phone === phone).length === 1;
        }).length - recipients.filter((recipient) => recipient.source === "student").length;
      if (duplicateCount > 0) {
        toast.info(`تم دمج ${duplicateCount} مستلم مكرر له نفس رقم الجوال لتجنب إرسال الرسالة مرتين.`);
      }

      const payload = recipients.map((recipient) => ({
        user_id: authData.user!.id,
        batch_id: batchId,
        recipient_source: recipient.source,
        student_id: recipient.studentId,
        student_name: recipient.studentName || null,
        recipient_name: recipient.recipientName || null,
        phone: recipient.phone,
        channel: "whatsapp",
        message: personalizeMessage(
          message.trim(),
          recipient,
          school?.school_name ?? "",
        ),
        status: "prepared",
        ai_assisted: aiAssisted,
      }));

      const { data, error } = await (supabase as any)
        .from("outgoing_messages")
        .insert(payload)
        .select("*");
      if (error) throw error;

      setLastBatchId(batchId);
      await queryClient.invalidateQueries({ queryKey: ["outgoing-messages"] });

      const inserted = (data ?? []) as OutgoingMessage[];
      toast.success(
        inserted.length === 1
          ? "تم حفظ الرسالة وتجهيزها للإرسال."
          : `تم تجهيز ${inserted.length} رسائل. أرسلها من قائمة الإرسال أدناه.`,
      );

      if (inserted.length === 1) {
        openWhatsApp(inserted[0]!);
      }
    } catch (error) {
      toast.error((error as Error).message || "تعذّر تجهيز الرسائل.");
    } finally {
      setPreparing(false);
    }
  }

  function openWhatsApp(row: OutgoingMessage) {
    if (typeof window === "undefined") return;
    window.open(whatsappLink(row.phone, row.message), "_blank", "noopener,noreferrer");

    void (async () => {
      const { error } = await (supabase as any)
        .from("outgoing_messages")
        .update({
          status: row.status === "sent" ? "sent" : "opened",
          opened_at: row.opened_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);
      if (error) {
        toast.error(`تعذّر تحديث سجل الإرسال: ${error.message}`);
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["outgoing-messages"] });
    })();
  }

  async function confirmSent(row: OutgoingMessage) {
    const { error } = await (supabase as any)
      .from("outgoing_messages")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);
    if (error) {
      toast.error(`تعذّر تأكيد الإرسال: ${error.message}`);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["outgoing-messages"] });
    toast.success("تم تسجيل تأكيد الإرسال.");
  }

  async function archiveMessage(row: OutgoingMessage) {
    const { error } = await (supabase as any)
      .from("outgoing_messages")
      .update({
        status: "archived",
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);
    if (error) {
      toast.error(`تعذّرت الأرشفة: ${error.message}`);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["outgoing-messages"] });
  }

  function removeDeletedFromLocalState(ids: string[]) {
    const deleted = new Set(ids);
    setSelectedProofIds((current) => current.filter((id) => !deleted.has(id)));
    setProofRows((current) => current.filter((row) => !deleted.has(row.id)));
  }

  async function deleteMessage(row: OutgoingMessage) {
    const recipient = row.student_name || row.recipient_name || "المستلم";
    if (
      typeof window !== "undefined" &&
      !window.confirm(
        `هل تريد حذف رسالة «${recipient}» نهائيًا من سجل الرسائل الصادرة؟\n\nلا يمكن التراجع عن الحذف.`,
      )
    ) {
      return;
    }

    setDeleting(true);
    try {
      const { error } = await (supabase as any)
        .from("outgoing_messages")
        .delete()
        .eq("id", row.id);
      if (error) throw error;

      removeDeletedFromLocalState([row.id]);
      await queryClient.invalidateQueries({ queryKey: ["outgoing-messages"] });
      toast.success("تم حذف الرسالة من السجل.");
    } catch (error) {
      toast.error(
        `تعذّر حذف الرسالة: ${
          error instanceof Error ? error.message : "خطأ غير معروف"
        }`,
      );
    } finally {
      setDeleting(false);
    }
  }

  async function deleteSelectedMessages() {
    const ids = selectedProofIds.filter((id) => rows.some((row) => row.id === id));
    if (!ids.length) {
      toast.info("حدد رسالة واحدة على الأقل للحذف.");
      return;
    }

    if (
      typeof window !== "undefined" &&
      !window.confirm(
        `هل تريد حذف ${ids.length} رسالة محددة نهائيًا من سجل الرسائل الصادرة؟\n\nلا يمكن التراجع عن الحذف.`,
      )
    ) {
      return;
    }

    setDeleting(true);
    try {
      const { error } = await (supabase as any)
        .from("outgoing_messages")
        .delete()
        .in("id", ids);
      if (error) throw error;

      removeDeletedFromLocalState(ids);
      await queryClient.invalidateQueries({ queryKey: ["outgoing-messages"] });
      toast.success(
        ids.length === 1
          ? "تم حذف الرسالة المحددة."
          : `تم حذف ${ids.length} رسائل محددة.`,
      );
    } catch (error) {
      toast.error(
        `تعذّر حذف الرسائل المحددة: ${
          error instanceof Error ? error.message : "خطأ غير معروف"
        }`,
      );
    } finally {
      setDeleting(false);
    }
  }

  function toggleProof(id: string) {
    setSelectedProofIds((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  }

  function openProof(items: OutgoingMessage[]) {
    if (!items.length) {
      toast.info("حدد رسالة واحدة على الأقل.");
      return;
    }
    setProofRows(items);
    window.setTimeout(
      () => proofRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
      50,
    );
  }

  return (
    <div dir="rtl" className="mx-auto max-w-7xl space-y-5">
      <section className="rounded-3xl border border-primary/15 bg-card p-5 shadow-[var(--shadow-soft)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-primary">
              <Send className="size-5" />
              <span className="text-xs font-black">مركز الرسائل الصادرة</span>
            </div>
            <h1 className="mt-2 text-2xl font-black">إنشاء وإرسال رسالة</h1>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
              اختر طالبًا واحدًا أو عدة طلاب، أو أضف رقمًا يدويًا، ثم اكتب الرسالة بنفسك أو استخدم الذكاء الاصطناعي لصياغتها قبل إرسالها عبر واتساب.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/messages">
              <MessageCircle className="size-4" />
              الآراء والرسائل
            </Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,.8fr)]">
        <div className="space-y-4 rounded-3xl border bg-card p-4 shadow-[var(--shadow-card)] sm:p-5">
          <div>
            <div className="flex items-center gap-2">
              <Users className="size-4 text-primary" />
              <h2 className="font-black">المستلمون</h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              يمكن اختيار أكثر من طالب. تستخدم الرسالة رقم جوال ولي الأمر المحفوظ في سجل الطالب.
            </p>
          </div>

          <div className="relative">
            <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={studentSearch}
              onChange={(event) => setStudentSearch(event.target.value)}
              placeholder="ابحث باسم الطالب أو الصف أو الفصل أو ولي الأمر..."
              className="pr-9"
            />
          </div>

          <div className="max-h-72 overflow-y-auto rounded-2xl border">
            {studentsLoading ? (
              <p className="p-5 text-center text-xs text-muted-foreground">جارٍ تحميل الطلاب...</p>
            ) : visibleStudents.length ? (
              <div className="divide-y">
                {visibleStudents.map((student) => {
                  const selected = selectedStudentIds.includes(student.id);
                  const phone = normalizeSaudiPhone(student.guardian_phone);
                  return (
                    <button
                      key={student.id}
                      type="button"
                      onClick={() => toggleStudent(student.id)}
                      className="grid w-full grid-cols-[auto_1fr] items-start gap-3 p-3 text-right hover:bg-muted/35"
                    >
                      {selected ? (
                        <CheckSquare className="mt-0.5 size-4 text-primary" />
                      ) : (
                        <Square className="mt-0.5 size-4 text-muted-foreground" />
                      )}
                      <span className="min-w-0">
                        <strong className="block truncate text-sm">{student.full_name}</strong>
                        <span className="mt-1 block text-[11px] text-muted-foreground">
                          {[student.grade, student.classroom && `فصل ${student.classroom}`, student.guardian_name]
                            .filter(Boolean)
                            .join(" · ") || "—"}
                        </span>
                        <span className={`mt-1 block text-[10px] ${phone ? "text-primary" : "text-destructive"}`}>
                          {phone ? `جوال ولي الأمر: ${student.guardian_phone}` : "لا يوجد جوال ولي أمر صالح"}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="p-5 text-center text-xs text-muted-foreground">لا توجد نتائج.</p>
            )}
          </div>

          <div className="rounded-2xl border border-dashed p-4">
            <p className="mb-3 text-xs font-black">إضافة رقم من عندي</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="manual-recipient-name">اسم المستلم (اختياري)</Label>
                <Input
                  id="manual-recipient-name"
                  className="mt-1"
                  value={manualName}
                  onChange={(event) => setManualName(event.target.value)}
                  placeholder="مثال: ولي أمر محمد"
                />
              </div>
              <div>
                <Label htmlFor="manual-recipient-phone">رقم الجوال</Label>
                <Input
                  id="manual-recipient-phone"
                  dir="ltr"
                  inputMode="tel"
                  className="mt-1 text-left"
                  value={manualPhone}
                  onChange={(event) => setManualPhone(event.target.value)}
                  placeholder="05xxxxxxxx"
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-muted/35 px-3 py-2 text-xs">
            المستلمون الجاهزون: <strong>{recipients.length}</strong>
            {recipientsWithoutPhone.length > 0 && (
              <span className="mr-2 text-destructive">
                · {recipientsWithoutPhone.length} بدون رقم ولي أمر
              </span>
            )}
          </div>
        </div>

        <div className="space-y-4 rounded-3xl border bg-card p-4 shadow-[var(--shadow-card)] sm:p-5">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <h2 className="font-black">نص الرسالة والذكاء الاصطناعي</h2>
          </div>

          <div>
            <Label htmlFor="message-brief">اكتب باختصار ماذا تريد أن تقول</Label>
            <Textarea
              id="message-brief"
              value={brief}
              onChange={(event) => setBrief(event.target.value)}
              className="mt-1 min-h-24"
              placeholder="مثال: إشعار ولي الأمر بتكرار الغياب وطلب التواصل مع المدرسة دون لهجة لوم."
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => void draftWithAi()} disabled={aiBusy}>
              {aiBusy ? <Loader2 className="size-4 animate-spin" /> : <WandSparkles className="size-4" />}
              صياغة بالذكاء الاصطناعي
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void improveWithAi()}
              disabled={aiBusy || !message.trim()}
            >
              <Sparkles className="size-4" />
              تحسين الصياغة
            </Button>
          </div>

          <div>
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="outgoing-message-text">نص الرسالة النهائي</Label>
              <span className="text-[10px] text-muted-foreground">{message.length}/4000</span>
            </div>
            <Textarea
              id="outgoing-message-text"
              value={message}
              onChange={(event) => {
                setMessage(event.target.value.slice(0, 4000));
                setAiAssisted(false);
              }}
              className="mt-1 min-h-52"
              placeholder="اكتب الرسالة هنا أو دع الذكاء الاصطناعي يصيغها، ثم عدّلها كما تريد."
            />
            <p className="mt-2 text-[10px] leading-5 text-muted-foreground">
              يمكنك استخدام: <strong>{"{الطالب}"}</strong> و<strong>{"{ولي الأمر}"}</strong> و<strong>{"{المدرسة}"}</strong>، وسيتم استبدالها تلقائيًا لكل مستلم.
            </p>
          </div>

          <Button
            type="button"
            className="w-full"
            onClick={() => void prepareMessages()}
            disabled={preparing || !recipients.length || !message.trim()}
          >
            {preparing ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            {recipients.length > 1 ? `حفظ وتجهيز ${recipients.length} رسائل` : "حفظ وفتح واتساب"}
          </Button>

          <p className="text-[10px] leading-5 text-muted-foreground">
            لا تستطيع المنصة إثبات التسليم أو القراءة داخل واتساب تلقائيًا. بعد الإرسال يمكنك الضغط على «تأكيد تم الإرسال» ليظهر ذلك في السجل والمستند الرسمي.
          </p>
        </div>
      </section>

      {currentBatch.length > 1 && (
        <section className="rounded-3xl border border-primary/15 bg-primary/[0.03] p-4 shadow-[var(--shadow-card)]">
          <h2 className="font-black">قائمة الإرسال الحالية</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            تم حفظ المجموعة. افتح واتساب لكل مستلم ثم أكّد الإرسال بعد العودة.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {currentBatch.map((row) => (
              <div key={row.id} className="rounded-2xl border bg-card p-3">
                <p className="font-black">{row.student_name || row.recipient_name || "مستلم"}</p>
                <p dir="ltr" className="mt-1 text-left text-xs text-muted-foreground">{row.phone}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => openWhatsApp(row)}>
                    <MessageCircle className="size-4" />
                    فتح واتساب
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => void confirmSent(row)}>
                    <Check className="size-4" />
                    تأكيد تم الإرسال
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-3xl border bg-card p-4 shadow-[var(--shadow-card)] sm:p-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 className="text-lg font-black">سجل الرسائل الصادرة</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              صفحة مستقلة تحفظ الرسائل التي جهزتها وأرسلتها مع المستلم والنص والحالة والتاريخ.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={!selectedProofIds.length}
              onClick={() =>
                openProof(rows.filter((row) => selectedProofIds.includes(row.id)))
              }
            >
              <FileCheck2 className="size-4" />
              مستند المحدد ({selectedProofIds.length})
            </Button>
            <Button
              type="button"
              variant="outline"
              className="text-destructive hover:text-destructive"
              disabled={!selectedProofIds.length || deleting}
              onClick={() => void deleteSelectedMessages()}
            >
              {deleting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              حذف المحدد ({selectedProofIds.length})
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_220px]">
          <Input
            value={historySearch}
            onChange={(event) => setHistorySearch(event.target.value)}
            placeholder="بحث بالطالب أو ولي الأمر أو الرقم أو نص الرسالة..."
          />
          <select
            value={historyStatus}
            onChange={(event) =>
              setHistoryStatus(event.target.value as "all" | OutgoingMessage["status"])
            }
            className="h-10 rounded-md border bg-background px-3 text-sm"
          >
            <option value="all">كل الحالات</option>
            <option value="prepared">جاهزة للإرسال</option>
            <option value="opened">تم فتح واتساب</option>
            <option value="sent">تم تأكيد الإرسال</option>
            <option value="archived">مؤرشفة</option>
          </select>
        </div>

        <div className="mt-4 space-y-3">
          {historyLoading ? (
            <p className="py-8 text-center text-xs text-muted-foreground">جارٍ تحميل السجل...</p>
          ) : history.length ? (
            history.map((row) => (
              <article key={row.id} className="rounded-2xl border p-4">
                <div className="grid gap-3 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-start">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => toggleProof(row.id)}
                    aria-label="تحديد الرسالة"
                  >
                    {selectedProofIds.includes(row.id) ? (
                      <CheckSquare className="size-4 text-primary" />
                    ) : (
                      <Square className="size-4 text-muted-foreground" />
                    )}
                  </Button>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong>{row.student_name || row.recipient_name || "مستلم"}</strong>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-black">
                        {STATUS_LABEL[row.status]}
                      </span>
                      {row.ai_assisted && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-black text-primary">
                          صيغ بالذكاء الاصطناعي
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {row.recipient_name ? `المستلم: ${row.recipient_name} · ` : ""}
                      <span dir="ltr">{row.phone}</span> · {formatHijriDateTime(row.created_at)}
                    </p>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-7">{row.message}</p>
                  </div>

                  <div className="flex flex-wrap gap-2 md:max-w-44 md:justify-end">
                    <Button size="sm" onClick={() => openWhatsApp(row)}>
                      <MessageCircle className="size-4" />
                      واتساب
                    </Button>
                    {row.status !== "sent" && (
                      <Button size="sm" variant="outline" onClick={() => void confirmSent(row)}>
                        <Check className="size-4" />
                        تأكيد الإرسال
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => openProof([row])}>
                      <FileCheck2 className="size-4" />
                      مستند
                    </Button>
                    {row.status !== "archived" && (
                      <Button size="sm" variant="ghost" onClick={() => void archiveMessage(row)}>
                        <Archive className="size-4" />
                        أرشفة
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      disabled={deleting}
                      onClick={() => void deleteMessage(row)}
                      title="حذف الرسالة نهائيًا"
                      aria-label={`حذف رسالة ${row.student_name || row.recipient_name || "المستلم"}`}
                    >
                      <Trash2 className="size-4" />
                      حذف
                    </Button>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <p className="py-8 text-center text-xs text-muted-foreground">لا توجد رسائل مطابقة.</p>
          )}
        </div>
      </section>

      {proofRows.length > 0 && (
        <section className="rounded-3xl border bg-card p-4 shadow-[var(--shadow-card)]">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-black">مستند إثبات الرسائل الصادرة</h2>
              <p className="text-xs text-muted-foreground">
                يمكن طباعته لرسالة واحدة أو لمجموعة من الرسائل المحددة.
              </p>
            </div>
            <PdfPreviewButton
              elementRef={proofRef}
              filename={
                proofRows.length === 1
                  ? `إثبات-رسالة-${proofRows[0]!.id.slice(0, 8)}.pdf`
                  : `كشف-رسائل-${proofRows.length}.pdf`
              }
              title={proofRows.length === 1 ? "إثبات رسالة صادرة" : "كشف الرسائل الصادرة"}
            />
          </div>

          <div className="overflow-auto rounded-xl bg-muted/30 p-2 sm:p-4">
            <article
              ref={proofRef}
              dir="rtl"
              className="mx-auto flex min-h-[1123px] w-[794px] max-w-none flex-col bg-white text-[#24211f]"
            >
              <OfficialHeader
                school={school}
                title={proofRows.length === 1 ? "إثبات رسالة صادرة" : "كشف الرسائل الصادرة"}
                reportNo={
                  proofRows.length === 1
                    ? proofRows[0]!.id.slice(0, 8).toUpperCase()
                    : `OUT-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`
                }
              />
              <main className="flex-1 px-12 py-9 text-[13px] leading-7">
                <h1 className="mb-6 text-center text-xl font-black text-[#123d49]">
                  {proofRows.length === 1 ? "إثبات رسالة صادرة" : "كشف الرسائل الصادرة"}
                </h1>

                <div className="space-y-5">
                  {proofRows.map((row, index) => (
                    <section key={row.id} className="break-inside-avoid rounded-lg border border-[#ddd6cc]">
                      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-[#ddd6cc] bg-[#faf9f7] px-4 py-3">
                        <span className="grid size-7 place-items-center rounded-full bg-[#123d49] text-[11px] font-black text-white">
                          {index + 1}
                        </span>
                        <div>
                          <p className="font-black text-[#123d49]">
                            {row.student_name || row.recipient_name || "مستلم"}
                          </p>
                          <p className="text-[10px] text-[#6b625a]">
                            {row.recipient_name || "—"} · <span dir="ltr">{row.phone}</span>
                          </p>
                        </div>
                        <span className="text-[10px] text-[#6b625a]">
                          {formatHijriDateTime(row.sent_at || row.opened_at || row.created_at)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-x-6 gap-y-2 px-4 py-3 text-[11px]">
                        <p><strong>رقم السجل:</strong> {row.id.slice(0, 8).toUpperCase()}</p>
                        <p><strong>الحالة:</strong> {STATUS_LABEL[row.status]}</p>
                        <p><strong>قناة الإرسال:</strong> واتساب</p>
                        <p><strong>مصدر الرقم:</strong> {row.recipient_source === "student" ? "سجل الطالب" : "إدخال يدوي"}</p>
                      </div>

                      <div className="border-t border-[#ddd6cc] px-4 py-4">
                        <p className="mb-1 text-[11px] font-black text-[#123d49]">نص الرسالة</p>
                        <div className="whitespace-pre-wrap text-[12px] leading-7">{row.message}</div>
                      </div>
                    </section>
                  ))}
                </div>

                <div className="mt-7 rounded-lg border border-[#ddd6cc] bg-[#faf9f7] p-4 text-[10px] leading-6 text-[#5c554e]">
                  <strong>إيضاح:</strong> يثبت هذا المستند تسجيل الرسالة ونصها والمستلم وقناة الإرسال وحالتها داخل منصة الذات. أما إثبات التسليم أو القراءة داخل واتساب فيعتمد على بيانات التطبيق الخارجي.
                </div>
              </main>
              <OfficialFooter school={school} />
            </article>
          </div>
        </section>
      )}
    </div>
  );
}
