import type { LucideIcon } from "lucide-react";
import {
  CalendarDays,
  ClipboardList,
  FileText,
  FolderCheck,
  Globe2,
  HeartHandshake,
  Settings,
  Sparkles,
  Users,
  MoreHorizontal,
  CalendarCheck,
  ShieldAlert,
  ExternalLink,
  UsersRound,
  Wrench,
} from "lucide-react";

export type WorkspaceSectionItem = {
  to: string;
  label: string;
  icon: LucideIcon;
};

export type WorkspaceSection = {
  id: "students" | "sessions" | "programs" | "tools" | "settings";
  title: string;
  description: string;
  icon: LucideIcon;
  items: WorkspaceSectionItem[];
};

export const WORKSPACE_SECTIONS: WorkspaceSection[] = [
  {
    id: "students",
    title: "الطلاب",
    description: "السجل الأساسي للطلاب والحالات والمتابعة اليومية.",
    icon: Users,
    items: [
      { to: "/students", label: "سجل الطلاب", icon: Users },
      { to: "/cases", label: "الحالات والمتابعة", icon: HeartHandshake },
    ],
  },
  {
    id: "sessions",
    title: "الجلسات",
    description: "الجلسات الإرشادية ومواعيدها.",
    icon: CalendarDays,
    items: [
      { to: "/interviews", label: "الجلسات الإرشادية", icon: HeartHandshake },
      { to: "/calendar", label: "المواعيد", icon: CalendarDays },
    ],
  },
  {
    id: "programs",
    title: "البرامج",
    description: "ابدأ بالخطة، نفّذ البرنامج، أرفق الشاهد، ثم أخرج التقرير.",
    icon: ClipboardList,
    items: [
      { to: "/plan", label: "1. الخطة", icon: ClipboardList },
      { to: "/programs", label: "2. البرنامج والتنفيذ", icon: Sparkles },
      { to: "/evidences", label: "3. الشاهد", icon: FolderCheck },
      { to: "/reports", label: "4. التقرير", icon: FileText },
    ],
  },
  {
    id: "tools",
    title: "أدوات إضافية",
    description: "السجلات المساندة محفوظة هنا دون مزاحمة مسار العمل الأساسي.",
    icon: MoreHorizontal,
    items: [
      { to: "/attendance", label: "الحضور والمواظبة", icon: CalendarCheck },
      { to: "/behavior", label: "السلوك والمتابعة", icon: ShieldAlert },
      { to: "/referrals", label: "الإحالات", icon: ExternalLink },
      { to: "/committees", label: "اللجان والاجتماعات", icon: UsersRound },
      { to: "/toolkit", label: "النماذج والأدوات", icon: Wrench },
      { to: "/messages", label: "الآراء والرسائل", icon: HeartHandshake },
      { to: "/weekly-poster", label: "اللوحة الأسبوعية", icon: Sparkles },
      { to: "/posts", label: "مدونة الموجه والخدمات", icon: Globe2 },
    ],
  },
  {
    id: "settings",
    title: "الإدارة",
    description: "بيانات المدرسة والتكاملات الأساسية للمنصة.",
    icon: Settings,
    items: [
      { to: "/settings", label: "بيانات المدرسة", icon: Settings },
      { to: "/integrations", label: "التكاملات", icon: Globe2 },
    ],
  },
];
