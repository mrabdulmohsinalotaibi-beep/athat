import { useMemo, useRef, useState, type ReactNode } from "react";
import {
  Archive,
  CheckSquare,
  Copy,
  Download,
  Link2,
  Mail,
  MessageCircle,
  MessageSquareText,
  QrCode,
  RotateCcw,
  Send,
  Share2,
  Square,
  Star,
  Trash2,
  UserCog
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/lib/school";

import { normalizeSaudiPhone, shareOnWhatsApp } from "@/lib/whatsapp";
import { Button } from "@/components/ui/button";
import { OfficialFooter, OfficialHeader } from "@/components/OfficialHeader";
import { PdfPreviewButton } from "@/components/PdfPreviewButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatHijriDate, formatHijriDateTime } from "@/lib/date";

import { Textarea } from "@/components/ui/textarea";


const STATUSES = ["جديد", "قيد المراجعة", "تم الرد", "محفوظ"];

const ASSIGNEES = [
  "الموجه الطلابي",
  "إدارة المدرسة",
  "وكيل شؤون الطلاب",
  "لجنة التوجيه الطلابي",
  "المختص الصحي",
  "معلم/ـة",
];

type FeedbackMessage = {
  id: string;
  sender_name: string;
  sender_contact: string | null;
  sender_role: string;
  category: string;
  satisfaction: number | null;
  message: string;
  internal_notes?: string | null;
  response_note?: string | null;
  assigned_to?: string | null;
  assigned_channel?: string | null;
  responded_at?: string | null;
  status: string;
  created_at: string;
};

type FeedbackAction = {
  id: string;
  feedback_id: string;
  action: string;
  notes: string | null;
  created_at: string;
};

function createFeedbackToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(18));

  return Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function messageExcerpt(message: string) {
  const compact = message.replace(/\s+/g, " ").trim();

  return compact.length > 90
    ? `${compact.slice(0, 90)}…`
    : compact;
}

function isEmail(value: string | null | undefined) {
  return Boolean(
    value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()),
  );
}

function deliveryText(
  items: FeedbackMessage[],
  schoolName: string,
) {
  return [
    "السلام عليكم ورحمة الله وبركاته",
    `من ${schoolName || "التوجيه الطلابي"}`,
    "",
    ...items.map((item, index) =>
      [
        `${index + 1}. ${item.category} — ${item.sender_role}`,
        `المرسل: ${item.sender_name || "مستفيد"}`,
        `التاريخ: ${formatHijriDate(item.created_at)}`,
        `المشاركة: ${item.message}`,
        item.response_note
          ? `الرد/الإجراء: ${item.response_note}`
          : "",
      ]
        .filter(Boolean)
        .join("\n"),
    ),
  ].join("\n\n");
}

function SummaryCard({
  label,
  value,
  hint,
  tone = "default",
  icon,
}: {
  label: string;
  value: string | number;
  hint: string;
  tone?: "default" | "amber" | "primary" | "rose";
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border border-[#D9C0A3]/35 bg-[#FFFDF9] p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-xs font-medium">{label}</span>
        {icon}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-black text-foreground">{value}</span>
      </div>
      <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>
    </div>
  );
}

export default function MessagesDashboard() {
  const { data: school } = useSchool();
  const queryClient = useQueryClient();


  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("الكل");
  const [status, setStatus] = useState("الكل");
  const [assignee, setAssignee] = useState("الكل");
  const [archiveTab, setArchiveTab] = useState<"sent" | "received">("sent");

  const [rotatingLink, setRotatingLink] = useState(false);
  const [documentMessage, setDocumentMessage] = useState<FeedbackMessage | null>(null);
  const documentRef = useRef<HTMLDivElement>(null);


  const { data: messages = [], isLoading, isError } = useQuery({
    queryKey: ["feedback_messages"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("feedback_messages")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      return (data ?? []) as FeedbackMessage[];
    },
  });

  const { data: feedbackActions = [] } = useQuery({
    queryKey: ["feedback_actions"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("feedback_actions")
        .select("id,feedback_id,action,notes,created_at")
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;
      return (data ?? []) as FeedbackAction[];
    },
  });

  const publicLink =
    typeof window === "undefined" ||
    !school?.public_feedback_token
      ? ""
      : `${window.location.origin}/feedback/${school.public_feedback_token}`;

  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          messages
            .map((item) => item.category)
            .filter(Boolean),
        ),
      ),
    [messages],
  );

  const filtered = useMemo(
    () =>
      messages.filter((item) => {
        const searchText = [
          item.sender_name,
          item.sender_role,
          item.category,
          item.message,
          item.assigned_to ?? "",
        ]
          .join(" ")
          .toLowerCase();

        const matchesSearch = searchText.includes(
          search.trim().toLowerCase(),
        );

        return (
          matchesSearch &&
          (category === "الكل" || item.category === category) &&
          (status === "الكل" || item.status === status) &&
          (assignee === "الكل" ||
            (item.assigned_to || "الموجه الطلابي") === assignee)
        );
      }),
    [messages, search, category, status, assignee],
  );

  const selected = messages.filter((item) =>
    selectedIds.includes(item.id),
  );

  const allVisibleSelected =
    filtered.length > 0 &&
    filtered.every((item) => selectedIds.includes(item.id));

  const newMessages = messages.filter(
    (item) => item.status === "جديد",
  ).length;

  const counselorInbox = messages.filter(
    (item) =>
      (item.assigned_to || "الموجه الطلابي") ===
        "الموجه الطلابي" &&
      item.status !== "تم الرد",
  ).length;

  const helpRequests = messages.filter(
    (item) =>
      item.category === "طلب مساعدة" &&
      item.status !== "تم الرد",
  ).length;

  const sentActions = feedbackActions.filter((item) =>
    item.action.startsWith("تم فتح الإرسال") ||
    item.action.startsWith("مشاركة صادرة"),
  );

  const archivedMessages = messages.filter(
    (item) => item.status === "محفوظ",
  );

  const rated = messages.filter(
    (item) => item.satisfaction != null,
  );

  const averageRating = rated.length
    ? (
        rated.reduce(
          (total, item) =>
            total + Number(item.satisfaction),
          0,
        ) / rated.length
      ).toFixed(1)
    : "—";

  function openOfficialDocument(item: FeedbackMessage) {
    setDocumentMessage(item);
    window.setTimeout(() => documentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  async function recordOutgoingAction(
    items: FeedbackMessage[],
    channel: "واتساب" | "البريد الإلكتروني",
    body: string,
    explicitContact?: string,
    actionPrefix = "تم فتح الإرسال",
  ) {
    if (!items.length) return;

    const payload = items.map((item) => ({
      feedback_id: item.id,
      action: `${actionPrefix} عبر ${channel}`,
      notes: [
        `المستفيد: ${item.sender_name || "مستفيد"}`,
        `التواصل: ${explicitContact || item.sender_contact || "غير محدد"}`,
        `التصنيف: ${item.category}`,
        "",
        body,
      ].join("\n"),
    }));

    const { error } = await (supabase as any)
      .from("feedback_actions")
      .insert(payload);

    if (error) {
      toast.error(`تعذّر حفظ سجل الرسالة الصادرة: ${error.message}`);
      return;
    }

    await queryClient.invalidateQueries({
      queryKey: ["feedback_actions"],
    });
  }

  async function sendWhatsApp() {
    if (!selected.length) return;
    const body = deliveryText(
      selected,
      school?.school_name || "التوجيه الطلابي",
    );
    await recordOutgoingAction(selected, "واتساب", body, undefined, "مشاركة صادرة");
    shareOnWhatsApp(body);
  }

  async function sendEmail() {
    if (!selected.length) return;
    const emails = Array.from(
      new Set(
        selected
          .map((item) => item.sender_contact?.trim() ?? "")
          .filter((contact) => isEmail(contact)),
      ),
    );

    if (!emails.length) {
      toast.info("لا تحتوي المشاركات المحددة على بريد إلكتروني صالح.");
      return;
    }

    const subjectText = `مشاركات التوجيه الطلابي — ${school?.school_name || "الذات"}`;
    const bodyText = deliveryText(
      selected,
      school?.school_name || "التوجيه الطلابي",
    );
    await recordOutgoingAction(selected, "البريد الإلكتروني", bodyText, emails.join(","), "مشاركة صادرة");
    const subject = encodeURIComponent(subjectText);
    const body = encodeURIComponent(bodyText);
    window.location.href = `mailto:${emails.join(",")}?subject=${subject}&body=${body}`;
  }

  function toggle(id: string) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  }

  function toggleAllVisible() {
    setSelectedIds((current) =>
      allVisibleSelected
        ? current.filter(
            (id) =>
              !filtered.some((item) => item.id === id),
          )
        : Array.from(
            new Set([
              ...current,
              ...filtered.map((item) => item.id),
            ]),
          ),
    );
  }

  async function updateMessage(
    id: string,
    patch: Record<string, unknown>,
    successMessage?: string,
  ) {
    const { error } = await (supabase as any)
      .from("feedback_messages")
      .update(patch)
      .eq("id", id);

    if (error) {
      toast.error(`تعذّر تحديث الرسالة: ${error.message}`);
      return false;
    }

    await queryClient.invalidateQueries({
      queryKey: ["feedback_messages"],
    });

    if (successMessage) {
      toast.success(successMessage);
    }

    return true;
  }

  async function updateStatus(
    id: string,
    nextStatus: string,
  ) {
    await updateMessage(id, {
      status: nextStatus,
      ...(nextStatus === "تم الرد"
        ? { responded_at: new Date().toISOString() }
        : {}),
    });
  }

  async function updateNotes(id: string, notes: string) {
    await updateMessage(
      id,
      {
        internal_notes: notes.trim() || null,
      },
      "تم حفظ الملاحظة الداخلية",
    );
  }

  async function updateResponse(
    id: string,
    response: string,
  ) {
    const trimmedResponse = response.trim();

    await updateMessage(
      id,
      {
        response_note: trimmedResponse || null,
      },
      "تم حفظ مسودة الرد والإجراء",
    );
  }

  async function deleteMessage(id: string) {
    if (
      !window.confirm(
        "هل أنت متأكد من حذف هذه المشاركة نهائياً؟",
      )
    ) {
      return;
    }

    const { error } = await (supabase as any)
      .from("feedback_messages")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error(`تعذّر حذف الرسالة: ${error.message}`);
      return;
    }

    await queryClient.invalidateQueries({
      queryKey: ["feedback_messages"],
    });

    setSelectedIds((current) =>
      current.filter((selectedId) => selectedId !== id),
    );

    toast.success("تم حذف المشاركة بنجاح");
  }

  async function copyLink() {
    if (!publicLink) {
      return;
    }

    await navigator.clipboard.writeText(publicLink);
    toast.success("تم نسخ رابط الاستبانة");
  }

  function shareFormLink() {
    if (!publicLink) {
      return;
    }

    shareOnWhatsApp(
      [
        "السلام عليكم ورحمة الله وبركاته",
        "نأمل التكرم بتعبئة استبانة الآراء والمقترحات لخدمات التوجيه الطلابي عبر الرابط التالي:",
        publicLink,
        "شاكرين لكم تعاونكم.",
      ].join("\n"),
    );
  }

  async function rotateLink() {
    if (!school?.id || rotatingLink) {
      return;
    }

    if (
      !window.confirm(
        "سيصبح رابط الاستبانة الحالي غير فعال. هل تريد إنشاء رابط جديد؟",
      )
    ) {
      return;
    }

    setRotatingLink(true);

    const { error } = await supabase
      .from("school_settings")
      .update({
        public_feedback_token: createFeedbackToken(),
      } as never)
      .eq("id", school.id);

    setRotatingLink(false);

    if (error) {
      toast.error(`تعذّر إنشاء رابط جديد: ${error.message}`);
      return;
    }

    await queryClient.invalidateQueries({
      queryKey: ["school_settings"],
    });

    toast.success("تم إنشاء رابط استبانة جديد");
  }

  function exportCommunicationArchiveCsv() {
    const sentRows = sentActions.map((action) => {
      const message = messages.find((item) => item.id === action.feedback_id);
      return [
        "صادر",
        message?.sender_name || "مستفيد",
        message?.sender_contact ?? "",
        message?.category ?? "",
        action.action,
        action.notes ?? "",
        formatHijriDateTime(action.created_at),
      ];
    });

    const receivedRows = archivedMessages.map((item) => [
      "وارد مؤرشف",
      item.sender_name,
      item.sender_contact ?? "",
      item.category,
      item.status,
      item.message,
      formatHijriDateTime(item.created_at),
    ]);

    const csv = [
      "الاتجاه,الاسم,التواصل,التصنيف,الحالة أو القناة,النص أو التفاصيل,التاريخ",
      ...[...sentRows, ...receivedRows].map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
      ),
    ].join("\n");

    const url = URL.createObjectURL(
      new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "سجل_وأرشيف_الرسائل.csv";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }

  function exportCsv() {
    const rows = filtered.map((item) => [
      item.sender_name,
      item.sender_role,
      item.sender_contact ?? "",
      item.category,
      item.satisfaction ?? "",
      item.assigned_to || "الموجه الطلابي",
      item.status,
      item.message,
      item.response_note ?? "",
      item.internal_notes ?? "",
      formatHijriDateTime(item.created_at),
    ]);

    const csv = [
      "الاسم,صفة المشارك,التواصل,نوع المشاركة,التقييم,الجهة المسؤولة,الحالة,الرسالة,الرد أو الإجراء,ملاحظات داخلية,تاريخ الاستلام",
      ...rows.map((row) =>
        row
          .map(
            (cell) =>
              `"${String(cell).replace(/"/g, '""')}"`,
          )
          .join(","),
      ),
    ].join("\n");

    const url = URL.createObjectURL(
      new Blob(["\ufeff" + csv], {
        type: "text/csv;charset=utf-8",
      }),
    );

    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "الآراء_والرسائل.csv";

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    window.setTimeout(
      () => URL.revokeObjectURL(url),
      30_000,
    );
  }



  async function replyToBeneficiary(
    item: FeedbackMessage,
    channel?: "whatsapp" | "email",
  ) {
    const note = window.prompt(
      "اكتب الرد أو الإجراء المراد إرساله للمستفيد:",
      item.response_note || "",
    );

    if (note === null || !note.trim()) {
      return;
    }

    const trimmedNote = note.trim();

    const saved = await updateMessage(
      item.id,
      {
        response_note: trimmedNote,
      },
      "تم حفظ مسودة الرد",
    );

    if (!saved) {
      return;
    }

    const responseText = [
      "السلام عليكم ورحمة الله وبركاته",
      `من ${school?.school_name || "التوجيه الطلابي"}`,
      item.sender_name ? `الأستاذ/ة ${item.sender_name}،` : "",
      trimmedNote,
    ].filter(Boolean).join("\n\n");

    if (channel === "email" || (!channel && isEmail(item.sender_contact))) {
      const email = isEmail(item.sender_contact) ? item.sender_contact?.trim() : window.prompt("البريد الإلكتروني للمستفيد:");
      if (!email) return;
      await recordOutgoingAction([item], "البريد الإلكتروني", responseText, email);
      window.location.href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(`رد من ${school?.school_name || "التوجيه الطلابي"}`)}&body=${encodeURIComponent(responseText)}`;
    } else {
      const suggested = item.sender_contact && !isEmail(item.sender_contact)
        ? normalizeSaudiPhone(item.sender_contact) : "";
      const phone = suggested || window.prompt("رقم جوال المستفيد (اتركه فارغاً لاختيار المحادثة):", "");
      if (phone === null) return;
      await recordOutgoingAction([item], "واتساب", responseText, phone || undefined);
      shareOnWhatsApp(responseText, phone);
    }
    toast.info("تم حفظ الرسالة في سجل الصادر. تأكيد الإرسال النهائي يتم من حالة الرسالة بعد العودة من تطبيق التواصل.");
  }

  return (
    <div className="min-w-0 space-y-6" dir="rtl">


      <section className="border-b border-border pb-6">
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <div className="flex items-center gap-2 text-primary">
              <MessageSquareText className="size-5" />
              <span className="text-xs font-bold">
                مركز تواصل المستفيدين
              </span>
            </div>

            <h1 className="mt-2 text-2xl font-black text-foreground sm:text-3xl">
              الآراء والرسائل
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
              مشاركات المستفيدين والردود والمتابعة في مكان واحد.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <Button
              variant="outline"
              onClick={copyLink}
              disabled={!publicLink}
            >
              <Copy className="size-4" />
              نسخ الرابط
            </Button>

            <Button
              variant="outline"
              onClick={shareFormLink}
              disabled={!publicLink}
            >
              <Link2 className="size-4" />
              مشاركة واتساب
            </Button>

            <Button
              variant="outline"
              onClick={rotateLink}
              disabled={!publicLink || rotatingLink}
            >
              <RotateCcw className="size-4" />
              {rotatingLink
                ? "جارٍ الإنشاء..."
                : "رابط جديد"}
            </Button>
          </div>
        </div>

        {publicLink && (
          <div className="mt-5 flex flex-col gap-4 border-t border-border pt-5 text-xs sm:flex-row sm:items-center">
            <img
              className="size-24 shrink-0 rounded-md border border-border bg-card p-2"
              src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(publicLink)}`}
              alt="رمز QR للاستبانة"
            />

            <div className="min-w-0 text-foreground">
              <div className="flex items-center gap-2 font-bold">
                <QrCode className="size-4" />
                رمز QR ورابط الاستبانة
              </div>

              <span className="mt-2 block break-all font-mono">
                {publicLink}
              </span>

              <p className="mt-2 text-muted-foreground">
                شارك الرابط مع المستفيدين؛ الردود لا تظهر للزوار.
              </p>
            </div>
          </div>
        )}
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          label="إجمالي المشاركات"
          value={messages.length}
          hint="كل الردود المستلمة"
        />

        <SummaryCard
          label="رسائل جديدة"
          value={newMessages}
          hint="بحاجة إلى فرز"
          tone="amber"
        />

        <SummaryCard
          label="صندوق الموجه"
          value={counselorInbox}
          hint="مسندة للموجه الطلابي"
          tone="primary"
          icon={<UserCog className="size-4" />}
        />

        <SummaryCard
          label="طلبات مساعدة"
          value={helpRequests}
          hint="تحتاج متابعة مباشرة"
          tone="rose"
        />

        <SummaryCard
          label="متوسط التقييم"
          value={averageRating}
          hint={
            rated.length
              ? `من ${rated.length} تقييم`
              : "لا توجد تقييمات"
          }
          icon={<Star className="size-4 fill-current" />}
        />
      </section>

      <section className="rounded-3xl border border-[#D9C0A3]/35 bg-[#FFFDF9] p-4 shadow-[var(--shadow-card)] sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-primary">
              <Archive className="size-5" />
              <span className="text-xs font-black">سجل وأرشيف المراسلات</span>
            </div>
            <h2 className="mt-1 text-lg font-black">الرسائل المرسلة والمستقبلة</h2>
            <p className="mt-1 text-xs leading-6 text-muted-foreground">
              يحتفظ الموقع بسجل الرسائل الصادرة، ويعرض الرسائل الواردة التي تم تحويل حالتها إلى «محفوظ».
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={archiveTab === "sent" ? "default" : "outline"}
              onClick={() => setArchiveTab("sent")}
            >
              <Send className="size-4" />
              الصادر ({sentActions.length})
            </Button>
            <Button
              size="sm"
              variant={archiveTab === "received" ? "default" : "outline"}
              onClick={() => setArchiveTab("received")}
            >
              <Archive className="size-4" />
              الوارد المؤرشف ({archivedMessages.length})
            </Button>
            <Button size="sm" variant="outline" onClick={exportCommunicationArchiveCsv}>
              <Download className="size-4" />
              تصدير السجل
            </Button>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border">
          {archiveTab === "sent" ? (
            sentActions.length ? (
              <div className="divide-y">
                {sentActions.slice(0, 100).map((action) => {
                  const related = messages.find((item) => item.id === action.feedback_id);
                  return (
                    <div key={action.id} className="grid gap-2 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <strong className="text-sm">{related?.sender_name || "مستفيد"}</strong>
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                            {action.action}
                          </span>
                        </div>
                        <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-6 text-muted-foreground">
                          {action.notes || related?.response_note || "لا توجد تفاصيل إضافية."}
                        </p>
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {formatHijriDateTime(action.created_at)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="p-6 text-center text-xs text-muted-foreground">لا توجد رسائل صادرة مسجلة حتى الآن.</p>
            )
          ) : archivedMessages.length ? (
            <div className="divide-y">
              {archivedMessages.slice(0, 100).map((item) => (
                <div key={item.id} className="grid gap-2 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="text-sm">{item.sender_name}</strong>
                      <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-foreground">
                        {item.category}
                      </span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-6 text-muted-foreground">
                      {item.message}
                    </p>
                    {item.response_note && (
                      <p className="mt-2 rounded-lg bg-muted/40 p-2 text-xs leading-6">
                        <strong>الرد/الإجراء:</strong> {item.response_note}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-[10px] text-muted-foreground">{formatHijriDateTime(item.created_at)}</span>
                    <Button size="sm" variant="ghost" onClick={() => void updateStatus(item.id, "قيد المراجعة")}>
                      استعادة للوارد
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="p-6 text-center text-xs text-muted-foreground">لا توجد رسائل واردة مؤرشفة حتى الآن.</p>
          )}
        </div>
      </section>

      <section className="border-y border-border py-5">
        <div className="flex flex-col gap-3 xl:flex-row lg:items-end xl:justify-between">
          <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div>
              <Label htmlFor="feedback-search"> بحث </Label>
              <Input
                id="feedback-search"
                className="mt-1"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="الاسم أو نص الرسالة"
              />
            </div>

            <div>
              <Label htmlFor="feedback-category-filter"> النوع </Label>
              <select
                id="feedback-category-filter"
                value={category}
                onChange={(event) =>
                  setCategory(event.target.value)
                }
                className="mt-1 flex h-10 w-full rounded-md border border-[#D9C0A3]/45 bg-[#FFFDF9] px-3 text-sm"
              >
                <option>الكل</option>
                {categories.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="feedback-assignee-filter"> الجهة المسؤولة </Label>
              <select
                id="feedback-assignee-filter"
                value={assignee}
                onChange={(event) =>
                  setAssignee(event.target.value)
                }
                className="mt-1 flex h-10 w-full rounded-md border border-[#D9C0A3]/45 bg-[#FFFDF9] px-3 text-sm"
              >
                <option>الكل</option>
                {ASSIGNEES.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="feedback-status-filter"> الحالة </Label>
              <select
                id="feedback-status-filter"
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value)
                }
                className="mt-1 flex h-10 w-full rounded-md border border-[#D9C0A3]/45 bg-[#FFFDF9] px-3 text-sm"
              >
                <option>الكل</option>
                {STATUSES.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 lg:max-w-lg">
            <Button variant="outline" onClick={exportCsv}>
              <Download className="size-4" /> تصدير CSV
            </Button>
            <Button variant="outline" onClick={() => void sendWhatsApp()} disabled={!selected.length}>
              <MessageCircle className="size-4" /> واتساب
            </Button>
            <Button variant="outline" onClick={() => sendEmail()} disabled={!selected.length}>
              <Mail className="size-4" /> بريد
            </Button>
          </div>
        </div>
      </section>

      <section className="min-w-0 overflow-hidden rounded-md border border-border bg-card shadow-sm">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b bg-muted/30 px-4 py-3 text-sm sm:px-5">
          <span>
            <strong>{filtered.length}</strong> مشاركة مطابقة {selected.length ? `· ${selected.length} محددة` : ""}
          </span>
        </div>

        <div className="space-y-3 p-3 md:hidden">
          {isLoading ? <p className="py-10 text-center text-muted-foreground">جارٍ تحميل الردود...</p>
            : isError ? <p className="py-10 text-center text-destructive">تعذّر تحميل المشاركات. حاول تحديث الصفحة.</p>
            : filtered.length === 0 ? <p className="py-10 text-center text-muted-foreground">لا توجد مشاركات مطابقة حتى الآن.</p>
            : filtered.map((item) => (
              <article key={item.id} className="min-w-0 rounded-md border border-border p-4">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><strong className="break-words">{item.sender_name}</strong><span className="rounded-sm bg-accent px-2 py-0.5 text-xs text-accent-foreground">{item.category}</span></div>
                    <p className="mt-1 text-xs text-muted-foreground">{item.sender_role} · {formatHijriDate(item.created_at)}</p>
                  </div>
                  <Button type="button" size="icon" variant="ghost" onClick={() => toggle(item.id)} aria-label={selectedIds.includes(item.id) ? "إلغاء تحديد المشاركة" : "تحديد المشاركة"}>
                    {selectedIds.includes(item.id) ? <CheckSquare className="text-primary" /> : <Square />}
                  </Button>
                </div>
                <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-foreground">{item.message}</p>
                {item.sender_contact && <p className="mt-2 break-all text-xs text-muted-foreground">{item.sender_contact}</p>}
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <select aria-label="حالة المشاركة" value={item.status} onChange={(event) => void updateStatus(item.id, event.target.value)} className="h-9 min-w-0 rounded-md border border-[#D9C0A3]/45 bg-[#FFFDF9] px-2 text-xs">{STATUSES.map((value) => <option key={value}>{value}</option>)}</select>
                  <select aria-label="الجهة المسؤولة" value={item.assigned_to || "الموجه الطلابي"} onChange={(event) => void updateMessage(item.id, { assigned_to: event.target.value }, "تم توجيه الرسالة")} className="h-9 min-w-0 rounded-md border border-[#D9C0A3]/45 bg-[#FFFDF9] px-2 text-xs">{ASSIGNEES.map((value) => <option key={value}>{value}</option>)}</select>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => openOfficialDocument(item)}><Share2 /> مستند رسمي</Button>\n                  <Button size="sm" variant="outline" onClick={() => void replyToBeneficiary(item, "whatsapp")}><MessageCircle /> رد واتساب</Button>
                  <Button size="sm" variant="outline" onClick={() => void replyToBeneficiary(item, "email")}><Mail /> بريد</Button>
                  <Button size="sm" variant="ghost" onClick={() => void updateStatus(item.id, "محفوظ")}><Archive /> أرشفة</Button>
                  <Button size="icon" variant="ghost" className="mr-auto text-destructive" onClick={() => void deleteMessage(item.id)} title="حذف المشاركة" aria-label="حذف المشاركة"><Trash2 /></Button>
                </div>
                <details className="mt-3 border-t border-border pt-3 text-sm">
                  <summary className="cursor-pointer text-primary">الرد والملاحظات الداخلية</summary>
                  <Label className="mt-3 block">الرد أو الإجراء</Label><Textarea key={`${item.id}-response`} defaultValue={item.response_note || ""} onBlur={(event) => { if (event.target.value.trim() !== (item.response_note || "").trim()) void updateResponse(item.id, event.target.value); }} className="mt-1" />
                  <Label className="mt-3 block">ملاحظة داخلية</Label><Textarea key={`${item.id}-notes`} defaultValue={item.internal_notes || ""} onBlur={(event) => { if (event.target.value.trim() !== (item.internal_notes || "").trim()) void updateNotes(item.id, event.target.value); }} className="mt-1" />
                </details>
              </article>
            ))}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[1140px] text-right text-sm">
            <thead className="bg-muted/50 text-xs">
              <tr>
                <th className="p-4">
                   <Button type="button" variant="ghost" size="icon" onClick={toggleAllVisible} title="تحديد كل النتائج">
                    {allVisibleSelected ? <CheckSquare className="text-primary" /> : <Square className="text-muted-foreground" />}
                   </Button>
                </th>
                <th className="p-4">المشارك</th>
                <th className="p-4">التصنيف</th>
                <th className="p-4">المسؤول</th>
                <th className="p-4">التقييم</th>
                <th className="p-4">الملخص</th>
                <th className="p-4">الاستلام</th>
                <th className="p-4">الحالة</th>
                <th className="p-4">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={9} className="p-10 text-center text-muted-foreground">جارٍ تحميل الردود...</td></tr>
              ) : isError ? (
                <tr><td colSpan={9} className="p-10 text-center text-destructive">تعذّر تحميل المشاركات. حاول تحديث الصفحة.</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="p-10 text-center text-muted-foreground">لا توجد مشاركات مطابقة حتى الآن.</td></tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="border-t border-border/60 align-top">
                    <td className="p-4">
                      <Button type="button" variant="ghost" size="icon" aria-label="تحديد المشاركة" onClick={() => toggle(item.id)}>
                        {selectedIds.includes(item.id) ? <CheckSquare className="text-primary" /> : <Square className="text-muted-foreground" />}
                      </Button>
                    </td>
                    <td className="p-4 font-bold">
                      {item.sender_name}
                      <span className="mt-1 block text-xs font-normal text-muted-foreground">
                        {item.sender_role} {item.sender_contact ? ` · ${item.sender_contact}` : ""}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-foreground">
                        {item.category}
                      </span>
                    </td>
                    <td className="p-4">
                      <select
                        value={item.assigned_to || "الموجه الطلابي"}
                        onChange={(event) => void updateMessage(item.id, { assigned_to: event.target.value }, "تم توجيه الرسالة")}
                        className="h-8 max-w-44 rounded-md border border-[#D9C0A3]/45 bg-[#FFFDF9] px-2 text-xs"
                      >
                        {ASSIGNEES.map((name) => <option key={name}>{name}</option>)}
                      </select>
                    </td>
                    <td className="p-4">
                      {item.satisfaction ? (
                        <span className="inline-flex items-center gap-1 text-amber-500">
                          <Star className="size-4 fill-current" /> {item.satisfaction}/5
                        </span>
                      ) : "—"}
                    </td>
                    <td className="max-w-sm p-4 leading-7" title={item.message}>
                      {messageExcerpt(item.message)}
                    </td>
                    <td className="p-4 text-xs text-muted-foreground">
                      {formatHijriDate(item.created_at)}
                    </td>
                    <td className="p-4">
                      <select
                        value={item.status}
                        onChange={(event) => void updateStatus(item.id, event.target.value)}
                        className="h-8 rounded-md border border-[#D9C0A3]/45 bg-[#FFFDF9] px-2 text-xs"
                      >
                        {STATUSES.map((s) => <option key={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openOfficialDocument(item)} title="مشاركة كمستند رسمي PDF" aria-label="مشاركة كمستند رسمي"><Share2 className="size-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => void replyToBeneficiary(item)} title="رد مباشر">
                          <Send className="size-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => void updateStatus(item.id, "محفوظ")} title="أرشفة">
                          <Archive className="size-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => void deleteMessage(item.id)} title="حذف">
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {documentMessage && (
        <section className="rounded-2xl border border-border bg-card p-3 shadow-sm sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-black">مستند المشاركة الرسمي</h2>
              <p className="text-xs text-muted-foreground">عاين المستند ثم نزّله PDF أو شاركه مباشرة عبر واتساب وتطبيقات الجهاز.</p>
            </div>
            <PdfPreviewButton
              elementRef={documentRef}
              filename={`مشاركة-${documentMessage.sender_name || "مستفيد"}-${documentMessage.id.slice(0, 8)}.pdf`}
              title="مشاركة مستفيد"
            />
          </div>

          <div className="overflow-auto rounded-lg bg-muted/30 p-2 sm:p-4">
            <article
              ref={documentRef}
              dir="rtl"
              className="mx-auto flex min-h-[1123px] w-[794px] max-w-none flex-col bg-white text-[#24211f] shadow-sm"
            >
              <OfficialHeader
                school={school}
                title={`${documentMessage.category} — مشاركة مستفيد`}
                reportNo={documentMessage.id.slice(0, 8).toUpperCase()}
              />
              <main className="flex-1 px-12 py-9 text-[13px] leading-8">
                <h1 className="mb-7 text-center text-xl font-black text-[#123d49]">مشاركة مستفيد</h1>
                <div className="grid grid-cols-2 gap-x-8 gap-y-3 rounded-lg border border-[#ddd6cc] bg-[#faf9f7] p-5">
                  <p><strong>الاسم:</strong> {documentMessage.sender_name || "مستفيد"}</p>
                  <p><strong>الصفة:</strong> {documentMessage.sender_role || "—"}</p>
                  <p><strong>نوع المشاركة:</strong> {documentMessage.category || "—"}</p>
                  <p><strong>تاريخ الاستلام:</strong> {formatHijriDateTime(documentMessage.created_at)}</p>
                  <p><strong>الحالة:</strong> {documentMessage.status || "—"}</p>
                  <p><strong>الجهة المسؤولة:</strong> {documentMessage.assigned_to || "الموجه الطلابي"}</p>
                </div>
                <section className="mt-7">
                  <h2 className="mb-2 font-black text-[#123d49]">نص المشاركة</h2>
                  <div className="min-h-40 whitespace-pre-wrap rounded-lg border border-[#ddd6cc] p-5">{documentMessage.message}</div>
                </section>
                {documentMessage.response_note && (
                  <section className="mt-6">
                    <h2 className="mb-2 font-black text-[#123d49]">الرد أو الإجراء</h2>
                    <div className="whitespace-pre-wrap rounded-lg border border-[#ddd6cc] p-5">{documentMessage.response_note}</div>
                  </section>
                )}
              </main>
              <OfficialFooter school={school} />
            </article>
          </div>
        </section>
      )}


    </div>
  );
}
