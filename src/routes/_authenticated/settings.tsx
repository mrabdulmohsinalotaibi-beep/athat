import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/lib/school";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "الإعدادات | منصة ذات" },
      { name: "description", content: "تخصيص بيانات المدرسة والموجه الطلابي والقوائم المرجعية في منصة ذات." },
      { property: "og:title", content: "الإعدادات | منصة ذات" },
      { property: "og:description", content: "بيانات المدرسة والعام الدراسي والقوائم المرجعية." },
    ],
  }),
  component: SettingsPage,
});

const SCHOOL_FIELDS = [
  { name: "school_name", label: "اسم المدرسة" },
  { name: "education_dept", label: "إدارة التعليم" },
  { name: "education_office", label: "مكتب التعليم" },
  { name: "principal_name", label: "مدير المدرسة" },
  { name: "counselor_name", label: "اسم الموجه الطلابي" },
  { name: "academic_year", label: "العام الدراسي" },
  { name: "semester", label: "الفصل الدراسي" },
];

function SettingsPage() {
  const queryClient = useQueryClient();
  const { data: school } = useSchool();

  const saveSchool = useMutation({
    mutationFn: async (values: Record<string, string>) => {
      if (school?.id) {
        const { error } = await supabase.from("school_settings").update(values as never).eq("id", school.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("school_settings").insert(values as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["school_settings"] });
      toast.success("تم حفظ بيانات المدرسة");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const { data: lookups = [] } = useQuery({
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
      const { error } = await supabase.from("lookups").insert(values as never);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lookups"] });
      toast.success("تمت الإضافة للقائمة");
    },
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
      <h1 className="text-2xl font-extrabold">الإعدادات</h1>

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="mb-4 font-bold">بيانات المدرسة والموجه</h2>
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            const values: Record<string, string> = {};
            SCHOOL_FIELDS.forEach((f) => {
              values[f.name] = String(data.get(f.name) ?? "");
            });
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
                defaultValue={((school as Record<string, unknown> | null)?.[f.name] as string) ?? ""}
              />
            </div>
          ))}
          <div className="sm:col-span-2">
            <Button type="submit" disabled={saveSchool.isPending}>
              حفظ البيانات
            </Button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="mb-1 font-bold">القوائم المرجعية</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          أضف قيماً خاصة بمدرستك (مثل: المجالات، أنواع البرامج، وسائل التواصل).
        </p>
        <form
          className="flex flex-wrap gap-2"
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
          <Input name="category" placeholder="اسم القائمة" className="max-w-48" />
          <Input name="value" placeholder="القيمة" className="max-w-48" />
          <Button type="submit" variant="outline">
            <Plus className="size-4" /> إضافة
          </Button>
        </form>

        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {lookups.map((item) => (
            <li key={item.id} className="flex items-center justify-between rounded-lg bg-secondary/60 px-3 py-2 text-sm">
              <span>
                <span className="text-muted-foreground">{item.category}:</span> {item.value}
              </span>
              <button onClick={() => removeLookup.mutate(item.id)} aria-label="حذف">
                <Trash2 className="size-4 text-destructive" />
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
