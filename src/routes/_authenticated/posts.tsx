import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileText, Globe, HeartHandshake, Lock, Pencil, Plus, ShieldAlert, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { POST_KINDS, formatPostDate, kindLabel, makeSlug } from "@/lib/posts";
import { useSchool } from "@/lib/school";
import { RequestsInbox } from "@/components/RequestsInbox";

export const Route = createFileRoute("/_authenticated/posts")({
  head: () => ({
    meta: [
      { title: "مدونة الموجه | منصة الذات" },
      { name: "description", content: "إدارة منشورات الموجه الخاصة ومشاركتها عبر رابط شخصي." },
    ],
  }),
  component: PostsManager,
});

type Draft = { id?: string; title: string; kind: string; excerpt: string; body: string; cover_url: string; is_public: boolean; slug?: string; published_at?: string | null };
const EMPTY: Draft = { title: "", kind: "article", excerpt: "", body: "", cover_url: "", is_public: false };

function PostsManager() {
  const qc = useQueryClient();
  const { data: school } = useSchool();
  const [draft, setDraft] = useState<Draft | null>(null);

  const {
    data: posts = [],
    isError: postsError,
    error: postsQueryError,
    refetch: refetchPosts,
  } = useQuery({
    queryKey: ["my-posts"],
    queryFn: async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      let userId = sessionData.session?.user.id ?? "";
      try {
        const { data: u, error: authError } = await supabase.auth.getUser();
        if (!authError && u.user) userId = u.user.id;
      } catch {
        // Continue with the locally persisted session on transient auth failures.
      }
      if (!userId) throw new Error("انتهت جلسة الدخول؛ سجّل الدخول مجددًا.");
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async (d: Draft) => {
      if (!d.title.trim()) throw new Error("اكتب عنواناً للمنشور");
      const row = {
        title: d.title.trim(),
        kind: d.kind,
        excerpt: d.excerpt.trim() || null,
        body: d.body,
        cover_url: d.cover_url.trim() || null,
        is_public: d.is_public,
        author_name: school?.school_name || school?.counselor_name || null,
        published_at: d.is_public ? d.published_at ?? new Date().toISOString() : d.published_at ?? null,
      };
      const res = d.id
        ? await supabase.from("posts").update(row).eq("id", d.id)
        : await supabase.from("posts").insert({ ...row, slug: makeSlug(d.title) });
      if (res.error) throw res.error;
    },
    onSuccess: () => { toast.success("تم حفظ المنشور"); setDraft(null); qc.invalidateQueries({ queryKey: ["my-posts"] }); qc.invalidateQueries({ queryKey: ["public-posts"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("posts").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("تم الحذف"); qc.invalidateQueries({ queryKey: ["my-posts"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">مدونة الموجه</h1>
          <p className="text-sm text-muted-foreground">انشر ما تختاره في مدونتك الخاصة وشارك رابطها مع من تسمح له بالاطلاع.</p>
        </div>
        <Button onClick={() => setDraft({ ...EMPTY })} className="gap-2"><Plus className="size-4" />منشور جديد</Button>
      </div>

      <PublicLinkCard />
      <section className="rounded-2xl border border-primary/15 bg-primary/[0.03] p-5 shadow-sm">
        <div>
          <p className="text-xs font-bold text-primary">مركز خدمات الموجه</p>
          <h2 className="mt-1 text-xl font-black">الخدمات والطلبات المرتبطة بسجلاتك</h2>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            الاستشارة والإحالة والبلاغ تصل إلى هذا الصندوق مباشرة؛ افتح الطلب، اطبعه A4،
            أضف ردك أو الإجراء، ثم حوّله إلى حالة إرشادية عند الحاجة.
          </p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border bg-card p-4">
            <HeartHandshake className="size-5 text-primary" />
            <p className="mt-2 font-black">طلبات الاستشارة</p>
            <p className="mt-1 text-xs leading-6 text-muted-foreground">
              طلبات الطلاب وأولياء الأمور للمقابلات والدعم الفردي.
            </p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <FileText className="size-5 text-primary" />
            <p className="mt-2 font-black">إحالات الطلاب</p>
            <p className="mt-1 text-xs leading-6 text-muted-foreground">
              إحالات المعلمين والإدارة مع الملاحظات والإجراءات السابقة.
            </p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <ShieldAlert className="size-5 text-primary" />
            <p className="mt-2 font-black">البلاغات السرية</p>
            <p className="mt-1 text-xs leading-6 text-muted-foreground">
              بلاغات التنمر والسلامة مع المحافظة على السرية.
            </p>
          </div>
        </div>
      </section>

      <RequestsInbox />

      {postsError && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="font-bold text-destructive">تعذّر تحميل المنشورات</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {postsQueryError instanceof Error ? postsQueryError.message : "حدث خطأ أثناء جلب المنشورات."}
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => void refetchPosts()}>
            إعادة المحاولة
          </Button>
        </div>
      )}


      {draft && (
        <div className="space-y-4 rounded-2xl border bg-card p-5 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>العنوان</Label><Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></div>
            <div className="space-y-2">
              <Label>النوع</Label>
              <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value })}>
                {Object.entries(POST_KINDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-2"><Label>مقتطف قصير</Label><Input value={draft.excerpt} onChange={(e) => setDraft({ ...draft, excerpt: e.target.value })} /></div>
          <div className="space-y-2"><Label>النص</Label><Textarea rows={10} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} /></div>
          <div className="space-y-2"><Label>رابط صورة الغلاف (اختياري)</Label><Input dir="ltr" placeholder="https://..." value={draft.cover_url} onChange={(e) => setDraft({ ...draft, cover_url: e.target.value })} /></div>
          <div className="flex items-center gap-3"><Switch checked={draft.is_public} onCheckedChange={(v) => setDraft({ ...draft, is_public: v })} /><span className="text-sm">{draft.is_public ? "منشور للعامة" : "مسودة خاصة"}</span></div>
          <div className="flex gap-2">
            <Button onClick={() => save.mutate(draft)} disabled={save.isPending}>حفظ</Button>
            <Button variant="outline" onClick={() => setDraft(null)}>إلغاء</Button>
          </div>
        </div>
      )}

      <div className="grid gap-3">
        {posts.length === 0 && <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">لا توجد منشورات بعد.</p>}
        {posts.map((p) => (
          <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded-full bg-primary/10 px-2 py-0.5 font-bold text-primary">{kindLabel(p.kind)}</span>
                {p.is_public ? <span className="flex items-center gap-1"><Globe className="size-3" />عام</span> : <span className="flex items-center gap-1"><Lock className="size-3" />خاص</span>}
                <span>{formatPostDate(p.created_at)}</span>
              </div>
              <p className="mt-1 font-bold">{p.title}</p>
            </div>
            <div className="flex gap-2">
              <Button size="icon" variant="ghost" title="تعديل" onClick={() => setDraft({ id: p.id, title: p.title, kind: p.kind, excerpt: p.excerpt ?? "", body: p.body, cover_url: p.cover_url ?? "", is_public: p.is_public, published_at: p.published_at })}><Pencil className="size-4" /></Button>
              <Button size="icon" variant="ghost" title="حذف" onClick={() => { if (confirm("حذف المنشور نهائياً؟")) remove.mutate(p.id); }}><Trash2 className="size-4 text-destructive" /></Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PublicLinkCard() {
  const {
    data: row,
    isError,
    error: linkError,
    refetch,
  } = useQuery({
    queryKey: ["my-public-slug"],
    queryFn: async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      let userId = sessionData.session?.user.id ?? "";

      try {
        const { data: userData, error: authError } = await supabase.auth.getUser();
        if (!authError && userData.user) userId = userData.user.id;
      } catch {
        // Continue with the locally persisted session on transient auth failures.
      }

      if (!userId) throw new Error("انتهت جلسة الدخول؛ سجّل الدخول مجددًا.");

      const { data, error } = await supabase
        .from("school_settings")
        .select("id,private_blog_token")
        .eq("user_id", userId)
        .order("created_at")
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });
  const current = row?.private_blog_token ?? "";
  const url = row?.private_blog_token ? `${typeof window !== "undefined" ? window.location.origin : ""}/blog/${row.private_blog_token}` : "";

  return (
    <div className="rounded-2xl border bg-card p-5">
      <p className="font-bold">رابط مدونتك الخاصة</p>
      {isError && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs">
          <span className="text-destructive">
            {linkError instanceof Error ? linkError.message : "تعذّر تحميل رابط المدونة."}
          </span>
          <Button type="button" variant="ghost" size="sm" onClick={() => void refetch()}>
            إعادة المحاولة
          </Button>
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span dir="ltr" className="text-sm text-muted-foreground">/blog/</span>
        <Input dir="ltr" className="max-w-xs" placeholder="سيظهر بعد تطبيق الهجرة" value={current} readOnly />
        <Button variant="outline" disabled={!url} onClick={() => { void navigator.clipboard.writeText(url); toast.success("تم نسخ رابط المدونة الخاصة"); }}>نسخ الرابط</Button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">لا تظهر منشوراتك في الصفحة الرئيسية؛ لا يراها الزوار إلا من خلال هذا الرابط ومنشوراتك التي اخترت نشرها.</p>
      {url && <a href={url} target="_blank" rel="noreferrer" dir="ltr" className="mt-2 block text-sm text-primary underline">{url}</a>}
    </div>
  );
}
