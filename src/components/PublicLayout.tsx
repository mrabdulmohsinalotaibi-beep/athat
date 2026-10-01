import { type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { BookOpen, FileText, Home, LogIn, MessageCircle } from "lucide-react";

import { Copyright } from "@/components/Copyright";
import { useGuidanceProfile } from "@/lib/guidance";
import { cn } from "@/lib/utils";
import { useGlobalAppSettings, type FeatureKey } from "@/lib/admin";

const NAV = [
  { to: "/", label: "الرئيسية" },
  { to: "/about", label: "عن التوجيه الطلابي" },
  { to: "/services", label: "خدمات التوجيه الطلابي" },
  { to: "/resources", label: "مكتبة التوجيه الطلابي" },
  { to: "/forms", label: "الاستمارات" },
  { to: "/contact", label: "تواصل معنا" },
] as const;

export function PublicLayout({
  children,
  title,
  subtitle,
  schoolSlug,
}: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  schoolSlug?: string | undefined;
}) {
  const { data: profile } = useGuidanceProfile(schoolSlug);
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { data: globalSettings } = useGlobalAppSettings();

  const publicFeatureByPath: Record<string, FeatureKey> = {
    "/": "public_home",
    "/about": "public_about",
    "/services": "public_services",
    "/resources": "public_resources",
    "/forms": "public_forms",
    "/contact": "public_contact",
  };

  const isPublicRouteVisible = (route: string) => {
    const key = publicFeatureByPath[route];
    return !key || globalSettings?.feature_flags?.[key] !== false;
  };

  const visibleNav = NAV.filter((item) => isPublicRouteVisible(item.to));
  const currentPublicFeature = publicFeatureByPath[pathname];
  const currentPublicHidden =
    currentPublicFeature && globalSettings?.feature_flags?.[currentPublicFeature] === false;

  return (
    <div dir="rtl" className="app-screen public-screen flex min-h-screen flex-col bg-background text-foreground">
      {pathname !== "/" && <header className="athat-site-header sticky top-0 z-50 border-b border-[#176678] bg-[#073B4C] text-white backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-8">
          <Link to="/" className="flex items-center gap-3" aria-label="العودة إلى الرئيسية">
            <img
              src="/brand-logo.png?v=20261001-brand5"
              alt="شعار الذات"
              className="size-11 rounded-lg bg-[var(--brand-mark-surface)] object-contain"
            />
            <div>
              <p className="text-lg font-black text-white sm:text-xl">الذات</p>
              <p className="text-[10px] font-medium text-[#C7E4E1] sm:text-xs">
                {profile?.school_name
                  ? `التوجيه الطلابي · ${profile.school_name}`
                  : "نظام التوجيه الطلابي"}
              </p>
            </div>
          </Link>

          <nav
            className="hidden items-center gap-5 text-sm font-semibold text-[#DDF1EF] lg:flex"
            aria-label="التنقل الرئيسي"
          >
            {visibleNav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "rounded-md px-2 py-2 transition-colors hover:bg-muted hover:text-primary",
                  pathname === item.to && "bg-secondary text-primary",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

        </div>

      </header>}

      {title && (
        <section className="border-b border-border/60 bg-secondary/40">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-8 sm:py-10">
            <h1 className="text-3xl font-black sm:text-4xl">{title}</h1>
            {subtitle && (
              <p className="mt-3 max-w-3xl text-sm leading-8 text-muted-foreground sm:text-base">
                {subtitle}
              </p>
            )}
          </div>
        </section>
      )}

      <main className={cn("flex-1", pathname !== "/" && "pb-20 lg:pb-0")}>
        {globalSettings?.maintenance_mode ? (
          <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-8">
            <div className="rounded-3xl border border-amber-500/20 bg-card p-8 shadow-sm">
              <h1 className="text-2xl font-black">المنصة تحت الصيانة</h1>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                نعمل حاليًا على تحديث الذات. يرجى المحاولة لاحقًا.
              </p>
            </div>
          </div>
        ) : currentPublicHidden ? (
          <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-8">
            <div className="rounded-3xl border bg-card p-8 shadow-sm">
              <h1 className="text-2xl font-black">الصفحة غير متاحة حاليًا</h1>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                تم إخفاء هذه الصفحة مؤقتًا من إدارة المنصة.
              </p>
            </div>
          </div>
        ) : (
          children
        )}
      </main>

      {pathname !== "/" && <nav className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-border bg-card/95 px-2 pb-[env(safe-area-inset-bottom)] shadow-lg backdrop-blur-xl lg:hidden" aria-label="التنقل السريع">
        {[
          { to: "/" as const, label: "الرئيسية", icon: Home },
          { to: "/services" as const, label: "الخدمات", icon: BookOpen },
          { to: "/forms" as const, label: "الاستمارات", icon: FileText },
          { to: "/contact" as const, label: "التواصل", icon: MessageCircle },
          { to: "/auth" as const, label: "حسابي", icon: LogIn },
        ].filter((item) => item.to === "/auth" || isPublicRouteVisible(item.to)).map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to} {...(to === "/auth" ? { search: { next: "/dashboard" } } : {})} className={cn("flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold text-muted-foreground", pathname === to && "text-primary")}>
            <Icon className="size-5" aria-hidden="true" />
            <span>{label}</span>
          </Link>
        ))}
      </nav>}

      {pathname === "/" ? null : (
        <footer className="border-t border-border/60 bg-card">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-8 lg:grid-cols-3">
            <div>
              <p className="text-lg font-black text-primary">الذات</p>
              <p className="mt-2 text-xs leading-7 text-muted-foreground">
                نظام التوجيه الطلابي لخدمة الطالب والأسرة والمدرسة: صفحات تعريفية، استمارات تفاعلية، ولوحة
                عمل خاصة بالموجه الطلابي.
              </p>
            </div>
            <div>
              <p className="text-sm font-bold">روابط سريعة</p>
              <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
                {visibleNav.slice(1).map((item) => (
                  <li key={item.to}>
                    <Link to={item.to} className="transition-colors hover:text-primary">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-sm font-bold">بيانات التواصل</p>
              <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
                <li>{profile?.school_name || "اسم المدرسة"}</li>
                <li>{profile?.education_dept || "إدارة التعليم"}</li>
                {profile?.contact_phone && <li>هاتف: {profile.contact_phone}</li>}
                {profile?.contact_email && <li>بريد: {profile.contact_email}</li>}
                {profile?.office_hours && <li>أوقات المقابلات: {profile.office_hours}</li>}
              </ul>
            </div>
          </div>
          <div className="border-t border-border/60 px-4 py-4 text-center sm:px-8">
            <Copyright />
          </div>
        </footer>
      )}
    </div>
  );
}
