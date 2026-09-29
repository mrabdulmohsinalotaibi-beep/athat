import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  FileText,
  GraduationCap,
  HeartPulse,
  LockKeyhole,
  Megaphone,
  ShieldCheck,
  Sparkles,
  BriefcaseBusiness,
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
      { title: "مدونة الموجه الطلابي | منصة الذات" },
      {
        name: "description",
        content:
          "الصفحة العامة للموجه الطلابي: محتوى إرشادي، خدمات، استمارات وموارد للطلاب وأولياء الأمور والمعلمين.",
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

const SERVICE_ICONS = [GraduationCap, Brain, BriefcaseBusiness, HeartPulse];

function PublicCounselorBlogPage() {
  const { token } = Route.useParams();
  const { school: schoolFromLink, feedback } = Route.useSearch();
  const {
    data = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["public-counselor-blog", token],
    queryFn: async () => {
      const portal = await supabase.rpc(
        "get_private_counselor_portal",
        { p_token: token },
      );

      if (!portal.error) {
        return (portal.data ?? []) as BlogPortalRow[];
      }

      // Keep the current production blog available until the additive portal
      // migration is applied. The old RPC does not expose public_slug, so the
      // forms still work but cannot be school-bound until migration deployment.
      console.warn(
        "[counselor-blog] portal RPC unavailable, falling back:",
        portal.error.message,
      );
      const legacy = await supabase.rpc("get_private_counselor_blog", {
        p_token: token,
      });
      if (legacy.error) throw legacy.error;
      return (legacy.data ?? []).map((row) => ({
        ...row,
        public_slug: null,
      })) as BlogPortalRow[];
    },
  });
  const first = data[0];
  const posts = data.filter(
    (row): row is BlogPortalRow & { title: string; slug: string; created_at: string } =>
      Boolean(row.title && row.slug && row.created_at && (row.body?.trim() || row.cover_url)),
  );
  const articles = posts.filter((row) => row.kind === "article");
  const updates = posts.filter((row) => row.kind !== "article");
  const publicForms = [
    {
      to: "/forms/consultation" as const,
      title: "طلب استشارة فردية",
      audience: "طالب / ولي أمر",
      description: "اطلب مقابلة أو استشارة مع الموجه الطلابي بخصوص موضوع أكاديمي أو سلوكي أو نفسي أو مهني.",
      icon: HeartPulse,
    },
    {
      to: "/forms/report" as const,
      title: "إبلاغ سري",
      audience: "سري وآمن",
      description: "بلّغ بسرية عن تنمر أو مشكلة تمس سلامة الطالب، ويمكن الإبلاغ دون ذكر الاسم.",
      icon: ShieldCheck,
    },
  ];
  const effectiveSchoolSlug = first?.public_slug || schoolFromLink || "";
  const schoolSearch = {
    ...(effectiveSchoolSlug ? { school: effectiveSchoolSlug } : {}),
    portal: token,
    ...(feedback ? { feedback } : {}),
  };

  if (isLoading)
    return (
      <div
        dir="rtl"
        className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground"
      >
        جارٍ تجهيز الصفحة العامة للموجه…
      </div>
    );
  if (isError || !first)
    return (
      <div dir="rtl" className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md rounded-3xl border border-dashed p-12 text-center">
          <LockKeyhole className="mx-auto size-10 text-primary" />
          <h1 className="mt-4 text-2xl font-black">الصفحة غير متاحة</h1>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            الرابط غير صحيح أو لم ينشر الموجه محتوى عامًا بعد.
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-primary"
          >
            العودة للرئيسية <ArrowLeft className="size-4" />
          </Link>
        </div>
      </div>
    );

  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-8">
          <Link to="/" className="flex items-center gap-3">
            <img
              src="/brand-logo.svg"
              alt="شعار الذات"
              className="brand-mark-well size-11 rounded-xl object-contain"
            />
            <div>
              <p className="text-lg font-black text-primary">
                {first.school_name || "مدونة الموجه الطلابي"}
              </p>
              <p className="text-[10px] text-muted-foreground">
                الصفحة العامة للموجه ·{" "}
                {first.counselor_name || first.author_name || "الموجه الطلابي"}
              </p>
            </div>
          </Link>
          <div className="hidden items-center gap-2 sm:flex">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
              <Sparkles className="size-3.5" /> بوابة الإرشاد
            </span>
            <Link
              to="/auth"
              search={{ next: "/dashboard", mode: "signin" }}
              className="text-sm font-bold text-primary hover:underline"
            >
              دخول الموجه
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-border/60 bg-gradient-to-bl from-primary/12 via-background to-accent/15">
          <div className="absolute -left-20 -top-20 size-64 rounded-full border border-primary/10" />
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-8 sm:py-20 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div className="relative">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card px-3 py-1 text-xs font-bold text-primary">
                <Megaphone className="size-3.5" /> مدونة الموجه العامة
              </span>
              <h1 className="mt-5 max-w-3xl text-4xl font-black leading-tight tracking-tight sm:text-6xl">
                كل ما يحتاجه الطالب وولي الأمر والمعلم في مكان واحد.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-muted-foreground">
                محتوى الموجه، الخدمات الإرشادية، الاستمارات الإلكترونية والموارد المساعدة — مرتبة
                لتصل إلى الخدمة المناسبة بأقل خطوات.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <a
                  href="#services"
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground hover:bg-primary/90"
                >
                  استعرض الخدمات <ArrowLeft className="size-4" />
                </a>
                <a
                  href="#forms"
                  className="inline-flex h-11 items-center gap-2 rounded-xl border border-primary/25 bg-card px-5 text-sm font-bold text-primary hover:bg-primary/5"
                >
                  الاستمارات الإلكترونية
                </a>
              </div>
            </div>
            <div className="relative rounded-3xl border border-primary/15 bg-card/85 p-6 shadow-lg">
              <div className="flex items-center gap-3 border-b border-border/60 pb-4">
                <ShieldCheck className="size-5 text-primary" />
                <div>
                  <p className="text-sm font-black">بيانات المدرسة</p>
                  <p className="text-xs text-muted-foreground">{first.school_name || "المدرسة"}</p>
                </div>
              </div>
              <div className="mt-5 grid gap-3 text-sm">
                <p>
                  <span className="text-muted-foreground">الموجه الطلابي:</span>{" "}
                  <strong>{first.counselor_name || first.author_name || "—"}</strong>
                </p>
                <p>
                  <span className="text-muted-foreground">المحتوى المنشور:</span>{" "}
                  <strong>{posts.length} منشور</strong>
                </p>
                <p className="flex items-start gap-2 text-xs leading-6 text-muted-foreground">
                  <LockKeyhole className="mt-1 size-3.5 shrink-0 text-primary" />
                  المحتوى المنشور عام، أما سجلات الطلاب والطلبات فتبقى ضمن لوحة الموجه السرية.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section
          id="services"
          className="mx-auto max-w-7xl scroll-mt-24 px-4 py-14 sm:px-8 sm:py-20"
        >
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-primary">خدمات عامة</p>
              <h2 className="mt-1 text-3xl font-black">الخدمات الإرشادية</h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
                مجالات الدعم التي يقدمها الموجه الطلابي للطلاب وأولياء الأمور والمعلمين.
              </p>
            </div>
            <Link to="/services" className="text-sm font-bold text-primary hover:underline">
              صفحة الخدمات الكاملة
            </Link>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {GUIDANCE_SERVICES.map((service, index) => {
              const Icon = SERVICE_ICONS[index] ?? GraduationCap;
              return (
                <article
                  key={service.slug}
                  className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >
                  <span className="inline-flex rounded-xl bg-primary/10 p-3 text-primary">
                    <Icon className="size-5" />
                  </span>
                  <h3 className="mt-4 font-black">{service.title}</h3>
                  <p className="mt-2 text-xs leading-6 text-muted-foreground">{service.summary}</p>
                  <ul className="mt-4 space-y-2 border-t border-border/60 pt-4 text-xs leading-5">
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

        <section id="forms" className="scroll-mt-24 border-y border-border/60 bg-muted/20">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-8 sm:py-20">
            <p className="text-sm font-bold text-primary">وصول مباشر</p>
            <h2 className="mt-1 text-3xl font-black">الاستمارات الإلكترونية</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {publicForms.map((form) => {
                const Icon = form.icon;
                return (
                  <Link
                    key={form.to}
                    to={form.to}
                    search={schoolSearch}
                    className="group rounded-2xl border border-border/70 bg-card p-5 shadow-sm transition hover:-translate-y-1 hover:border-primary/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="rounded-xl bg-primary/10 p-2.5 text-primary">
                        <Icon className="size-5" />
                      </span>
                      <span className="rounded-full bg-accent/25 px-2.5 py-1 text-[11px] font-bold text-accent-foreground">
                        {form.audience}
                      </span>
                    </div>
                    <h3 className="mt-4 font-black">{form.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">{form.description}</p>
                    <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-primary">
                      فتح الاستمارة <ArrowLeft className="size-4 transition group-hover:-translate-x-1" />
                    </span>
                  </Link>
                );
              })}
            </div>
            <p className="mt-5 rounded-xl border border-dashed bg-card/60 p-4 text-xs leading-6 text-muted-foreground">
              إحالة الطالب للمعلمين تتم من رابط خاص يرسله الموجه الطلابي للهيئة التعليمية، ولا يظهر في الصفحة العامة.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-8 sm:py-20">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-primary">إرشادات وموارد</p>
              <h2 className="mt-1 text-3xl font-black">مكتبة الموجه والطالب</h2>
            </div>
            <BookOpen className="size-7 text-primary/50" />
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
                {link.title}
                <ExternalLink className="size-3.5" />
              </a>
            ))}
          </div>
        </section>

        <PublicContentSection
          eyebrow="آخر التحديثات"
          title="المنشورات والإعلانات"
          count={updates.length}
          items={updates}
        />

        <PublicContentSection
          eyebrow="محتوى إرشادي"
          title="المقالات"
          count={articles.length}
          items={articles}
          alternate
        />
      </main>
      <footer className="border-t border-border/60 px-4 py-8 text-center text-xs text-muted-foreground">
        مدونة الموجه الطلابي · منصة الذات للتوجيه والإرشاد
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
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-8 sm:py-20">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-primary">{eyebrow}</p>
            <h2 className="mt-1 text-3xl font-black">{title}</h2>
          </div>
          <span className="text-xs text-muted-foreground">{count} منشور</span>
        </div>

        {items.length === 0 ? (
          <p className="mt-8 rounded-2xl border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
            لا يوجد محتوى منشور في هذا القسم حتى الآن.
          </p>
        ) : (
          <div className="mt-8 space-y-5">
            {items.map((post) => {
              const imageOnly = Boolean(post.cover_url && !post.body?.trim() && !post.excerpt?.trim());

              return (
                <article
                  key={`${post.slug}-${post.created_at}`}
                  className="overflow-hidden rounded-3xl border bg-card shadow-sm"
                >
                  {imageOnly ? (
                    <div>
                      <img
                        src={post.cover_url ?? ""}
                        alt={post.title}
                        className="max-h-[900px] w-full bg-muted/20 object-contain"
                      />
                      <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-xs text-muted-foreground sm:px-6">
                        <span className="rounded-full bg-primary/10 px-2.5 py-1 font-bold text-primary">
                          {POST_KINDS[post.kind as PostKind] ?? "منشور"}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="size-3.5" />
                          {formatHijriDate(post.published_at ?? post.created_at)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {post.cover_url ? (
                        <div className="bg-muted/15 p-2 sm:p-4">
                          <img
                            src={post.cover_url}
                            alt={post.title}
                            className="mx-auto max-h-[1000px] w-full rounded-2xl object-contain"
                          />
                        </div>
                      ) : (
                        <div className="flex min-h-56 items-center justify-center bg-primary/5">
                          <FileText className="size-12 text-primary/30" />
                        </div>
                      )}
                      <div className="p-6 sm:p-8">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span className="rounded-full bg-primary/10 px-2.5 py-1 font-bold text-primary">
                            {POST_KINDS[post.kind as PostKind] ?? "منشور"}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays className="size-3.5" />
                            {formatHijriDate(post.published_at ?? post.created_at)}
                          </span>
                        </div>
                        <h3 className="mt-4 text-2xl font-black">{post.title}</h3>
                        {post.excerpt && (
                          <p className="mt-3 border-r-4 border-primary pr-4 text-sm font-bold leading-7 text-muted-foreground">
                            {post.excerpt}
                          </p>
                        )}
                        {post.body?.trim() && (
                          <div className="mt-4 whitespace-pre-line text-sm leading-8">{post.body}</div>
                        )}
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
