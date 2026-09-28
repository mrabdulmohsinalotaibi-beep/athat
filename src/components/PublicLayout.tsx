import { useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { BookOpen, FileText, Home, LogIn, Menu, MessageCircle, X } from "lucide-react";

import { Copyright } from "@/components/Copyright";
import { Button } from "@/components/ui/button";
import { useGuidanceProfile } from "@/lib/guidance";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "الرئيسية" },
  { to: "/about", label: "عن التوجيه الطلابي" },
  { to: "/services", label: "الخدمات الإرشادية" },
  { to: "/resources", label: "المكتبة الإرشادية" },
  { to: "/forms", label: "الاستمارات" },
  { to: "/contact", label: "تواصل معنا" },
] as const;

export function PublicLayout({
  children,
  title,
  subtitle,
}: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: profile } = useGuidanceProfile();
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <div dir="rtl" className="app-screen public-screen flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-card/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-8">
          <Link to="/" className="flex items-center gap-3" aria-label="العودة إلى الرئيسية">
            <img
              src="/brand-logo.png"
              alt="شعار الذات"
              className="brand-mark-well size-11 rounded-lg object-contain"
            />
            <div>
              <p className="text-lg font-black text-primary sm:text-xl">الذات</p>
              <p className="text-[10px] font-medium text-muted-foreground sm:text-xs">
                {profile?.school_name
                  ? `التوجيه الطلابي · ${profile.school_name}`
                  : "نظام الإرشاد المدرسي"}
              </p>
            </div>
          </Link>

          <nav
            className="hidden items-center gap-5 text-sm font-semibold text-muted-foreground lg:flex"
            aria-label="التنقل الرئيسي"
          >
            {NAV.map((item) => (
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

          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="outline"
              size="icon"
              className="h-9 w-9 font-semibold sm:w-auto sm:px-3"
            >
              <Link
                to="/auth"
                search={{ next: "/dashboard" }}
                aria-label="دخول الموجه الطلابي"
                title="دخول الموجه الطلابي"
              >
                <LogIn className="size-4 shrink-0" aria-hidden="true" />
                <span className="hidden sm:inline">دخول الموجه الطلابي</span>
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              aria-label={menuOpen ? "إغلاق القائمة" : "فتح القائمة"}
              onClick={() => setMenuOpen((value) => !value)}
            >
              {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </Button>
          </div>
        </div>

        {menuOpen && (
          <nav
            className="border-t border-border/60 bg-background px-4 py-3 lg:hidden"
            aria-label="قائمة الجوال"
          >
            <ul className="space-y-1 text-sm font-semibold">
              {NAV.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                    "block rounded-md px-3 py-2 hover:bg-muted",
                      pathname === item.to && "bg-primary/10 text-primary",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  to="/auth"
                  search={{ next: "/dashboard" }}
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-lg px-3 py-2 text-primary hover:bg-muted"
                >
                  دخول الموجه الطلابي
                </Link>
              </li>
            </ul>
          </nav>
        )}
      </header>

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

      <main className="flex-1 pb-20 lg:pb-0">{children}</main>

      <nav className="no-print fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-border bg-card/95 px-2 pb-[env(safe-area-inset-bottom)] shadow-lg backdrop-blur-xl lg:hidden" aria-label="التنقل السريع">
        {[
          { to: "/" as const, label: "الرئيسية", icon: Home },
          { to: "/services" as const, label: "الخدمات", icon: BookOpen },
          { to: "/forms" as const, label: "الاستمارات", icon: FileText },
          { to: "/contact" as const, label: "التواصل", icon: MessageCircle },
          { to: "/auth" as const, label: "حسابي", icon: LogIn },
        ].map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to} {...(to === "/auth" ? { search: { next: "/dashboard" } } : {})} className={cn("flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold text-muted-foreground", pathname === to && "text-primary")}>
            <Icon className="size-5" aria-hidden="true" />
            <span>{label}</span>
          </Link>
        ))}
      </nav>

      <footer className="border-t border-border/60 bg-card">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-8 lg:grid-cols-3">
          <div>
            <p className="text-lg font-black text-primary">الذات</p>
            <p className="mt-2 text-xs leading-7 text-muted-foreground">
              نظام الإرشاد المدرسي لخدمات التوجيه الطلابي: صفحات تعريفية، استمارات تفاعلية، ولوحة
              عمل خاصة بالموجه الطلابي.
            </p>
          </div>
          <div>
            <p className="text-sm font-bold">روابط سريعة</p>
            <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
              {NAV.slice(1).map((item) => (
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
    </div>
  );
}
