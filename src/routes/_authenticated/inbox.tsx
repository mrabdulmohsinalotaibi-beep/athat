import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  FileCheck2,
  HeartHandshake,
  Inbox,
  MessageSquareText,
  ShieldAlert,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { isGuidanceWorkspaceMember } from "@/lib/school-access";

export const Route = createFileRoute("/_authenticated/inbox")({
  head: () => ({
    meta: [
      { title: "الوارد الموحد | الذات" },
      { name: "description", content: "كل ما يحتاج انتباهك من خدمات التوجيه والمراسلات الإدارية في مكان واحد." },
    ],
  }),
  component: UnifiedInboxPage,
});

function UnifiedInboxPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["unified-work-inbox"],
    queryFn: async () => {
      const { data: context, error: contextError } = await (supabase as any).rpc("get_my_school_context");
      if (contextError) console.warn("[inbox] school context:", contextError.message);

      const membership = context?.membership ?? null;
      const memberId = String(membership?.id ?? "");
      const guidanceAllowed = !membership || isGuidanceWorkspaceMember(membership);

      const requests: Array<Promise<any>> = [
        Promise.resolve(
          (supabase as any)
            .from("school_report_handoffs")
            .select("id,title,status,sent_at,recipient_member_id,sender_member_id,sender_name,recipient_name")
            .order("sent_at", { ascending: false })
            .limit(20),
        ),
      ];

      if (guidanceAllowed) {
        requests.push(
          Promise.resolve(
            supabase
              .from("public_requests")
              .select("id,status,kind,created_at")
              .order("created_at", { ascending: false })
              .limit(20),
          ),
          Promise.resolve(
            supabase
              .from("feedback_messages")
              .select("id,status,category,created_at")
              .in("category", ["استشارة فردية", "إحالة طالب", "إبلاغ سري"])
              .order("created_at", { ascending: false })
              .limit(20),
          ),
        );
      }

      const results = await Promise.all(requests);
      const handoffs = results[0];
      const publicRequests = guidanceAllowed ? results[1] : null;
      const feedback = guidanceAllowed ? results[2] : null;

      if (handoffs?.error) console.warn("[inbox] handoffs:", handoffs.error.message);
      if (publicRequests?.error) console.warn("[inbox] public requests:", publicRequests.error.message);
      if (feedback?.error) console.warn("[inbox] feedback:", feedback.error.message);

      const handoffRows = handoffs?.error ? [] : handoffs?.data ?? [];
      const administrative = handoffRows.filter(
        (item: any) =>
          (item.recipient_member_id === memberId && ["sent", "read"].includes(String(item.status))) ||
          (item.sender_member_id === memberId && item.status === "returned"),
      );

      const serviceRequests = publicRequests?.error
        ? []
        : (publicRequests?.data ?? []).filter((item: any) => item.status !== "مغلق");
      const serviceFeedback = feedback?.error
        ? []
        : (feedback?.data ?? []).filter(
            (item: any) => !["تم الرد", "محفوظ"].includes(String(item.status ?? "")),
          );

      return {
        guidanceAllowed,
        administrative,
        serviceRequests,
        serviceFeedback,
      };
    },
    staleTime: 20_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  const administrative = data?.administrative ?? [];
  const serviceRequests = data?.serviceRequests ?? [];
  const serviceFeedback = data?.serviceFeedback ?? [];
  const guidanceCount = serviceRequests.length + serviceFeedback.length;
  const total = guidanceCount + administrative.length;

  if (isError) {
    return (
      <div dir="rtl" className="mx-auto max-w-xl rounded-2xl border bg-card p-6 text-center">
        <p className="font-black">تعذر تحميل الوارد الموحد.</p>
        <button type="button" onClick={() => void refetch()} className="mt-3 rounded-xl bg-primary px-4 py-2 text-xs font-black text-primary-foreground">
          إعادة المحاولة
        </button>
      </div>
    );
  }

  return (
    <div dir="rtl" className="space-y-4">
      <section className="relative overflow-hidden rounded-3xl border border-primary/15 bg-card p-4 shadow-[var(--shadow-soft)] sm:p-5">
        <div aria-hidden="true" className="pointer-events-none absolute -left-12 -top-12 size-40 rounded-full bg-primary/8 blur-2xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-primary">
              <Inbox className="size-5" />
              <span className="text-xs font-black">مركز الوارد</span>
            </div>
            <h1 className="mt-1 text-xl font-black">كل ما يحتاج انتباهك في مكان واحد</h1>
            <p className="mt-1 text-xs leading-6 text-muted-foreground">
              طلبات المستفيدين والمراسلات الإدارية تظهر هنا كقائمة عمل، ثم تفتح الصفحة المختصة لإكمال الإجراء.
            </p>
          </div>
          <div className="rounded-xl bg-primary/10 px-4 py-2 text-center text-primary">
            <p className="text-2xl font-black">{isLoading ? "—" : total}</p>
            <p className="text-[10px] font-bold">تحتاج انتباه</p>
          </div>
        </div>
      </section>

      <div className="grid gap-3 lg:grid-cols-2">
        {data?.guidanceAllowed && (
          <Link to="/posts" className="rounded-3xl border bg-card p-4 shadow-[var(--shadow-card)] transition hover:border-primary/35">
            <div className="flex items-start justify-between gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <HeartHandshake className="size-5" />
              </span>
              <strong className="text-2xl">{isLoading ? "—" : guidanceCount}</strong>
            </div>
            <h2 className="mt-3 font-black">خدمات التوجيه الواردة</h2>
            <p className="mt-1 text-xs leading-6 text-muted-foreground">استشارات فردية، إحالات معلمين، بلاغات سرية وطلبات المدونة.</p>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-black text-primary">فتح الخدمات <ArrowLeft className="size-3.5" /></span>
          </Link>
        )}

        <Link to="/school-inbox" className="rounded-3xl border bg-card p-4 shadow-[var(--shadow-card)] transition hover:border-primary/35">
          <div className="flex items-start justify-between gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FileCheck2 className="size-5" />
            </span>
            <strong className="text-2xl">{isLoading ? "—" : administrative.length}</strong>
          </div>
          <h2 className="mt-3 font-black">المراسلات والاعتمادات</h2>
          <p className="mt-1 text-xs leading-6 text-muted-foreground">تقارير جديدة، تقارير قيد المراجعة أو تقارير أعيدت لك بملاحظة.</p>
          <span className="mt-3 inline-flex items-center gap-1 text-xs font-black text-primary">فتح المسار الإداري <ArrowLeft className="size-3.5" /></span>
        </Link>
      </div>

      {data?.guidanceAllowed && guidanceCount > 0 && (
        <section className="rounded-3xl border bg-card p-4 shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-2">
            <MessageSquareText className="size-4 text-primary" />
            <h2 className="text-sm font-black">الوارد من المستفيدين</h2>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {serviceRequests.slice(0, 4).map((item: any) => (
              <Link key={item.id} to="/posts" className="rounded-2xl border p-3 transition hover:border-primary/35 hover:bg-primary/[0.02]">
                <p className="text-[10px] font-black text-primary">{item.kind || "طلب خدمة"}</p>
                <p className="mt-1 text-xs font-bold">{item.status || "جديد"}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">{item.created_at ? new Date(item.created_at).toLocaleString("ar-SA") : ""}</p>
              </Link>
            ))}
            {serviceFeedback.slice(0, 4).map((item: any) => (
              <Link key={item.id} to="/posts" className="rounded-2xl border p-3 transition hover:border-primary/35 hover:bg-primary/[0.02]">
                <p className="flex items-center gap-1 text-[10px] font-black text-primary">
                  {item.category === "إبلاغ سري" && <ShieldAlert className="size-3" />}
                  {item.category || "رسالة"}
                </p>
                <p className="mt-1 text-xs font-bold">{item.status || "جديد"}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">{item.created_at ? new Date(item.created_at).toLocaleString("ar-SA") : ""}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {administrative.length > 0 && (
        <section className="rounded-3xl border bg-card p-4 shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-2">
            <FileCheck2 className="size-4 text-primary" />
            <h2 className="text-sm font-black">إجراءات إدارية قريبة</h2>
          </div>
          <div className="mt-3 space-y-2">
            {administrative.slice(0, 5).map((item: any) => (
              <Link key={item.id} to="/school-inbox" className="flex items-center justify-between gap-3 rounded-2xl border p-3 transition hover:border-primary/35 hover:bg-primary/[0.02]">
                <div className="min-w-0">
                  <p className="truncate text-xs font-black">{item.title || "تقرير إداري"}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {item.status === "returned" ? "معاد لك بملاحظة" : item.status === "read" ? "قيد المراجعة" : "وصل حديثًا"}
                  </p>
                </div>
                <ArrowLeft className="size-4 shrink-0 text-primary" />
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
