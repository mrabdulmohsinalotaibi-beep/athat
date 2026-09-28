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
} from "lucide-react";

export type WorkspaceSectionItem = {
  to: string;
  label: string;
  icon: LucideIcon;
};

export type WorkspaceSection = {
  id: "students" | "sessions" | "programs" | "settings";
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
    description: "الخطة التشغيلية والبرامج والشواهد.",
    icon: ClipboardList,
    items: [
      { to: "/plan", label: "الخطة التشغيلية", icon: ClipboardList },
      { to: "/programs", label: "البرامج الإرشادية", icon: Sparkles },
      { to: "/evidences", label: "الشواهد والوثائق", icon: FolderCheck },
    ],
  },
  {
    id: "settings",
    title: "الإدارة",
    description: "التقارير وبيانات المدرسة والتكاملات.",
    icon: Settings,
    items: [
      { to: "/reports", label: "التقارير", icon: FileText },
      { to: "/settings", label: "بيانات المدرسة", icon: Settings },
      { to: "/integrations", label: "التكاملات", icon: Globe2 },
    ],
  },
];
