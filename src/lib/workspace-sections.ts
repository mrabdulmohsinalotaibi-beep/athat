import type { LucideIcon } from "lucide-react";
import {
  Activity,
  CalendarCheck,
  CalendarDays,
  ClipboardList,
  ExternalLink,
  FileText,
  FolderCheck,
  Globe2,
  HeartHandshake,
  Inbox,
  MessageSquareText,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Users,
  UsersRound,
  Wrench,
} from "lucide-react";

export type WorkspaceSectionItem = {
  to: string;
  label: string;
  icon: LucideIcon;
};

export type WorkspaceSection = {
  id: "students" | "guidance" | "execution" | "communication" | "administration";
  title: string;
  description: string;
  icon: LucideIcon;
  items: WorkspaceSectionItem[];
};

// The sidebar follows the daily workflow rather than mirroring database tables:
// Today -> student -> guidance action -> execution/evidence -> communication -> administration.
export const WORKSPACE_SECTIONS: WorkspaceSection[] = [
  {
    id: "students",
    title: "الطلاب",
    description: "ابدأ من الطالب ثم افتح ملفه ومسار متابعته الكامل.",
    icon: Users,
    items: [
      { to: "/students", label: "الطلاب وملف 360°", icon: Users },
    ],
  },
  {
    id: "guidance",
    title: "الطلاب والمتابعة",
    description: "الحالات والمقابلات والإحالات والسلوك والمواظبة في مسار عمل موحد.",
    icon: HeartHandshake,
    items: [
      { to: "/cases", label: "الحالات والمتابعة", icon: HeartHandshake },
      { to: "/interviews", label: "المقابلات والاستشارات", icon: MessageSquareText },
      { to: "/referrals", label: "الإحالات والمتابعة", icon: ExternalLink },
      { to: "/attendance", label: "المواظبة", icon: CalendarCheck },
      { to: "/behavior", label: "السلوك", icon: ShieldAlert },
    ],
  },
  {
    id: "execution",
    title: "الخطة والتنفيذ",
    description: "الخطة ثم التنفيذ ثم الشاهد والتوثيق.",
    icon: ClipboardList,
    items: [
      { to: "/plan", label: "الخطة التشغيلية", icon: ClipboardList },
      { to: "/execution", label: "مسار التنفيذ", icon: ClipboardList },
      { to: "/programs", label: "البرامج والأنشطة", icon: Sparkles },
      { to: "/calendar", label: "التقويم والمواعيد", icon: CalendarDays },
      { to: "/evidences", label: "الشواهد والتوثيق", icon: FolderCheck },
    ],
  },
  {
    id: "communication",
    title: "المحتوى والخدمات",
    description: "الطلبات والرسائل والمدونة والمحتوى التوعوي في مكان واحد.",
    icon: Inbox,
    items: [
      { to: "/inbox", label: "الوارد الموحد", icon: Inbox },
      { to: "/posts", label: "المدونة والخدمات", icon: Globe2 },
      { to: "/messages", label: "الآراء والرسائل", icon: MessageSquareText },
      { to: "/weekly-poster", label: "اللوحة الأسبوعية", icon: Sparkles },
    ],
  },
  {
    id: "administration",
    title: "التقارير والإدارة",
    description: "التقارير والمهام والاعتمادات والفريق وإعدادات النظام.",
    icon: FileText,
    items: [
      { to: "/reports", label: "التقارير والإحصاءات", icon: FileText },
      { to: "/free-documents", label: "المستندات الحرة", icon: FileText },
      { to: "/school-inbox", label: "الاعتمادات والمراسلات", icon: ShieldCheck },
      { to: "/school-tasks", label: "المهام المدرسية", icon: ClipboardList },
      { to: "/school-team", label: "فريق المدرسة والصلاحيات", icon: UsersRound },
      { to: "/committees", label: "الاجتماعات واللجان", icon: UsersRound },
      { to: "/toolkit", label: "النماذج والأدوات", icon: Wrench },
      { to: "/settings", label: "بيانات المدرسة", icon: Settings },
      { to: "/integrations", label: "نور ومدرستي والتكاملات", icon: Globe2 },
      { to: "/trash", label: "حماية البيانات", icon: ShieldCheck },
      { to: "/health", label: "صحة النظام", icon: Activity },
    ],
  },
];
