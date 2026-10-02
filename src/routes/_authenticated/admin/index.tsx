import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  RefreshCw,
  Save,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DEFAULT_FEATURE_FLAGS,
  type FeatureFlags,
  type FeatureKey,
  useAdminStatus,
  useGlobalAppSettings,
} from "@/lib/admin";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "إدارة الذات | ATHAT" },
      {
        name: "description",
        content: "لوحة مالك المنصة للتحكم العام في الخصائص والظهور لجميع المشتركين.",
      },
    ],
  }),
  component: OwnerAdminPage,
});

const FEATURE_GROUPS: Array<{
  title: string;
  description: string;
  items: Array<{ key: FeatureKey; label: string; description: string }>;
}> = [
  {
    title: "مساحة العمل",
    description: "الصفحات الأساسية التي تظهر لجميع حسابات الموجهين.",
    items: [
      { key: "dashboard", label: "لوحة التحكم", description: "الرئيسية الداخلية للمشتركين." },
      { key: "students", label: "سجل الطلاب", description: "بيانات الطلاب والملفات الأساسية." },
      { key: "cases", label: "الحالات والمتابعة", description: "إدارة الحالات والخطط العلاجية." },
      { key: "interviews", label: "المقابلات الطلابية", description: "الجلسات والمقابلات." },
      { key: "calendar", label: "المواعيد", description: "تقويم المواعيد والجلسات." },
    ],
  },
  {
    title: "الخطة والبرامج والتوثيق",
    description: "عناصر دورة العمل الرسمية للموجه الطلابي.",
    items: [
      { key: "plan", label: "الخطة التشغيلية", description: "مهام الخطة ومتابعة التنفيذ." },
      { key: "programs", label: "البرامج والأنشطة", description: "إدارة البرامج والتنفيذ." },
      { key: "evidences", label: "الشواهد", description: "رفع الأدلة والتوثيق." },
      { key: "reports", label: "التقارير", description: "التقارير والطباعة والتصدير." },
    ],
  },
  {
    title: "السجلات والأدوات",
    description: "السجلات المساندة والخدمات الإضافية.",
    items: [
      { key: "attendance", label: "الحضور والمواظبة", description: "سجل الحضور والمتابعة." },
      { key: "behavior", label: "السلوك", description: "السلوك والإجراءات العلاجية." },
      { key: "referrals", label: "الإحالات", description: "إحالات الطلاب ومتابعتها." },
      { key: "committees", label: "اللجان والاجتماعات", description: "المحاضر واللجان." },
      { key: "toolkit", label: "النماذج والأدوات", description: "الأدوات والنماذج المهنية." },
      { key: "messages", label: "الآراء والرسائل", description: "صندوق الرسائل والمستفيدين." },
      { key: "weekly_poster", label: "اللوحة الأسبوعية", description: "اللوحة والإرشاد الأسبوعي." },
      { key: "posts", label: "مدونة الموجه والخدمات", description: "المقالات والمنشورات والخدمات." },
      { key: "integrations", label: "التكاملات", description: "التكاملات والخدمات الخارجية." },
      { key: "settings", label: "إعدادات المدرسة", description: "بيانات المدرسة والكليشة." },
      { key: "profile", label: "الملف الشخصي", description: "ملف المستخدم وبياناته المهنية." },
    ],
  },
  {
    title: "الموقع العام",
    description: "تحكم في صفحات الزوار العامة.",
    items: [
      { key: "public_home", label: "الصفحة الرئيسية العامة", description: "واجهة الزائر الرئيسية." },
      { key: "public_about", label: "عن التوجيه", description: "صفحة التعريف بالتوجيه." },
      { key: "public_services", label: "الخدمات", description: "صفحة خدمات التوجيه الطلابي." },
      { key: "public_resources", label: "المكتبة", description: "مكتبة ومواد التوجيه الطلابي." },
      { key: "public_forms", label: "الاستمارات", description: "الاستمارات العامة." },
      { key: "public_contact", label: "التواصل", description: "صفحة التواصل." },
    ],
  },
];

function OwnerAdminPage() {
  const queryClient = useQueryClient();
  const { data: admin, isLoading: adminLoading } = useAdminStatus();
  const { data: settings, isLoading: settingsLoading, refetch } = useGlobalAppSettings();

  const [siteName, setSiteName] = useState("الذات");
  const [announcement, setAnnouncement] = useState("");
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [flags, setFlags] = useState<FeatureFlags>({ ...DEFAULT_FEATURE_FLAGS });

  useEffect(() => {
    if (!settings) return;
    setSiteName(settings.site_name || "الذات");
    setAnnouncement(settings.announcement || "");
    setMaintenanceMode(settings.maintenance_mode);
    setFlags(settings.feature_flags);
  }, [settings]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any)
        .from("global_app_settings")
        .update({
          site_name: siteName.trim() || "الذات",
          announcement: announcement.trim() || null,
          maintenance_mode: maintenanceMode,
          feature_flags: flags,
        })
        .eq("id", true);

      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["global-app-settings"] });
      toast.success("تم تحديث إعدادات المنصة لجميع المستخدمين.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "تعذّر حفظ إعدادات الإدارة.");
    },
  });

  if (adminLoading || settingsLoading) {
    return (
      <div className="mx-auto max-w-5xl rounded-3xl border bg-card p-10 text-center">
        <RefreshCw className="mx-auto size-6 animate-spin text-primary" />
        <p className="mt-3 text-sm text-muted-foreground">جارٍ التحقق من صلاحيات الإدارة...</p>
      </div>
    );
  }

  if (!admin?.isAdmin) {
    return (
      <div dir="rtl" className="mx-auto max-w-2xl rounded-3xl border border-amber-500/25 bg-card p-8 text-center shadow-[var(--shadow-card)]">
        <ShieldCheck className="mx-auto size-10 text-amber-600" />
        <h1 className="mt-4 text-2xl font-black">لوحة المالك محمية</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          حسابك مسجل في المنصة، لكن لم يتم منحه دور المالك بعد. ربط دور المالك يتم من قاعدة البيانات
          ولا يمكن لأي مستخدم منح نفسه الصلاحية من المتصفح.
        </p>
        <Button asChild variant="outline" className="mt-6">
          <Link to="/profile">العودة إلى حسابي</Link>
        </Button>
      </div>
    );
  }

  const enabledCount = Object.values(flags).filter(Boolean).length;
  const totalCount = Object.keys(flags).length;

  return (
    <div dir="rtl" className="mx-auto max-w-6xl space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-primary/15 bg-card p-5 text-foreground shadow-[var(--shadow-soft)] sm:p-6">
        <div aria-hidden="true" className="pointer-events-none absolute -left-14 -top-14 size-44 rounded-full bg-primary/8 blur-2xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-bold text-primary">
              <ShieldCheck className="size-4" />
              {admin.role === "owner" ? "مالك المنصة" : "مشرف المنصة"}
            </div>
            <h1 className="mt-4 text-2xl font-black sm:text-4xl">إدارة الذات</h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
              أي تغيير في الظهور هنا يُحفظ سحابيًا ويصل إلى جميع المشتركين مباشرة، بدون الحاجة إلى
              إعادة تثبيت التطبيق.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="rounded-2xl border bg-background/80 px-5 py-3 shadow-[var(--shadow-card)]">
              <p className="text-2xl font-black">{enabledCount}</p>
              <p className="text-[11px] text-muted-foreground">خاصية ظاهرة</p>
            </div>
            <div className="rounded-2xl border bg-background/80 px-5 py-3 shadow-[var(--shadow-card)]">
              <p className="text-2xl font-black">{totalCount - enabledCount}</p>
              <p className="text-[11px] text-muted-foreground">خاصية مخفية</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border bg-card p-5 shadow-[var(--shadow-card)] sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-2xl bg-primary/10 p-2.5 text-primary">
            <SlidersHorizontal className="size-5" />
          </div>
          <div>
            <h2 className="font-black">الإعدادات العامة</h2>
            <p className="text-xs text-muted-foreground">إعدادات تؤثر على المنصة بالكامل.</p>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <Label htmlFor="admin-site-name" className="mb-1.5 block">اسم المنصة</Label>
            <Input
              id="admin-site-name"
              value={siteName}
              onChange={(event) => setSiteName(event.target.value)}
              maxLength={80}
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => setMaintenanceMode((value) => !value)}
              className={
                "flex min-h-10 w-full items-center justify-between rounded-xl border px-4 py-2 text-sm font-bold transition " +
                (maintenanceMode
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-800"
                  : "border-border bg-background text-foreground")
              }
            >
              <span className="flex items-center gap-2">
                <AlertTriangle className="size-4" />
                وضع الصيانة
              </span>
              <span>{maintenanceMode ? "مفعّل" : "متوقف"}</span>
            </button>
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="admin-announcement" className="mb-1.5 block">إعلان عام للمشتركين</Label>
            <Textarea
              id="admin-announcement"
              value={announcement}
              onChange={(event) => setAnnouncement(event.target.value)}
              rows={3}
              maxLength={500}
              placeholder="اتركه فارغًا إذا لم يوجد إعلان عام..."
            />
          </div>
        </div>
      </section>

      {FEATURE_GROUPS.map((group) => (
        <section key={group.title} className="rounded-3xl border bg-card p-5 shadow-[var(--shadow-card)] sm:p-6">
          <div className="mb-5">
            <h2 className="font-black">{group.title}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{group.description}</p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {group.items.map((item) => {
              const enabled = flags[item.key];
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() =>
                    setFlags((current) => ({
                      ...current,
                      [item.key]: !current[item.key],
                    }))
                  }
                  className={
                    "flex items-center gap-4 rounded-2xl border p-4 text-right transition " +
                    (enabled
                      ? "border-emerald-500/25 bg-emerald-500/5"
                      : "border-border bg-muted/30 opacity-75")
                  }
                >
                  <span
                    className={
                      "flex size-10 shrink-0 items-center justify-center rounded-xl " +
                      (enabled ? "bg-emerald-500/10 text-emerald-700" : "bg-muted text-muted-foreground")
                    }
                  >
                    {enabled ? <Eye className="size-5" /> : <EyeOff className="size-5" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold">{item.label}</span>
                    <span className="mt-1 block text-xs leading-5 text-muted-foreground">{item.description}</span>
                  </span>
                  <span className={
                    "rounded-full px-2.5 py-1 text-[10px] font-black " +
                    (enabled ? "bg-emerald-500/10 text-emerald-700" : "bg-muted text-muted-foreground")
                  }>
                    {enabled ? "ظاهر" : "مخفي"}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ))}

      <div className="sticky bottom-20 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card/95 p-4 shadow-xl backdrop-blur lg:bottom-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <CheckCircle2 className="size-4 text-emerald-600" />
          التغييرات تُطبق على جميع الحسابات بعد الحفظ.
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => void refetch()}>
            <RefreshCw className="size-4" />
            تحديث
          </Button>
          <Button type="button" onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? <RefreshCw className="size-4 animate-spin" /> : <Save className="size-4" />}
            حفظ ونشر للجميع
          </Button>
        </div>
      </div>
    </div>
  );
}
