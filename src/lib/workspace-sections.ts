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
  disabled?: boolean;
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
    title: "الطلاب",
    description: "ملفات الطلاب والحالات والمواظبة والسلوك والإحالات الواردة.",
    icon: Users,
    tone: "from-primary/15 to-primary/5",
    visibility: "primary",
    items: [
      { to: "/students", label: "سجل الطلاب", icon: Users },
      { to: "/cases", label: "الحالات الخاصة", icon: HeartHandshake },
      { to: "/attendance", label: "الحضور والمواظبة", icon: CalendarCheck },
      { to: "/behavior", label: "السجل السلوكي", icon: ShieldAlert },
      { to: "/referrals", label: "الإحالات", icon: Send },
      { to: "/requests", label: "الطلبات الواردة", icon: Inbox },
    ],
  },
  {
    id: "sessions",
    title: "الجلسات",
    description: "تسجيل الجلسات، مواعيدها، والتواصل المرتبط بها.",
    icon: CalendarDays,
    tone: "from-sky-500/15 to-sky-500/5",
    visibility: "primary",
    items: [
      { to: "/interviews", label: "الجلسات الإرشادية", icon: MessagesSquare },
      { to: "/calendar", label: "جدول المواعيد", icon: CalendarDays },
      { to: "/messages", label: "الرسائل والتواصل", icon: Inbox },
    ],
  },
  {
    id: "programs",
    title: "البرامج والخطط",
    description: "الخطة التشغيلية والبرامج واللجان والشواهد والتوعية.",
    icon: ClipboardList,
    tone: "from-amber-500/15 to-amber-500/5",
    visibility: "primary",
    items: [
      { to: "/plan", label: "الخطة التشغيلية", icon: ClipboardList },
      { to: "/programs", label: "البرامج الإرشادية", icon: Sparkles },
      { to: "/programs", label: "النشاط الطلابي — قريبًا", icon: Sparkles, disabled: true },
      { to: "/committees", label: "اللجان والاجتماعات", icon: MessagesSquare },
      { to: "/evidences", label: "الشواهد والوثائق", icon: FolderCheck },
      { to: "/weekly-poster", label: "التوجيه الأسبوعي", icon: Sparkles },
      { to: "/posts", label: "مدونة الموجه", icon: Newspaper },
    ],
  },
  {
    id: "settings",
    title: "الإعدادات",
    description: "البيانات الرسمية والتقارير والقوالب والتكاملات والحساب.",
    icon: Settings,
    tone: "from-violet-500/15 to-violet-500/5",
    visibility: "primary",
    items: [
      { to: "/settings", label: "بيانات المدرسة", icon: Settings },
      { to: "/reports", label: "التقارير الرسمية", icon: FileText },
      { to: "/toolkit", label: "القوالب وأدوات القياس", icon: FileText },
      { to: "/integrations", label: "نور ومدرستي", icon: Globe2 },
      { to: "/profile", label: "حسابي الشخصي", icon: Users },
      { to: "/subscription", label: "الاشتراك", icon: Sparkles },
    ],
  },
];
