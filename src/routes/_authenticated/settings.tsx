import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, FileText, Pencil, Plus, Trash2, X } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/lib/school";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SignaturePad } from "@/components/SignaturePad";
import { LOOKUP_CATEGORIES, lookupCategoryLabel } from "@/lib/lookups";
import { OfficialFooter, OfficialHeader } from "@/components/OfficialHeader";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "الإعدادات | الذات" },
      {
        name: "description",
        content: "تخصيص بيانات المدرسة والموجه الطلابي والقوائم المرجعية في الذات.",
      },
      { property: "og:title", content: "الإعدادات | الذات" },
      { property: "og:description", content: "بيانات المدرسة والعام الدراسي والقوائم المرجعية." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

const SCHOOL_FIELDS = [
  { name: "school_name", label: "اسم المدرسة" },
  { name: "education_dept", label: "إدارة التعليم" },
  { name: "principal_name", label: "مدير المدرسة" },
  { name: "counselor_name", label: "اسم الموجه الطلابي" },
  { name: "academic_year", label: "العام الدراسي" },
  { name: "semester", label: "الفصل الدراسي" },
  { name: "contact_phone", label: "هاتف التواصل" },
  { name: "contact_email", label: "البريد الإلكتروني" },
  { name: "office_hours", label: "أوقات المقابلات" },
];

/** المحتوى الظاهر في صفحات الموقع العام. */
const PORTAL_FIELDS = [
  { name: "vision", label: "رؤية التوجيه الطلابي" },
  { name: "mission", label: "رسالة التوجيه الطلابي" },
  { name: "announcement", label: "التنبيهات والإعلانات" },
];

function LogoField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  return (
    <div className="rounded-lg border border-dashed p-3">
      <Label className="mb-1.5 block text-xs">{label}</Label>
      <div className="flex items-center gap-3">
        {value ? (
          <img
            src={value}
            alt={label}
            className="h-16 w-24 rounded border bg-white object-contain"
          />
        ) : (
          <div className="flex h-16 w-24 items-center justify-center rounded border bg-muted text-[10px] text-muted-foreground">
            بلا شعار
          </div>
        )}
        <div className="space-y-2">
          <Input
            type="file"
            accept="image/*"
            className="text-xs"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              if (file.size > 400_000) {
                toast.error("حجم الشعار كبير؛ اختر صورة أقل من ٣٨٠ كيلوبايت");
                return;
              }
              const reader = new FileReader();
              reader.onload = () => onChange(String(reader.result));
              reader.readAsDataURL(file);
            }}
          />
          {value && (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")}>
              <Trash2 className="size-4 text-destructive" /> إزالة
            </Button>
          )}
        </div>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}

function SettingsPage() {
  const queryClient = useQueryClient();
  const {
    data: school,
    isLoading: schoolLoading,
    isError: schoolError,
    error: schoolQueryError,
    refetch: refetchSchool,
  } = useSchool();
  const schoolFormKey = school?.updated_at ?? school?.id ?? "school-settings-loading";
  const [counselorSignature, setCounselorSignature] = useState<string | null>(null);
  const [principalSignature, setPrincipalSignature] = useState<string | null>(null);
  const [schoolLogo, setSchoolLogo] = useState<string | null>(null);
  const [ministryLogo, setMinistryLogo] = useState<string | null>(null);
  const [editingLookup, setEditingLookup] = useState<{ id: string; value: string } | null>(null);
  const saveSchool = useMutation({
    mutationFn: async (values: Record<string, string>) => {
      const { data: sessionData } = await supabase.auth.getSession();
      let userId = sessionData.session?.user.id ?? "";

      try {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (!authError && authData.user) userId = authData.user.id;
      } catch {
        // Keep the locally persisted session during a transient auth/network failure.
      }

      if (!userId) throw new Error("انتهت جلسة الدخول؛ سجّل الدخول مجددًا ثم حاول الحفظ");

      const preserveText = (key: string) => {
        const entered = String(values[key] ?? "").trim();
        const existing = String((school as Record<string, unknown> | null | undefined)?.[key] ?? "").trim();
        return entered || existing || null;
      };

      const payload = {
        ...values,
        school_name: preserveText("school_name"),
        education_dept: preserveText("education_dept"),
        principal_name: preserveText("principal_name"),
        counselor_name: preserveText("counselor_name"),
        academic_year: preserveText("academic_year"),
        semester: preserveText("semester"),
        contact_phone: preserveText("contact_phone"),
        contact_email: preserveText("contact_email"),
        office_hours: preserveText("office_hours"),
        vision: preserveText("vision"),
        mission: preserveText("mission"),
        announcement: preserveText("announcement"),
        show_counselor_on_documents: values["show_counselor_on_documents"] !== "false",
        show_principal_on_documents: values["show_principal_on_documents"] !== "false",
        counselor_signature: counselorSignature !== null ? (counselorSignature || null) : (school?.counselor_signature ?? null),
        principal_signature: principalSignature !== null ? (principalSignature || null) : (school?.principal_signature ?? null),
        logo_url: schoolLogo !== null ? (schoolLogo || null) : (school?.logo_url ?? null),
        ministry_logo_url: ministryLogo !== null ? (ministryLogo || null) : (school?.ministry_logo_url ?? null),
        public_requests_enabled: values["public_requests_enabled"] !== "false",
        user_id: userId,
      };
      // سجل واحد فقط لكل حساب: upsert يمنع إنشاء صفوف متكررة ويضمن
      // أن الحفظ يعمل حتى بعد تحديث الجلسة أو إعادة تحميل الصفحة.
      const { error } = await supabase
        .from("school_settings")
        .upsert(payload as never, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["school_settings"] });
      queryClient.invalidateQueries({ queryKey: ["guidance_profile"] });
      toast.success("تم حفظ بيانات المدرسة");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const { data: lookups = [], isError: lookupsError, error: lookupsQueryError, refetch: refetchLookups } = useQuery({
    queryKey: ["lookups"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lookups")
        .select("*")
        .order("category", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const addLookup = useMutation({
    mutationFn: async (values: { category: string; value: string }) => {
      const duplicate = lookups.some(
        (item) => item.category === values.category && item.value?.trim() === values.value.trim(),
      );
      if (duplicate) throw new Error("هذه القيمة موجودة في القائمة بالفعل");
      const { error } = await supabase.from("lookups").insert(values as never);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lookups"] });
      toast.success("تمت الإضافة للقائمة");
    },
  });

  const updateLookup = useMutation({
    mutationFn: async (values: { id: string; value: string }) => {
      const current = lookups.find((item) => item.id === values.id);
      const duplicate = lookups.some(
        (item) =>
          item.id !== values.id &&
          item.category === current?.category &&
          item.value?.trim() === values.value.trim(),
      );
      if (duplicate) throw new Error("هذه القيمة موجودة في القائمة بالفعل");
      const { error } = await supabase
        .from("lookups")
        .update({ value: values.value } as never)
        .eq("id", values.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lookups"] });
      setEditingLookup(null);
      toast.success("تم تعديل الخيار");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const removeLookup = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lookups").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lookups"] }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">بيانات المدرسة والمستندات</h1>
        <p className="mt-1 text-sm text-muted-foreground">هذه البيانات هي المصدر الموحد للكليشة الرسمية في جميع ملفات PDF وتقارير A4.</p>
      </div>

      {schoolError && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="font-bold text-destructive">تعذّر تحميل بيانات المدرسة</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {schoolQueryError instanceof Error ? schoolQueryError.message : "حدث خطأ أثناء جلب إعدادات المدرسة."}
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => void refetchSchool()}>
            إعادة المحاولة
          </Button>
        </div>
      )}

      {lookupsError && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="font-bold text-destructive">تعذّر تحميل القوائم المخصصة</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {lookupsQueryError instanceof Error ? lookupsQueryError.message : "حدث خطأ أثناء جلب القوائم."}
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => void refetchLookups()}>
            إعادة المحاولة
          </Button>
        </div>
      )}

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="mb-1 font-bold">بيانات المدرسة والموجه</h2>
        <p className="mb-4 text-xs text-muted-foreground">أدخلها مرة واحدة؛ ستظهر تلقائيًا في التقارير وملف الطالب والخطة والبرامج.</p>
        <form
          key={schoolFormKey}
          aria-busy={schoolLoading}
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (schoolLoading || schoolError) {
              toast.error("انتظر تحميل بيانات المدرسة أو أعد المحاولة قبل الحفظ.");
              return;
            }
            const data = new FormData(e.currentTarget);
            const values: Record<string, string> = {};
            SCHOOL_FIELDS.forEach((f) => {
              values[f.name] = String(data.get(f.name) ?? "");
            });
            PORTAL_FIELDS.forEach((f) => {
              values[f.name] = String(data.get(f.name) ?? "");
            });
            values["show_counselor_on_documents"] = data.get("show_counselor_on_documents")
              ? "true"
              : "false";
            values["show_principal_on_documents"] = data.get("show_principal_on_documents")
              ? "true"
              : "false";
            values["public_requests_enabled"] = data.get("public_requests_enabled")
              ? "true"
              : "false";
            saveSchool.mutate(values);
          }}
        >
          {SCHOOL_FIELDS.map((f) => (
            <div key={f.name}>
              <Label htmlFor={f.name} className="mb-1.5 block text-xs">
                {f.label}
              </Label>
              <Input
                id={f.name}
                name={f.name}
                defaultValue={
                  ((school as Record<string, unknown> | null)?.[f.name] as string) ?? ""
                }
              />
            </div>
          ))}
          {PORTAL_FIELDS.map((f) => (
            <div key={f.name} className="sm:col-span-2">
              <Label htmlFor={f.name} className="mb-1.5 block text-xs">
                {f.label}
              </Label>
              <textarea
                id={f.name}
                name={f.name}
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                defaultValue={
                  ((school as Record<string, unknown> | null)?.[f.name] as string) ?? ""
                }
              />
            </div>
          ))}

          <div className="sm:col-span-2">
            <div className="mb-5 grid gap-5 sm:grid-cols-2">
              <LogoField
                label="شعار المدرسة"
                hint="يظهر في الكليشة الرسمية للتقارير وفي الموقع العام."
                value={schoolLogo ?? school?.logo_url ?? null}
                onChange={setSchoolLogo}
              />
              <LogoField
                label="شعار وزارة التعليم"
                hint="عند عدم رفع شعار يُستخدم الشعار الرسمي المضمّن في النظام."
                value={ministryLogo ?? school?.ministry_logo_url ?? null}
                onChange={setMinistryLogo}
              />
            </div>
            <div className="mb-5 grid gap-5 sm:grid-cols-2">
              <SignaturePad
                label="توقيع الموجه الطلابي"
                value={counselorSignature ?? school?.counselor_signature ?? ""}
                onChange={setCounselorSignature}
              />
              <SignaturePad
                label="توقيع مدير المدرسة"
                value={principalSignature ?? school?.principal_signature ?? ""}
                onChange={setPrincipalSignature}
              />
            </div>
            <div className="mb-5 grid gap-3 rounded-lg border border-dashed p-3 sm:grid-cols-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="show_counselor_on_documents"
                  defaultChecked={school?.show_counselor_on_documents !== false}
                />
                إظهار اسم وتوقيع الموجه في المستندات
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="show_principal_on_documents"
                  defaultChecked={school?.show_principal_on_documents !== false}
                />
                إظهار اسم وتوقيع المدير في المستندات
              </label>
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input
                  type="checkbox"
                  name="public_requests_enabled"
                  defaultChecked={school?.public_requests_enabled !== false}
                />
                استقبال الاستمارات العامة (استشارة فردية، إحالة طالب، إبلاغ سري)
              </label>
            </div>
            <Button type="submit" disabled={saveSchool.isPending || schoolLoading || schoolError}>
              {saveSchool.isPending ? "جارٍ الحفظ..." : "حفظ البيانات"}
            </Button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <FileText className="size-5 text-primary" />
          <div>
            <h2 className="font-bold">معاينة الكليشة الرسمية</h2>
            <p className="text-xs text-muted-foreground">هذه هي الهوية التي ستظهر في مستندات A4 بعد الحفظ.</p>
          </div>
        </div>
        <div className="record-pdf-document mx-auto max-w-[210mm] rounded-xl border bg-paper p-4 text-paper-foreground">
          <OfficialHeader school={school} title="معاينة المستند الرسمي" reportType="نموذج معاينة" />
          <div className="my-8 rounded-xl border border-dashed border-paper-border bg-[var(--letterhead-soft)] p-6 text-center text-sm text-paper-muted-foreground">
            محتوى المستند يظهر هنا، وتُستخدم نفس الكليشة تلقائيًا في التقارير والسجلات القابلة للطباعة.
          </div>
          <OfficialFooter school={school} />
        </div>
      </section>

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="mb-1 font-bold">القوائم المرجعية</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          أضف أو عدّل الخيارات التي تظهر في نماذج الحالات والإحالات والإجراءات واللجان.
        </p>
        <form
          className="grid gap-2 sm:grid-cols-[minmax(0,12rem)_minmax(0,12rem)_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const data = new FormData(form);
            const category = String(data.get("category") ?? "").trim();
            const value = String(data.get("value") ?? "").trim();
            if (!category || !value) return;
            addLookup.mutate({ category, value });
            form.reset();
          }}
        >
          <select
            name="category"
            required
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">اختر القائمة</option>
            {LOOKUP_CATEGORIES.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
            ))}
          </select>
          <Input name="value" placeholder="القيمة" />
          <Button type="submit" variant="outline">
            <Plus className="size-4" /> إضافة
          </Button>
        </form>

        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {lookups.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between rounded-lg bg-secondary/60 px-3 py-2 text-sm"
            >
              {editingLookup?.id === item.id ? (
                <Input
                  value={editingLookup.value}
                  onChange={(event) => setEditingLookup({ id: item.id, value: event.target.value })}
                  className="ml-2"
                  autoFocus
                />
              ) : (
                <span>
                  <span className="text-muted-foreground">
                    {lookupCategoryLabel(item.category ?? "")}:
                  </span>{" "}
                  {item.value}
                </span>
              )}
              <div className="flex shrink-0 gap-1">
                {editingLookup?.id === item.id ? (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const value = editingLookup.value.trim();
                        if (value) updateLookup.mutate({ id: item.id, value });
                      }}
                      aria-label="حفظ التعديل"
                    >
                      <Check className="size-4 text-primary" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingLookup(null)}
                      aria-label="إلغاء التعديل"
                    >
                      <X className="size-4" />
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditingLookup({ id: item.id, value: item.value ?? "" })}
                    aria-label="تعديل"
                  >
                    <Pencil className="size-4" />
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeLookup.mutate(item.id)}
                  aria-label="حذف"
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
