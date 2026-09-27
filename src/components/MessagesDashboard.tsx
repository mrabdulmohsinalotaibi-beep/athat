import { useMemo, useRef, useState, type ReactNode } from "react";
import {
  CheckSquare,
  ChevronDown,
  Copy,
  Download,
  FileDown,
  Link2,
  Mail,
  MessageCircle,
  MessageSquareText,
  Search,
  Printer,
  QrCode,
  RotateCcw,
  Send,
  Square,
  Star,
  Trash2,
  UserCog,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/lib/school";
import { elementToPdf } from "@/lib/pdf";
import { normalizeSaudiPhone, shareOnWhatsApp } from "@/lib/whatsapp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OfficialFooter, OfficialHeader } from "@/components/OfficialHeader";
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
        `التاريخ: ${new Date(item.created_at).toLocaleDateString("ar-SA")}`,
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

export default function MessagesDashboard() {
  const { data: school } = useSchool();
  const queryClient = useQueryClient();
  const printRef = useRef<HTMLDivElement>(null);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("الكل");
  const [status, setStatus] = useState("الكل");
  const [assignee, setAssignee] = useState("الكل");
  const [exporting, setExporting] = useState(false);
  const [rotatingLink, setRotatingLink] = useState(false);
  const [includeInternal, setIncludeInternal] = useState(true);

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
        ...(trimmedResponse
          ? {
              status: "تم الرد",
              responded_at: new Date().toISOString(),
            }
          : {}),
      },
      "تم حفظ الرد والإجراء",
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
      new Date(item.created_at).toLocaleString("ar-SA"),
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

  async function exportPdf() {
    if (
      !printRef.current ||
      !selected.length ||
      exporting
    ) {
      return;
    }

    setExporting(true);

    try {
      await elementToPdf(
        printRef.current,
        includeInternal
          ? "تقرير داخلي للآراء والرسائل"
          : "تقرير الآراء والرسائل",
      );

      toast.success("تم حفظ التقرير بصيغة PDF");
    } catch {
      toast.error("تعذّر حفظ ملف PDF.");
    } finally {
      setExporting(false);
    }
  }

  function printSelected(internal: boolean) {
    if (!selected.length) {
      return;
    }

    setIncludeInternal(internal);

    window.setTimeout(() => {
      window.print();
    }, 150);
  }

  function printAll() {
    setSelectedIds(filtered.map((item) => item.id));
    setIncludeInternal(true);

    window.setTimeout(() => {
      window.print();
    }, 150);
  }

  async function sendWhatsApp(
    items = selected,
    preferredContact?: string | null,
  ) {
    if (!items.length) {
      return;
    }

    const contact = preferredContact || (items.length === 1 ? items[0]?.sender_contact : "");
    const suggested = contact && !isEmail(contact) ? normalizeSaudiPhone(contact) : "";

    const phone = window.prompt(
      "رقم الجوال المستلم بصيغة 05XXXXXXXX (اتركه فارغاً لاختيار محادثة داخل واتساب):",
      suggested,
    );

    if (phone === null) {
      return;
    }

    shareOnWhatsApp(
      deliveryText(
        items,
        school?.school_name || "التوجيه الطلابي",
      ),
      phone,
    );
  }

  function sendEmail(
    items = selected,
    preferredContact?: string | null,
  ) {
    if (!items.length) {
      return;
    }

    const suggested = isEmail(preferredContact)
      ? (preferredContact ?? "")
      : "";

    const email = window.prompt(
      "البريد الإلكتروني المستلم:",
      suggested,
    );

    if (!email?.trim()) {
      return;
    }

    const subject = encodeURIComponent(
      `رسالة من ${
        school?.school_name || "التوجيه الطلابي"
      }`,
    );

    const body = encodeURIComponent(
      deliveryText(
        items,
        school?.school_name || "التوجيه الطلابي",
      ),
    );

    window.location.href =
      `mailto:${encodeURIComponent(email.trim())}` +
      `?subject=${subject}&body=${body}`;
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
      window.location.href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(`رد من ${school?.school_name || "التوجيه الطلابي"}`)}&body=${encodeURIComponent(responseText)}`;
    } else {
      const suggested = item.sender_contact && !isEmail(item.sender_contact)
        ? normalizeSaudiPhone(item.sender_contact) : "";
      const phone = suggested || window.prompt("رقم جوال المستفيد (اتركه فارغاً لاختيار المحادثة):", "");
      if (phone === null) return;
      shareOnWhatsApp(responseText, phone);
    }
    toast.info("يُفتح تطبيق التواصل لإرسال الرد؛ حدّث الحالة إلى «تم الرد» بعد التأكد من الإرسال.");
  }

  return (
    <div className="min-w-0 space-y-6" dir="rtl">
      <section className="no-print border-b border-border pb-6">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
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

      <section className="no-print grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
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

      <section className="no-print border-y border-border py-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div>
              <Label htmlFor="feedback-search">
                بحث
              </Label>

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
              <Label htmlFor="feedback-category-filter">
                النوع
              </Label>

              <select
                id="feedback-category-filter"
                value={category}
                onChange={(event) =>
                  setCategory(event.target.value)
                }
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option>الكل</option>

                {categories.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="feedback-assignee-filter">
                الجهة المسؤولة
              </Label>

              <select
                id="feedback-assignee-filter"
                value={assignee}
                onChange={(event) =>
                  setAssignee(event.target.value)
                }
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option>الكل</option>

                {ASSIGNEES.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="feedback-status-filter">
                الحالة
              </Label>

              <select
                id="feedback-status-filter"
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value)
                }
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option>الكل</option>

                {STATUSES.map((item) => (
                  <option key={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 lg:max-w-lg">
            <Button
              variant="outline"
              onClick={exportCsv}
            >
              <Download className="size-4" />
              تصدير CSV
            </Button>

            <Button
              variant="outline"
              onClick={() => void sendWhatsApp()}
              disabled={!selected.length}
            >
              <MessageCircle className="size-4" />
              واتساب
            </Button>

            <Button
              variant="outline"
              onClick={() => sendEmail()}
              disabled={!selected.length}
            >
              <Mail className="size-4" />
              بريد
            </Button>

            <Button
              variant="outline"
              onClick={() => printSelected(false)}
              disabled={!selected.length}
            >
              <Printer className="size-4" />
              طباعة مشاركة
            </Button>

            <Button
              variant="outline"
              onClick={() => printSelected(true)}
              disabled={!selected.length}
            >
              <Printer className="size-4" />
              طباعة داخلية
            </Button>

            <Button
              onClick={exportPdf}
              disabled={!selected.length || exporting}
            >
              <FileDown className="size-4" />
              {exporting
                ? "جارٍ حفظ PDF..."
                : "حفظ PDF"}
            </Button>
          </div>
        </div>
      </section>

      <section className="no-print min-w-0 overflow-hidden rounded-md border border-border bg-card shadow-sm">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b bg-muted/30 px-4 py-3 text-sm sm:px-5">
          <span>
            <strong>{filtered.length}</strong>{" "}
            مشاركة مطابقة {selected.length ? `· ${selected.length} محددة` : ""}
          </span>

          <Button
            size="sm"
            variant="ghost"
            onClick={printAll}
          >
            <Printer className="size-4" />
            طباعة قائمة النتائج
          </Button>
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
                    <p className="mt-1 text-xs text-muted-foreground">{item.sender_role} · {new Date(item.created_at).toLocaleDateString("ar-SA")}</p>
                  </div>
                  <Button type="button" size="icon" variant="ghost" onClick={() => toggle(item.id)} aria-label={selectedIds.includes(item.id) ? "إلغاء تحديد المشاركة" : "تحديد المشاركة"}>
                    {selectedIds.includes(item.id) ? <CheckSquare className="text-primary" /> : <Square />}
                  </Button>
                </div>
                <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-foreground">{item.message}</p>
                {item.sender_contact && <p className="mt-2 break-all text-xs text-muted-foreground">{item.sender_contact}</p>}
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <select aria-label="حالة المشاركة" value={item.status} onChange={(event) => void updateStatus(item.id, event.target.value)} className="h-9 min-w-0 rounded-md border border-input bg-background px-2 text-xs">{STATUSES.map((value) => <option key={value}>{value}</option>)}</select>
                  <select aria-label="الجهة المسؤولة" value={item.assigned_to || "الموجه الطلابي"} onChange={(event) => void updateMessage(item.id, { assigned_to: event.target.value }, "تم توجيه الرسالة")} className="h-9 min-w-0 rounded-md border border-input bg-background px-2 text-xs">{ASSIGNEES.map((value) => <option key={value}>{value}</option>)}</select>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => void replyToBeneficiary(item, "whatsapp")}><MessageCircle /> رد واتساب</Button>
                  <Button size="sm" variant="outline" onClick={() => void replyToBeneficiary(item, "email")}><Mail /> بريد</Button>
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
                   <Button
                     type="button" variant="ghost" size="icon"
                    onClick={toggleAllVisible}
                    title="تحديد كل النتائج"
                  >
                    {allVisibleSelected ? (
                      <CheckSquare className="text-primary" />
                    ) : (
                      <Square className="text-muted-foreground" />
                    )}
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
                <tr>
                  <td
                    colSpan={9}
                    className="p-10 text-center text-muted-foreground"
                  >
                    جارٍ تحميل الردود...
                  </td>
                </tr>
              ) : isError ? (
                <tr><td colSpan={9} className="p-10 text-center text-destructive">تعذّر تحميل المشاركات. حاول تحديث الصفحة.</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="p-10 text-center text-muted-foreground"
                  >
                    لا توجد مشاركات مطابقة حتى الآن.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr
                    key={item.id}
                    className="border-t border-border/60 align-top"
                  >
                    <td className="p-4">
                      <Button
                        type="button" variant="ghost" size="icon"
                        aria-label="تحديد المشاركة"
                        onClick={() => toggle(item.id)}
                      >
                        {selectedIds.includes(item.id) ? (
                          <CheckSquare className="text-primary" />
                        ) : (
                          <Square className="text-muted-foreground" />
                        )}
                      </Button>
                    </td>

                    <td className="p-4 font-bold">
                      {item.sender_name}

                      <span className="mt-1 block text-xs font-normal text-muted-foreground">
                        {item.sender_role}
                        {item.sender_contact
                          ? ` · ${item.sender_contact}`
                          : ""}
                      </span>
                    </td>

                    <td className="p-4">
                      <span className="rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-foreground">
                        {item.category}
                      </span>
                    </td>

                    <td className="p-4">
                      <select
                        value={
                          item.assigned_to ||
                          "الموجه الطلابي"
                        }
                        onChange={(event) =>
                          void updateMessage(
                            item.id,
                            {
                              assigned_to:
                                event.target.value,
                            },
                            "تم توجيه الرسالة",
                          )
                        }
                        className="h-8 max-w-44 rounded-md border border-input bg-background px-2 text-xs"
                      >
                        {ASSIGNEES.map((name) => (
                          <option key={name}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="p-4">
                      {item.satisfaction ? (
                        <span className="inline-flex items-center gap-1 text-amber-500">
                          <Star className="size-4 fill-current" />
                          {item.satisfaction}/5
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>

                    <td
                      className="max-w-sm p-4 leading-7"
                      title={item.message}
                    >
                      {messageExcerpt(item.message)}
                    </td>

                    <td className="p-4 text-xs text-muted-foreground">
                      {new Date(
                        item.created_at,
                      ).toLocaleDateString("ar-SA")}
                    </td>

                    <td className="p-4">
                      <select
                        value={item.status}
                        onChange={(event) =>
                          void updateStatus(
                            item.id,
                            event.target.value,
                          )
                        }
                        className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                      >
                        {STATUSES.map((itemStatus) => (
                          <option key={itemStatus}>
                            {itemStatus}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="p-4">
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            void replyToBeneficiary(item, "whatsapp")
                          }
                        >
                          <Send className="size-4" />
                          واتساب
                        </Button>

                        <Button size="icon" variant="outline" onClick={() => void replyToBeneficiary(item, "email")} title="الرد بالبريد" aria-label="الرد بالبريد"><Mail /></Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            printSelected(true)
                          }
                          disabled={
                            !selectedIds.includes(item.id)
                          }
                        >
                          <Printer className="size-4" />
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive"
                          onClick={() =>
                            void deleteMessage(item.id)
                          }
                          title="حذف المشاركة"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>

                      <details className="mt-2 min-w-56 text-xs">
                        <summary className="flex cursor-pointer items-center gap-1 text-primary">
                          <ChevronDown className="size-3" />
                          الإجراء والملاحظات
                        </summary>

                        <Label className="mt-2 block text-[11px]">
                          الرد أو الإجراء للمستفيد
                        </Label>

                        <Textarea
                          defaultValue={
                            item.response_note || ""
                          }
                          className="mt-1 min-h-16 text-xs"
                          placeholder="الرد أو الإجراء المتخذ"
                           onBlur={(event) => { if (event.target.value.trim() !== (item.response_note || "").trim()) void updateResponse(
                              item.id,
                              event.target.value,
                             ); }}
                        />

                        <Label className="mt-2 block text-[11px]">
                          ملاحظة داخلية
                        </Label>

                        <Textarea
                          defaultValue={
                            item.internal_notes || ""
                          }
                          className="mt-1 min-h-16 text-xs"
                          placeholder="ملاحظة خاصة بالموجه"
                           onBlur={(event) => { if (event.target.value.trim() !== (item.internal_notes || "").trim()) void updateNotes(
                              item.id,
                              event.target.value,
                             ); }}
                        />
                      </details>
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
          title={
            includeInternal
              ? "تقرير داخلي للآراء والرسائل"
              : "تقرير الآراء والرسائل"
          }
          reportType="استبانة المستفيدين"
        />

        <div className="mt-5 rounded-lg border border-paper-border p-3 text-xs">
          <strong>الفترة:</strong>{" "}
          حتى {new Date().toLocaleDateString("ar-SA")}

          <span className="mx-3">|</span>

          <strong>عدد المشاركات:</strong>{" "}
          {selected.length}

          <span className="mx-3">|</span>

          <strong>نوع النسخة:</strong>{" "}
          {includeInternal ? "داخلية" : "مشاركة"}
        </div>

        <div className="mt-5 space-y-4">
          {selected.map((item, index) => (
            <article
              key={item.id}
              className="break-inside-avoid rounded-xl border border-paper-border p-4"
            >
              <div className="flex items-start justify-between gap-4 border-b border-paper-border pb-2 text-xs font-bold">
                <span>
                  {index + 1}. {item.category} —{" "}
                  {item.sender_role}
                </span>

                <span>
                  {new Date(
                    item.created_at,
                  ).toLocaleDateString("ar-SA")}
                </span>
              </div>

              <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                <p>
                  <strong>المرسل:</strong>{" "}
                  {item.sender_name}
                </p>

                <p>
                  <strong>وسيلة التواصل:</strong>{" "}
                  {item.sender_contact || "—"}
                </p>

                <p>
                  <strong>الجهة المسؤولة:</strong>{" "}
                  {item.assigned_to || "الموجه الطلابي"}
                </p>

                <p>
                  <strong>الحالة:</strong>{" "}
                  {item.status}
                </p>

                {item.satisfaction && (
                  <p>
                    <strong>التقييم:</strong>{" "}
                    {item.satisfaction} من 5
                  </p>
                )}
              </div>

              <p className="mt-3 whitespace-pre-wrap border-t border-paper-border pt-3 text-sm leading-8">
                {item.message}
              </p>

              {item.response_note && (
                <p className="mt-3 rounded-lg bg-muted/40 p-3 text-sm">
                  <strong>الرد أو الإجراء:</strong>{" "}
                  {item.response_note}
                </p>
              )}

              {includeInternal &&
                item.internal_notes && (
                  <p className="mt-3 rounded-lg border border-amber-300/50 bg-amber-50 p-3 text-sm">
                    <strong>ملاحظة داخلية:</strong>{" "}
                    {item.internal_notes}
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

function SummaryCard({
  label,
  value,
  hint,
  tone = "primary",
  icon,
}: {
  label: string;
  value: string | number;
  hint: string;
  tone?: "primary" | "amber" | "rose";
  icon?: ReactNode;
}) {
    const toneClass =
    tone === "amber"
      ? "border-amber-300/40 bg-amber-50/60 text-amber-800"
      : tone === "rose"
        ? "border-rose-300/40 bg-rose-50/60 text-rose-800"
        : "border-primary/12 bg-card text-primary";

  return (
    <article
      className={`rounded-2xl border p-4 shadow-sm ${toneClass}`}
    >
      <p className="text-xs font-semibold">
        {label}
      </p>

      <div className="mt-2 flex items-center gap-2">
        <strong className="text-2xl font-black">
          {value}
        </strong>
        {icon}
      </div>

      <p className="mt-1 text-xs opacity-75">
        {hint}
      </p>
    </article>
  );
}
