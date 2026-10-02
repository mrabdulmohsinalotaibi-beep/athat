import { useMemo, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  BookOpen,
  BriefcaseBusiness,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  FileText,
  GraduationCap,
  HeartHandshake,
  HeartPulse,
  LockKeyhole,
  Megaphone,
  Share2,
  MessageCircleQuestion,
  School,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
  UsersRound,
  Brain,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { formatHijriDate } from "@/lib/date";
import { GUIDANCE_LEAFLETS, GUIDANCE_LINKS, GUIDANCE_SERVICES } from "@/lib/guidance";
import { POST_KINDS, type PostKind } from "@/lib/posts";

export const Route = createFileRoute("/blog/$token")({
  validateSearch: (search: Record<string, unknown>): { school?: string; feedback?: string } => {
    const school = typeof search["school"] === "string" ? search["school"] : "";
    const feedback = typeof search["feedback"] === "string" ? search["feedback"] : "";
    return {
      ...(school ? { school } : {}),
      ...(feedback ? { feedback } : {}),
    };
  },
  head: () => ({
    meta: [
      { title: "بوابة الموجه الطلابي | الذات" },
      {
        name: "description",
        content:
          "البوابة الرقمية للموجه الطلابي: خدمات للطلاب وأولياء الأمور والمعلمين، طلبات إلكترونية، محتوى وموارد التوجيه الطلابي.",
      },
    ],
  }),
  component: PublicCounselorBlogPage,
});

type BlogPortalRow = {
  school_name: string | null;
  counselor_name: string | null;
  public_slug: string | null;
  title: string | null;
  kind: string | null;
  excerpt: string | null;
  body: string | null;
  cover_url: string | null;
  author_name: string | null;
  published_at: string | null;
  created_at: string | null;
  slug: string | null;
};

type GuidanceProfile = {
  school_name: string | null;
  education_dept: string | null;
  counselor_name: string | null;
  logo_url: string | null;
  vision: string | null;
  mission: string | null;
  announcement: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  office_hours: string | null;
  requests_enabled: boolean | null;
};

type Audience = "student" | "parent" | "teacher";

const SERVICE_ICONS = [GraduationCap, Brain, BriefcaseBusiness, HeartPulse];

const AUDIENCES: Array<{
  key: Audience;
  label: string;
  description: string;
  icon: typeof UserRound;
}> = [
  {
    key: "student",
    label: "أنا طالب",
    description: "استشارة، موعد، دعم وموارد",
    icon: GraduationCap,
  },
  {
    key: "parent",
    label: "أنا ولي أمر",
    description: "تواصل ومتابعة واستشارة",
    icon: UsersRound,
  },
  {
    key: "teacher",
    label: "أنا معلم",
    description: "إحالة طالب والتواصل مع الموجه",
    icon: School,
  },
];

function PublicCounselorBlogPage() {
  const { token } = Route.useParams();
  const { school: schoolFromLink, feedback } = Route.useSearch();
  const [audience, setAudience] = useState<Audience>("student");
  const [section, setSection] = useState<"home" | "posts" | "articles" | "services">("home");
  const [searchTerm, setSearchTerm] = useState("");
  const [kindFilter, setKindFilter] = useState("all");
  const [contributionOpen, setContributionOpen] = useState(false);
  const [contributionSent, setContributionSent] = useState(false);
  const [contributionSaving, setContributionSaving] = useState(false);
  const [contribution, setContribution] = useState({ name: "", role: "", title: "", body: "" });

  const {
    data = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["public-counselor-blog", token],
    queryFn: async () => {
      const portal = await supabase.rpc("get_private_counselor_portal", { p_token: token });
      if (!portal.error) return (portal.data ?? []) as BlogPortalRow[];

      console.warn("[counselor-blog] portal RPC unavailable, falling back:", portal.error.message);
      const legacy = await supabase.rpc("get_private_counselor_blog", { p_token: token });
      if (legacy.error) throw legacy.error;
      return (legacy.data ?? []).map((row) => ({ ...row, public_slug: null })) as BlogPortalRow[];
    },
  });

  const first = data[0];
  const effectiveSchoolSlug = first?.public_slug || schoolFromLink || "";

  const { data: profile } = useQuery({
    queryKey: ["public-guidance-profile", effectiveSchoolSlug],
    enabled: Boolean(effectiveSchoolSlug),
    queryFn: async () => {
      const { data: rows, error } = await (supabase as any).rpc("get_guidance_profile", {
        p_slug: effectiveSchoolSlug,
      });
      if (error) throw error;
      return (Array.isArray(rows) ? rows[0] : null) as GuidanceProfile | null;
    },
  });

  const posts = data.filter(
    (row): row is BlogPortalRow & { title: string; slug: string; created_at: string } =>
      Boolean(row.title && row.slug && row.created_at && (row.body?.trim() || row.cover_url)),
  );
  const articles = posts.filter((row) => row.kind === "article");
  const updates = posts.filter((row) => row.kind !== "article");
  const dailyPosts = [...updates, ...articles].sort((a, b) =>
    new Date(b.published_at ?? b.created_at).getTime() - new Date(a.published_at ?? a.created_at).getTime(),
  );
  const weeklyPost = dailyPosts[0] ?? null;
  const filteredPosts = useMemo(() => {
    const source = section === "articles" ? articles : section === "posts" ? updates : dailyPosts;
    const q = searchTerm.trim().toLowerCase();
    return source.filter((post) => {
      const matchesKind = kindFilter === "all" || post.kind === kindFilter;
      const haystack = [post.title, post.excerpt, post.body, post.author_name].filter(Boolean).join(" ").toLowerCase();
      return matchesKind && (!q || haystack.includes(q));
    });
  }, [articles, dailyPosts, kindFilter, searchTerm, section]);

  const formParams = useMemo(() => {
    const params = new URLSearchParams();
    if (effectiveSchoolSlug) params.set("school", effectiveSchoolSlug);
    params.set("portal", token);
    if (feedback) params.set("feedback", feedback);
    return params.toString();
  }, [effectiveSchoolSlug, feedback, token]);

  const formHref = (path: string) => `${path}?${formParams}`;

  const audienceActions = useMemo(() => {
    const common = {
      consultation: {
        title: "طلب استشارة",
        description: "أرسل موضوعك للموجه الطلابي بسرية.",
        href: formHref("/forms/consultation"),
        icon: MessageCircleQuestion,
      },
      appointment: {
        title: "حجز موعد",
        description: "حدد الوقت المناسب لك وسيصل الطلب للموجه.",
        href: formHref("/forms/consultation"),
        icon: CalendarClock,
      },
      report: {
        title: "إبلاغ سري",
        description: "للبلاغات التي تمس سلامة الطالب أو التنمر.",
        href: formHref("/forms/report"),
        icon: ShieldCheck,
      },
      referral: {
        title: "إحالة طالب",
        description: "إحالة مهنية من المعلم إلى التوجيه الطلابي.",
        href: formHref("/forms/referral"),
        icon: HeartHandshake,
      },
      feedback: {
        title: "رأيك ومقترحك",
        description: "أرسل ملاحظة أو مقترحًا لتحسين خدمات التوجيه الطلابي.",
        href: feedback ? `/feedback/${feedback}` : "",
        icon: Megaphone,
      },
    };

    const withFeedback = (items: Array<(typeof common)["consultation"]>) =>
      feedback ? [...items, common.feedback] : items;

    if (audience === "teacher") return withFeedback([common.referral, common.consultation]);
    if (audience === "parent") return withFeedback([common.consultation, common.appointment, common.report]);
    return withFeedback([common.consultation, common.appointment, common.report]);
  }, [audience, formParams]);

  if (isLoading) {
    return (
      <div dir="rtl" className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        جارٍ تجهيز بوابة الموجه…
      </div>
    );
  }

  if (isError || !first) {
    return (
      <div dir="rtl" className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md rounded-3xl border border-dashed p-12 text-center">
          <LockKeyhole className="mx-auto size-10 text-primary" />
          <h1 className="mt-4 text-2xl font-black">البوابة غير متاحة</h1>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            الرابط غير صحيح أو لم ينشر الموجه محتوى عامًا بعد.
          </p>
          <Link to="/" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-primary">
            العودة للرئيسية <ArrowLeft className="size-4" />
          </Link>
        </div>
      </div>
    );
  }

  const schoolName = profile?.school_name || first.school_name || "المدرسة";
  const counselorName = profile?.counselor_name || first.counselor_name || first.author_name || "الموجه الطلابي";
  const weeklyMessage =
    profile?.announcement?.trim() ||
    weeklyPost?.excerpt?.trim() ||
    weeklyPost?.title ||
    "تابع آخر برامج ورسائل التوجيه الطلابي من خلال هذه البوابة.";

  return (
    <div dir="rtl" className="public-portal public-blog min-h-screen bg-[#F8F5EF] text-[#264938]">
      <header className="sticky top-0 z-40 border-b border-[#D9C0A3]/45 bg-[#FFFDF9]/95 text-foreground shadow-sm backdrop-blur-xl">
        <div className="mx-auto grid max-w-4xl grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] items-center gap-2 px-3 py-2 sm:px-5">
          <button
            type="button"
            onClick={() => window.history.length > 1 ? window.history.back() : window.location.assign("/")}
            aria-label="رجوع"
            title="رجوع"
            className="order-3 grid size-9 place-items-center justify-self-start rounded-xl border border-[#D9C0A3]/35 bg-[#FFFDF9] text-primary transition hover:border-[#89AA74] hover:bg-[#E4ECDF]/70"
          >
            <ArrowLeft className="size-4.5 rotate-180" />
          </button>

          <div className="order-2 flex min-w-0 items-center justify-center gap-3 text-center">
            <img
              src={profile?.logo_url || "/athat-logo-final.png?v=20261002-final"}
              alt="شعار بوابة التوجيه الطلابي"
              className="size-9 shrink-0 rounded-xl bg-[var(--brand-mark-surface)] object-contain p-1 shadow-sm"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-navy sm:text-base">بوابة التوجيه الطلابي</p>
              <p className="truncate text-[10px] text-muted-foreground">{schoolName} · {counselorName}</p>
            </div>
          </div>

          <Link
            to="/request-status"
            aria-label="تتبع طلب"
            title="تتبع طلب"
            className="order-1 grid size-9 place-items-center justify-self-end rounded-xl border border-[#D9C0A3]/35 bg-[#FFFDF9] text-primary transition hover:border-[#89AA74] hover:bg-[#E4ECDF]/70"
          >
            <Search className="size-4" />
          </Link>
        </div>
      </header>

      <main className="pb-8">
        <section className="border-b border-[#D9C0A3]/45 bg-gradient-to-bl from-[#E4ECDF]/85 via-[#F8F5EF] to-[#F1E5E8]/75">
          <div className="mx-auto max-w-4xl px-3 py-4 sm:px-5 sm:py-5">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-black text-primary">الصفحة الإعلامية اليومية</p>
                <h1 className="mt-0.5 text-xl font-black sm:text-2xl">مدونة الموجه الطلابي</h1>
                <p className="mt-1 line-clamp-2 text-xs leading-6 text-muted-foreground">{weeklyMessage}</p>
              </div>
              <Megaphone className="size-7 shrink-0 text-[#9A6C78]" />
            </div>
            <nav className="mt-3 grid grid-cols-4 gap-1 rounded-xl border border-[#D9C0A3]/45 bg-[#FFFDF9]/90 p-1" aria-label="أقسام المدونة">
              {([
                ["home", "الرئيسية"],
                ["posts", "المنشورات"],
                ["articles", "المقالات"],
                ["services", "الخدمات"],
              ] as const).map(([key, label]) => (
                <button key={key} type="button" onClick={() => setSection(key)} className={"rounded-lg px-1.5 py-2 text-[11px] font-black transition " + (section === key ? "bg-[#264938] text-white shadow-sm" : "text-[#264938] hover:bg-[#E4ECDF]/65")}>{label}</button>
              ))}
            </nav>
          </div>
        </section>

        {section !== "services" && (
        <section id="daily-feed" className="mx-auto max-w-4xl scroll-mt-20 px-3 py-4 sm:px-5">
          {section === "home" && weeklyPost && (
            <div className="mb-4 rounded-2xl border border-[#D9C0A3]/55 bg-gradient-to-l from-[#F4E8D9] to-[#E4ECDF] p-3 shadow-sm">
              <div className="flex items-center gap-2"><Sparkles className="size-4 text-[#4A141F]" /><span className="text-[10px] font-black text-[#4A141F]">محتوى مميز</span></div>
              <h2 className="mt-1.5 line-clamp-1 text-sm font-black">{weeklyPost.title}</h2>
              <Link to="/posts/$slug" params={{ slug: weeklyPost.slug }} search={{ portal: token }} className="mt-2 inline-flex items-center gap-1 text-[11px] font-black text-[#264938]">اقرأ الآن <ArrowLeft className="size-3" /></Link>
            </div>
          )}
          <div className="mb-3 flex items-center gap-2 rounded-xl border border-[#D9C0A3]/45 bg-[#FFFDF9] px-3 py-2">
            <Search className="size-4 shrink-0 text-[#9A6C78]" />
            <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="ابحث في المدونة…" className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground" />
          </div>
          <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1">
            {[["all","الكل"],["article","مقالات"],["announcement","إعلانات"],["tip","إرشادي"],["news","أخبار"]].map(([key,label]) => (
              <button key={key} type="button" onClick={() => setKindFilter(key!)} className={"shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black " + (kindFilter === key ? "border-[#4A141F] bg-[#4A141F] text-white" : "border-[#D9C0A3]/55 bg-[#FFFDF9]")}>{label}</button>
            ))}
          </div>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-black text-primary">اليوميات</p>
              <h2 className="text-lg font-black">{section === "articles" ? "المقالات" : section === "posts" ? "المنشورات" : "أحدث المحتوى"}</h2>
            </div>
            <span className="rounded-full bg-muted px-3 py-1 text-[11px] text-muted-foreground">{filteredPosts.length} عنصر</span>
          </div>
          <PublicContentSection eyebrow="" title="" count={filteredPosts.length} items={filteredPosts} compact />
        </section>
        )}

        {section === "home" && (
        <section className="mx-auto max-w-4xl px-3 pb-4 sm:px-5">
          <div className="rounded-2xl border border-[#D9C0A3]/45 bg-[#FFFDF9] p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="rounded-xl bg-[#E4ECDF] p-2.5 text-[#264938]"><FileText className="size-5" /></span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black text-primary">مساحة المجتمع المدرسي</p>
                <h2 className="mt-0.5 text-base font-black">اكتب باسمك وصفتك</h2>
                <p className="mt-1 text-xs leading-6 text-muted-foreground">يمكن للطالب وولي الأمر والمعلم إرسال كتابة للنشر. لن تظهر في الصفحة إلا بعد موافقة الموجه الطلابي، وعند اعتمادها يظهر اسم الكاتب وصفته.</p>
              </div>
            </div>
            {!contributionOpen ? (
              <button type="button" onClick={() => setContributionOpen(true)} className="mt-3 w-full rounded-xl bg-[#264938] px-3 py-2.5 text-xs font-black text-white">كتابة مشاركة</button>
            ) : contributionSent ? (
              <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-800">تم استلام مشاركتك. ستظهر في المدونة بعد موافقة الموجه الطلابي.</div>
            ) : (
              <form className="mt-4 space-y-3" onSubmit={async (event) => {
                event.preventDefault();
                setContributionSaving(true);
                // PostgREST resolves overloaded RPCs by the exact argument signature.
                // Keep the payload keys sorted to match the deployed function signature
                // and avoid stale schema-cache mismatches.
                const result = await (supabase as any).rpc("submit_counselor_contribution", {
                  p_author_name: contribution.name,
                  p_author_role: contribution.role,
                  p_body: contribution.body,
                  p_title: contribution.title,
                  p_token: token,
                });
                setContributionSaving(false);
                if (result.error) { window.alert(result.error.message); return; }
                setContributionSent(true);
              }}>
                <div className="grid grid-cols-2 gap-2">
                  <input required minLength={2} value={contribution.name} onChange={(e) => setContribution({ ...contribution, name: e.target.value })} placeholder="الاسم" className="h-11 min-w-0 rounded-xl border bg-background px-3 text-sm" />
                  <input required minLength={2} value={contribution.role} onChange={(e) => setContribution({ ...contribution, role: e.target.value })} placeholder="الصفة" className="h-11 min-w-0 rounded-xl border bg-background px-3 text-sm" />
                </div>
                <input required minLength={3} value={contribution.title} onChange={(e) => setContribution({ ...contribution, title: e.target.value })} placeholder="عنوان المشاركة" className="h-11 w-full rounded-xl border bg-background px-3 text-sm" />
                <textarea required minLength={10} rows={4} value={contribution.body} onChange={(e) => setContribution({ ...contribution, body: e.target.value })} placeholder="اكتب مشاركتك…" className="w-full rounded-xl border bg-background p-3 text-sm leading-6" />
                <div className="flex gap-2">
                  <button disabled={contributionSaving} className="flex-1 rounded-xl bg-primary py-3 text-sm font-black text-primary-foreground">{contributionSaving ? "جارٍ الإرسال…" : "إرسال للموافقة"}</button>
                  <button type="button" onClick={() => setContributionOpen(false)} className="rounded-xl border px-4 text-sm font-bold">إلغاء</button>
                </div>
              </form>
            )}
          </div>
        </section>
        )}

        {(section === "home" || section === "services") && (
        <section id="contact" className="border-t border-[#D9C0A3]/40 bg-[#F1E5E8]/35">
          <div className="mx-auto max-w-4xl px-3 py-5 sm:px-5">
            <div className="mb-4">
              <p className="text-[11px] font-black text-primary">التواصل والخدمات</p>
              <h2 className="text-lg font-black">تواصل مع الموجه الطلابي</h2>
              <p className="mt-1 text-xs leading-6 text-muted-foreground">اختر صفتك ثم الخدمة المناسبة. الطلبات تصل إلى مساحة الموجه الخاصة ولا تظهر في المدونة.</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {AUDIENCES.map((item) => {
                const Icon = item.icon;
                const active = audience === item.key;
                return <button key={item.key} type="button" onClick={() => setAudience(item.key)} className={"rounded-xl border p-2.5 text-center transition " + (active ? "border-[#264938] bg-[#264938] text-white shadow-sm" : "border-[#D9C0A3]/45 bg-[#FFFDF9] hover:bg-[#E4ECDF]/55")}>
                  <Icon className="mx-auto size-5" /><p className="mt-2 text-xs font-black">{item.label.replace("أنا ", "")}</p>
                </button>;
              })}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {audienceActions.map((action) => {
                const Icon = action.icon;
                return <a key={action.title} href={action.href} className="rounded-xl border border-[#D9C0A3]/45 bg-[#FFFDF9] p-3 shadow-sm transition hover:border-[#89AA74]">
                  <Icon className="size-4.5 text-[#4A141F]" /><p className="mt-1.5 text-xs font-black">{action.title}</p><p className="mt-1 line-clamp-2 text-[11px] leading-5 text-muted-foreground">{action.description}</p>
                </a>;
              })}
            </div>
            {profile?.office_hours && (
              <div className="mt-3 rounded-xl border border-[#D9C0A3]/45 bg-[#FFFDF9] p-3 text-[11px] leading-6">
                {profile?.office_hours && <p><strong>أوقات التواصل:</strong> {profile.office_hours}</p>}
                {profile?.contact_phone && <p><strong>الهاتف:</strong> {profile.contact_phone}</p>}
                {profile?.contact_email && <p><strong>البريد:</strong> {profile.contact_email}</p>}
              </div>
            )}
          </div>
        </section>
        )}
      </main>

      <footer className="border-t border-[#D9C0A3]/40 bg-[#FFFDF9] px-4 py-5 text-center text-[11px] text-muted-foreground">
        <p className="font-bold text-foreground">{schoolName}</p>
        <p className="mt-1">بوابة الموجه الطلابي · الذات | ATHAT</p>
      </footer>
    </div>
  );
}

function PublicContentSection({
  eyebrow,
  title,
  count,
  items,
  alternate = false,
  compact = false,
}: {
  eyebrow: string;
  title: string;
  count: number;
  items: Array<BlogPortalRow & { title: string; slug: string; created_at: string }>;
  alternate?: boolean;
  compact?: boolean;
}) {
  return (
    <section className={compact ? "" : (alternate ? "border-t border-border/60 bg-background" : "border-t border-border/60 bg-muted/20")}>
      <div className={compact ? "" : "mx-auto max-w-7xl px-4 py-12 sm:px-8 sm:py-16"}>
        {!compact && <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-primary">{eyebrow}</p>
            <h2 className="mt-1 text-2xl font-black sm:text-3xl">{title}</h2>
          </div>
          <span className="text-xs text-muted-foreground">{count} منشور</span>
        </div>}

        {items.length === 0 ? (
          <p className="mt-8 rounded-2xl border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
            لا يوجد محتوى منشور في هذا القسم حتى الآن.
          </p>
        ) : (
          <div className={compact ? "grid grid-cols-2 gap-2 sm:grid-cols-3" : "mt-8 grid gap-5 lg:grid-cols-2"}>
            {items.map((post) => {
              const imageOnly = Boolean(post.cover_url && !post.body?.trim() && !post.excerpt?.trim());
              return (
                <article key={`${post.slug}-${post.created_at}`} className={compact ? "group overflow-hidden rounded-xl border border-[#D9C0A3]/45 bg-[#FFFDF9] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md" : "overflow-hidden rounded-3xl border border-[#D9C0A3]/35 bg-[#FFFDF9] shadow-sm"}>
                  {post.cover_url ? (
                    <div className="bg-[#F4ECE3]/45 p-1.5 sm:p-2">
                      <img
                        src={post.cover_url}
                        alt={post.title}
                        className={"mx-auto w-full rounded-lg object-cover " + (compact ? "aspect-[16/9] max-h-32" : (imageOnly ? "max-h-[520px]" : "max-h-[300px]"))}
                      />
                    </div>
                  ) : (
                    <div className={compact ? "flex aspect-[16/9] items-center justify-center bg-[#E4ECDF]/70" : "flex min-h-28 items-center justify-center bg-[#E4ECDF]/70"}>
                      <FileText className="size-8 text-[#264938]/30" />
                    </div>
                  )}
                  <div className={compact ? "p-2.5" : "p-3.5 sm:p-4"}>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="rounded-full bg-[#E4ECDF] px-2.5 py-1 font-bold text-primary">
                        {POST_KINDS[post.kind as PostKind] ?? "منشور"}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="size-3.5" />
                        {formatHijriDate(post.published_at ?? post.created_at)}
                      </span>
                    </div>
                    {!imageOnly && (
                      <>
                        <h3 className={compact ? "mt-2 line-clamp-2 text-sm font-black leading-5" : "mt-2.5 text-base font-black sm:text-lg"}>{post.title}</h3>
                        {post.excerpt && !compact && <p className="mt-1.5 text-xs font-bold leading-6 text-muted-foreground">{post.excerpt}</p>}
                        {post.body?.trim() && !compact && <p className="mt-2 line-clamp-3 whitespace-pre-line text-xs leading-6">{post.body}</p>}
                      </>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Link
                        to="/posts/$slug"
                        params={{ slug: post.slug }}
                        search={typeof window !== "undefined" && window.location.pathname.split("/blog/")[1]?.split("?")[0] ? { portal: window.location.pathname.split("/blog/")[1]!.split("?")[0]! } : {}}
                        className="inline-flex items-center gap-1 text-[11px] font-black text-[#4A141F]"
                      >
                        {compact ? "عرض كامل" : "فتح المنشور"} <ArrowLeft className="size-3.5" />
                      </Link>
                      <a
                        href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                          `${post.title}\n\n${typeof window !== "undefined" ? `${window.location.origin}/posts/${encodeURIComponent(post.slug)}?portal=${encodeURIComponent(window.location.pathname.split("/blog/")[1]?.split("?")[0] || "")}` : "https://athat.app"}\n\nمن الذات`,
                        )}`}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-bold text-primary transition hover:bg-[#E4ECDF]/70"
                        aria-label={`مشاركة ${post.title} عبر واتساب`}
                      >
                        <Share2 className="size-5" />
                        مشاركة
                      </a>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
