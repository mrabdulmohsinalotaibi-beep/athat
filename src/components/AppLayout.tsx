import { Link, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import {
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Users,
  X,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const navigation = [
  { to: "/dashboard", label: "الرئيسية", icon: LayoutDashboard },
  { to: "/students", label: "الطلاب", icon: Users },
  { to: "/programs", label: "البرامج", icon: ClipboardList },
  { to: "/reports", label: "التقارير", icon: FileText },
  { to: "/settings", label: "الإعدادات", icon: Settings },
] as const;

function isActive(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(route + "/");
}

export function AppLayout({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch (error) {
      console.warn("[auth] local sign out fallback:", error);
    } finally {
      window.location.replace("/auth");
    }
  }

  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b bg-[#3C3C3C] text-[#F1E9DD]">
        <div className="mx-auto flex min-h-16 w-full items-center justify-between gap-3 px-3 sm:px-5">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setOpen(true)}
              className="text-[#F1E9DD] hover:bg-white/10 hover:text-white lg:hidden"
              aria-label="فتح القائمة"
            >
              <Menu className="size-5" />
            </Button>
            <Link to="/dashboard" className="flex items-center gap-2 font-black">
              <img src="/brand-icon.svg?v=20260929f" alt="" className="size-10 rounded-xl" />
              <span>الذات</span>
            </Link>
          </div>

          <nav className="hidden items-center gap-1 lg:flex">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(pathname, item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={
                    "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm " +
                    (active ? "bg-white/15 font-black" : "hover:bg-white/10")
                  }
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void signOut()}
            className="text-[#F1E9DD] hover:bg-white/10 hover:text-white"
          >
            <LogOut className="size-4" />
            <span className="hidden sm:inline">خروج</span>
          </Button>
        </div>
      </header>

      {open && (
        <>
          <button
            type="button"
            aria-label="إغلاق القائمة"
            className="fixed inset-0 z-40 bg-black/35"
            onClick={() => setOpen(false)}
          />
          <aside className="fixed inset-y-0 right-0 z-50 w-72 border-l bg-card p-4 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <strong>التنقل</strong>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
                <X className="size-5" />
              </Button>
            </div>
            <nav className="space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const active = isActive(pathname, item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setOpen(false)}
                    className={
                      "flex items-center gap-3 rounded-xl px-3 py-3 text-sm " +
                      (active ? "bg-primary/10 font-black text-primary" : "hover:bg-muted")
                    }
                  >
                    <Icon className="size-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>
        </>
      )}

      <main className="mx-auto w-full max-w-[1600px] p-3 pb-24 sm:p-5 lg:pb-6">
        {children}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        {navigation.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={
                "flex min-h-16 flex-col items-center justify-center gap-1 text-[10px] font-bold " +
                (active ? "text-primary" : "text-muted-foreground")
              }
            >
              <Icon className="size-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
