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
  Home,
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
  const weeklyPost = updates[0] ?? articles[0] ?? null;

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
    <div dir="rtl" className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-[#176678] bg-[#073B4C] text-white shadow-sm">
        <div className="mx-auto grid max-w-7xl grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-center gap-3 px-4 py-3 sm:px-8">
          <Link
            to="/"
            aria-label="الانتقال إلى الصفحة الرئيسية لمنصة ذات"
            title="الرئيسية"
            className="order-3 grid size-10 place-items-center justify-self-start rounded-xl border border-white/15 bg-white/10 text-white transition hover:bg-white/15"
          >
            <Home className="size-4.5" />
          </Link>

          <div className="order-2 flex min-w-0 items-center justify-center gap-3 text-center">
            <img
              src={profile?.logo_url || "/brand-icon.svg?v=20261001e"}
              alt="شعار بوابة التوجيه الطلابي"
              className="size-10 shrink-0 rounded-xl bg-white/95 object-contain p-1"
            />
            <div className="min-w-0">
              <p className="truncate text-base font-black text-white sm:text-lg">بوابة التوجيه الطلابي</p>
              <p className="truncate text-[10px] text-[#C7E4E1]">{schoolName} · {counselorName}</p>
            </div>
          </div>

          <Link
            to="/request-status"
            aria-label="تتبع طلب"
            title="تتبع طلب"
            className="order-1 grid size-10 place-items-center justify-self-end rounded-xl border border-white/15 bg-white/10 text-white transition hover:bg-white/15"
          >
            <Search className="size-4" />
          </Link>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-border/60 bg-gradient-to-bl from-primary/12 via-background to-accent/15">
          <div className="absolute -left-20 -top-20 size-64 rounded-full border border-primary/10" />
          <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:px-8 sm:py-16 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div className="relative">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card px-3 py-1 text-xs font-bold text-primary">
                <Sparkles className="size-3.5" /> بوابة التوجيه الطلابي
              </span>
              <h1 className="mt-5 max-w-3xl text-3xl font-black leading-tight tracking-tight sm:text-5xl">
                الموجه الطلابي أقرب إليك.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base sm:leading-8">
                اختر صفتك للوصول مباشرة إلى الخدمة المناسبة، أو تابع محتوى وبرامج التوجيه الطلابي في المدرسة.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <a
                  href="#my-services"
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground"
                >
                  ابدأ الآن <ArrowLeft className="size-4" />
                </a>
                <Link
                  to="/request-status"
                  className="inline-flex h-11 items-center gap-2 rounded-xl border border-primary/25 bg-card px-5 text-sm font-bold text-primary"
                >
                  <Search className="size-4" /> تتبع طلب سابق
                </Link>
              </div>
            </div>

            <aside className="rounded-3xl border border-primary/15 bg-card/90 p-5 shadow-lg sm:p-6">
              <div className="flex items-center gap-3 border-b pb-4">
                <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                  <UserRound className="size-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">الموجه الطلابي</p>
                  <p className="font-black">{counselorName}</p>
                </div>
              </div>
              <div className="mt-4 grid gap-3 text-sm">
                <p><span className="text-muted-foreground">المدرسة:</span> <strong>{schoolName}</strong></p>
                {profile?.office_hours && (
                  <p><span className="text-muted-foreground">أوقات التواصل:</span> <strong>{profile.office_hours}</strong></p>
                )}
                <p className="flex items-start gap-2 rounded-xl bg-primary/5 p-3 text-xs leading-6 text-muted-foreground">
                  <LockKeyhole className="mt-1 size-3.5 shrink-0 text-primary" />
                  الطلبات وسجلات الطلاب لا تظهر في هذه الصفحة العامة، وتصل مباشرة إلى مساحة الموجه الخاصة.
                </p>
              </div>
            </aside>
          </div>
        </section>

        <section id="my-services" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-10 sm:px-8 sm:py-14">
          <div className="text-center">
            <p className="text-xs font-black text-primary">اختر صفتك</p>
            <h2 className="mt-1 text-2xl font-black sm:text-3xl">كيف يمكنني مساعدتك؟</h2>
          </div>
          <div className="mx-auto mt-6 grid max-w-4xl gap-3 sm:grid-cols-3">
            {AUDIENCES.map((item) => {
              const Icon = item.icon;
              const active = audience === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setAudience(item.key)}
                  className={
                    "rounded-2xl border p-4 text-right transition " +
                    (active
                      ? "border-primary bg-primary text-primary-foreground shadow-md"
                      : "border-border bg-card hover:border-primary/35")
                  }
                >
                  <Icon className="size-5" />
                  <p className="mt-3 font-black">{item.label}</p>
                  <p className={"mt-1 text-xs leading-5 " + (active ? "text-primary-foreground/80" : "text-muted-foreground")}>
                    {item.description}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="mx-auto mt-5 grid max-w-4xl gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {audienceActions.map((action) => {
              const Icon = action.icon;
              return (
                <a
                  key={action.title}
                  href={action.href}
                  className="group rounded-2xl border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40"
                >
                  <span className="inline-flex rounded-xl bg-primary/10 p-2.5 text-primary">
                    <Icon className="size-5" />
                  </span>
                  <h3 className="mt-4 font-black">{action.title}</h3>
                  <p className="mt-2 text-xs leading-6 text-muted-foreground">{action.description}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-xs font-black text-primary">
                    فتح الخدمة <ArrowLeft className="size-3.5 transition group-hover:-translate-x-1" />
                  </span>
                </a>
              );
            })}
          </div>
        </section>

        <section className="border-y border-border/60 bg-muted/20">
          <div className="mx-auto grid max-w-7xl gap-5 px-4 py-10 sm:px-8 lg:grid-cols-[1.25fr_0.75fr]">
            <article className="rounded-3xl border border-primary/20 bg-card p-5 shadow-sm sm:p-6">
              <div className="flex items-center gap-2 text-primary">
                <Megaphone className="size-5" />
                <p className="text-xs font-black">هذا الأسبوع</p>
              </div>
              <h2 className="mt-3 text-xl font-black">رسالة التوجيه الطلابي</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{weeklyMessage}</p>
              {weeklyPost && (
                <a href="#updates" className="mt-5 inline-flex items-center gap-2 text-xs font-black text-primary">
                  مشاهدة أحدث المحتوى <ArrowLeft className="size-3.5" />
                </a>
              )}
            </article>
            <article className="rounded-3xl border bg-card p-5 sm:p-6">
              <CalendarClock className="size-5 text-primary" />
              <h2 className="mt-3 font-black">تحتاج مقابلة الموجه؟</h2>
              <p className="mt-2 text-xs leading-6 text-muted-foreground">
                أرسل طلب الاستشارة وحدد الوقت المفضل، وسيصل الطلب مباشرة إلى الموجه الطلابي.
              </p>
              <a
                href={formHref("/forms/consultation")}
                className="mt-5 inline-flex rounded-xl bg-primary px-4 py-2.5 text-xs font-black text-primary-foreground"
              >
                طلب موعد
              </a>
            </article>
          </div>
        </section>

        <section id="services" className="mx-auto max-w-7xl px-4 py-12 sm:px-8 sm:py-16">
          <div>
            <p className="text-sm font-bold text-primary">مجالات الدعم</p>
            <h2 className="mt-1 text-2xl font-black sm:text-3xl">خدمات التوجيه الطلابي</h2>
          </div>
          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {GUIDANCE_SERVICES.map((service, index) => {
              const Icon = SERVICE_ICONS[index] ?? GraduationCap;
              return (
                <article key={service.slug} className="rounded-2xl border bg-card p-5 shadow-sm">
                  <span className="inline-flex rounded-xl bg-primary/10 p-3 text-primary"><Icon className="size-5" /></span>
                  <h3 className="mt-4 font-black">{service.title}</h3>
                  <p className="mt-2 text-xs leading-6 text-muted-foreground">{service.summary}</p>
                  <ul className="mt-4 space-y-2 border-t pt-4 text-xs leading-5">
                    {service.items.slice(0, 3).map((item) => (
                      <li key={item} className="flex gap-2">
                        <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-primary" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>
        </section>

        <section className="border-y border-border/60 bg-muted/20">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-8 sm:py-16">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-primary">مكتبة رقمية</p>
                <h2 className="mt-1 text-2xl font-black sm:text-3xl">موارد للطالب والأسرة والمعلم</h2>
              </div>
              <BookOpen className="size-7 text-primary/50" />
            </div>
            <div className="mt-7 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {GUIDANCE_LEAFLETS.map((leaflet) => (
                <article key={leaflet.title} className="rounded-2xl border bg-card p-5">
                  <span className="text-[11px] font-bold text-primary">{leaflet.category}</span>
                  <h3 className="mt-2 font-black">{leaflet.title}</h3>
                  <p className="mt-2 text-xs leading-6 text-muted-foreground">{leaflet.summary}</p>
                  <ul className="mt-4 space-y-2 text-xs leading-5 text-muted-foreground">
                    {leaflet.points.slice(0, 2).map((point) => (
                      <li key={point} className="flex gap-2">
                        <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-primary" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              {GUIDANCE_LINKS.map((link) => (
                <a
                  key={link.title}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-2 rounded-xl border bg-card px-4 py-3 text-xs font-bold hover:border-primary/40 hover:text-primary"
                >
                  {link.title}<ExternalLink className="size-3.5" />
                </a>
              ))}
            </div>
          </div>
        </section>

        <div id="updates">
          <PublicContentSection eyebrow="آخر التحديثات" title="المنشورات والإعلانات" count={updates.length} items={updates} />
        </div>
        <PublicContentSection eyebrow="محتوى توجيهي" title="المقالات" count={articles.length} items={articles} alternate />
      </main>

      <footer className="border-t border-border/60 px-4 py-8 text-center text-xs text-muted-foreground">
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
}: {
  eyebrow: string;
  title: string;
  count: number;
  items: Array<BlogPortalRow & { title: string; slug: string; created_at: string }>;
  alternate?: boolean;
}) {
  return (
    <section className={alternate ? "border-t border-border/60 bg-background" : "border-t border-border/60 bg-muted/20"}>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-8 sm:py-16">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-primary">{eyebrow}</p>
            <h2 className="mt-1 text-2xl font-black sm:text-3xl">{title}</h2>
          </div>
          <span className="text-xs text-muted-foreground">{count} منشور</span>
        </div>

        {items.length === 0 ? (
          <p className="mt-8 rounded-2xl border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
            لا يوجد محتوى منشور في هذا القسم حتى الآن.
          </p>
        ) : (
          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            {items.map((post) => {
              const imageOnly = Boolean(post.cover_url && !post.body?.trim() && !post.excerpt?.trim());
              return (
                <article key={`${post.slug}-${post.created_at}`} className="overflow-hidden rounded-3xl border bg-card shadow-sm">
                  {post.cover_url ? (
                    <div className="bg-muted/15 p-2 sm:p-3">
                      <img
                        src={post.cover_url}
                        alt={post.title}
                        className={"mx-auto w-full rounded-2xl object-contain " + (imageOnly ? "max-h-[720px]" : "max-h-[520px]")}
                      />
                    </div>
                  ) : (
                    <div className="flex min-h-44 items-center justify-center bg-primary/5">
                      <FileText className="size-10 text-primary/30" />
                    </div>
                  )}
                  <div className="p-5 sm:p-6">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="rounded-full bg-primary/10 px-2.5 py-1 font-bold text-primary">
                        {POST_KINDS[post.kind as PostKind] ?? "منشور"}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="size-3.5" />
                        {formatHijriDate(post.published_at ?? post.created_at)}
                      </span>
                    </div>
                    {!imageOnly && (
                      <>
                        <h3 className="mt-4 text-xl font-black">{post.title}</h3>
                        {post.excerpt && <p className="mt-2 text-sm font-bold leading-7 text-muted-foreground">{post.excerpt}</p>}
                        {post.body?.trim() && <p className="mt-3 line-clamp-4 whitespace-pre-line text-sm leading-7">{post.body}</p>}
                      </>
                    )}
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <Link
                        to="/posts/$slug"
                        params={{ slug: post.slug }}
                        className="inline-flex items-center gap-1 text-xs font-black text-primary"
                      >
                        فتح المنشور <ArrowLeft className="size-3.5" />
                      </Link>
                      <a
                        href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                          `${post.title}\n\n${typeof window !== "undefined" ? window.location.origin : "https://athat.app"}/posts/${encodeURIComponent(post.slug)}\n\nمن الذات`,
                        )}`}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-bold text-primary transition hover:bg-primary/5"
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
