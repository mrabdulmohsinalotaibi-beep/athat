import type { LucideIcon } from "lucide-react";
import {
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

export type WorkspaceSectionItem = {
  to: string;
  label: string;
  icon: LucideIcon;
};

export type WorkspaceSection = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  tone: string;
  items: WorkspaceSectionItem[];
};

export const WORKSPACE_SECTIONS: WorkspaceSection[] = [
  {
    id: "records",
    title: "الطلاب والحالات",
    description: "سجلات الطلاب والحالات والحضور والسلوك والإحالات والمتابعة اليومية.",
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
    id: "planning",
    title: "الخطط والبرامج",
    description: "الخطة التشغيلية والبرامج والأنشطة والتقويم واللجان.",
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
    id: "records-and-reports",
    title: "التوثيق والتقارير",
    description: "الشواهد والوثائق وأدوات القياس والأرشيف والتقارير الرسمية.",
    icon: FolderCheck,
    tone: "from-emerald-500/15 to-emerald-500/5",
    items: [
      { to: "/evidences", label: "الشواهد والوثائق", icon: FolderCheck },
      { to: "/toolkit", label: "أدوات القياس والأرشيف", icon: FileText },
      { to: "/reports", label: "التقارير والإحصائيات", icon: FileText },
    ],
  },
  {
    id: "publishing",
    title: "النشر والخدمات",
    description: "مدونة الموجه والتوجيه الأسبوعي وربط منصتي مدرستي ونور.",
    icon: Newspaper,
    tone: "from-sky-500/15 to-sky-500/5",
    items: [
      { to: "/posts", label: "مدونة الموجه", icon: Newspaper },
      { to: "/weekly-poster", label: "التوجيه الأسبوعي", icon: Sparkles },
      { to: "/integrations", label: "مدرستي ونور", icon: Globe2 },
    ],
  },
  {
    id: "account",
    title: "التواصل والحساب",
    description: "الرسائل وبيانات الحساب والإعدادات والاشتراك.",
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
