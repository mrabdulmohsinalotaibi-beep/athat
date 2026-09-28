import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  CalendarCheck,
  CalendarDays,
  ClipboardList,
  FileText,
  FolderCheck,
  Globe2,
  HeartHandshake,
  Inbox,
  MessagesSquare,
  Newspaper,
  Send,
  Settings,
  ShieldAlert,
  Sparkles,
  Users,
} from "lucide-react";

type Section = {
  title: string;
  description: string;
  icon: typeof Users;
  tone: string;
  items: { to: string; label: string; icon: typeof Users }[];
};

const SECTIONS: Section[] = [
  {
    title: "السجلات الإرشادية",
    description: "كل ما يخص الطلاب والحالات والمتابعة اليومية في مكان واحد.",
    icon: Users,
    tone: "from-primary/15 to-primary/5",
    items: [
      { to: "/students", label: "سجل الطلاب", icon: Users },
      { to: "/cases", label: "الحالات الخاصة", icon: HeartHandshake },
      { to: "/interviews", label: "المقابلات والتواصل", icon: MessagesSquare },
      { to: "/attendance", label: "الحضور والمواظبة", icon: CalendarCheck },
      { to: "/behavior", label: "السلوك والمتابعة", icon: ShieldAlert },
      { to: "/referrals", label: "الإحالات", icon: Send },
      { to: "/requests", label: "صندوق الطلبات", icon: Inbox },
    ],
  },
  {
    title: "الخطط والبرامج",
    description: "خطتك التشغيلية وبرامجك وتقويمك ولجانك من لوحة واحدة.",
    icon: ClipboardList,
    tone: "from-amber-500/15 to-amber-500/5",
    items: [
      { to: "/plan", label: "الخطة التشغيلية", icon: ClipboardList },
      { to: "/programs", label: "البرامج والأنشطة", icon: Sparkles },
      { to: "/calendar", label: "التقويم والمتابعة", icon: CalendarDays },
      { to: "/committees", label: "اللجان والاجتماعات", icon: MessagesSquare },
    ],
  },
  {
    title: "التوثيق والتقارير",
    description: "الشواهد، أدوات القياس، الأرشيف والتقارير الرسمية.",
    icon: FolderCheck,
    tone: "from-emerald-500/15 to-emerald-500/5",
    items: [
      { to: "/evidences", label: "الشواهد والوثائق", icon: FolderCheck },
      { to: "/toolkit", label: "أدوات القياس والأرشيف", icon: FileText },
      { to: "/reports", label: "التقارير والإحصائيات", icon: FileText },
    ],
  },
  {
    title: "المحتوى والخدمات",
    description: "مدونة الموجه، التوجيه الأسبوعي، ومدرستي ونور.",
    icon: Newspaper,
    tone: "from-sky-500/15 to-sky-500/5",
    items: [
      { to: "/posts", label: "مدونة الموجه", icon: Newspaper },
      { to: "/weekly-poster", label: "التوجيه الأسبوعي", icon: Sparkles },
      { to: "/integrations", label: "مدرستي ونور", icon: Globe2 },
    ],
  },
  {
    title: "التواصل والحساب",
    description: "الرسائل، بيانات الحساب، الإعدادات والاشتراك.",
    icon: MessagesSquare,
    tone: "from-violet-500/15 to-violet-500/5",
    items: [
      { to: "/messages", label: "الآراء والرسائل", icon: MessagesSquare },
      { to: "/profile", label: "حسابي الشخصي", icon: Users },
      { to: "/settings", label: "الإعدادات", icon: Settings },
      { to: "/subscription", label: "الاشتراك والترقية", icon: Sparkles },
    ],
  },
];

export function WorkspaceSectionLauncher() {
  return (
    <section
      dir="rtl"
      className="dashboard-panel rounded-3xl border border-primary/15 bg-card p-5 shadow-sm sm:p-6"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="text-[11px] font-black tracking-wide text-primary">مركز الأقسام</span>
          <h2 className="mt-1 text-xl font-black">اختر القسم الذي تريد العمل عليه</h2>
          <p className="mt-1 text-xs leading-6 text-muted-foreground">
            تم جمع القوائم المتداخلة هنا لتصل إلى كل خدمة بضغطة واحدة.
          </p>
        </div>
        <Link
          to="/dashboard"
          className="hidden items-center gap-1 text-xs font-bold text-primary hover:underline sm:flex"
        >
          نظرة عامة <ArrowLeft className="size-3.5" />
        </Link>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <div
              key={section.title}
              className={`rounded-2xl border bg-gradient-to-br ${section.tone} p-4`}
            >
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-background/80 p-2.5 text-primary shadow-sm">
                  <Icon className="size-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-black">{section.title}</h3>
                  <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                    {section.description}
                  </p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {section.items.map((item) => {
                  const ItemIcon = item.icon;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className="group flex min-h-10 items-center gap-2 rounded-xl border border-border/70 bg-background/75 px-2.5 py-2 text-[11px] font-bold transition hover:-translate-y-0.5 hover:border-primary/40 hover:bg-background"
                    >
                      <ItemIcon className="size-3.5 shrink-0 text-primary" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
