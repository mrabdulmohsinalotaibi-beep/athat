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
  visibility: "primary" | "more";
  items: WorkspaceSectionItem[];
};

export const WORKSPACE_SECTIONS: WorkspaceSection[] = [
  {
    id: "students",
    title: "الطلاب والمتابعة",
    description: "ملفات الطلاب والحالات والمقابلات والحضور والسلوك والإحالات.",
    icon: Users,
    tone: "from-primary/15 to-primary/5",
    visibility: "primary",
    items: [
      { to: "/students", label: "سجل الطلاب", icon: Users },
      { to: "/cases", label: "الحالات الخاصة", icon: HeartHandshake },
      { to: "/interviews", label: "المقابلات والتواصل", icon: MessagesSquare },
      { to: "/attendance", label: "الحضور والمواظبة", icon: CalendarCheck },
      { to: "/behavior", label: "السلوك والمتابعة", icon: ShieldAlert },
      { to: "/referrals", label: "الإحالات", icon: Send },
    ],
  },
  {
    id: "planning",
    title: "الخطط والإنجاز",
    description: "الخطة والبرامج والتقويم واللجان والشواهد والتقارير.",
    icon: ClipboardList,
    tone: "from-amber-500/15 to-amber-500/5",
    visibility: "primary",
    items: [
      { to: "/plan", label: "الخطة التشغيلية", icon: ClipboardList },
      { to: "/programs", label: "البرامج والأنشطة", icon: Sparkles },
      { to: "/calendar", label: "التقويم والمتابعة", icon: CalendarDays },
      { to: "/committees", label: "اللجان والاجتماعات", icon: MessagesSquare },
      { to: "/evidences", label: "الشواهد والوثائق", icon: FolderCheck },
      { to: "/toolkit", label: "أدوات القياس والأرشيف", icon: FileText },
      { to: "/reports", label: "التقارير والإحصائيات", icon: FileText },
    ],
  },
  {
    id: "communication",
    title: "التواصل والتوعية",
    description: "الطلبات الواردة والرسائل والتوعية الأسبوعية والمحتوى المنشور.",
    icon: MessagesSquare,
    tone: "from-sky-500/15 to-sky-500/5",
    visibility: "primary",
    items: [
      { to: "/requests", label: "صندوق الطلبات", icon: Inbox },
      { to: "/messages", label: "الآراء والرسائل", icon: MessagesSquare },
      { to: "/weekly-poster", label: "التوجيه الأسبوعي", icon: Sparkles },
      { to: "/posts", label: "مدونة الموجه", icon: Newspaper },
    ],
  },
  {
    id: "more",
    title: "المزيد",
    description: "الربط مع مدرستي ونور وإدارة الملف الشخصي والإعدادات والاشتراك.",
    icon: Settings,
    tone: "from-violet-500/15 to-violet-500/5",
    visibility: "more",
    items: [
      { to: "/integrations", label: "مدرستي ونور", icon: Globe2 },
      { to: "/profile", label: "حسابي الشخصي", icon: Users },
      { to: "/settings", label: "الإعدادات", icon: Settings },
      { to: "/subscription", label: "الاشتراك والترقية", icon: Sparkles },
    ],
  },
];
