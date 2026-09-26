import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Eye, Globe, Lock, Pencil, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { POST_KINDS, formatPostDate, kindLabel, makeSlug } from "@/lib/posts";
import { useSchool } from "@/lib/school";

export const Route = createFileRoute("/_authenticated/posts")({
  head: () => ({
    meta: [
      { title: "المنشورات العامة | منصة الذات" },
      { name: "description", content: "إدارة المقالات والأخبار والإعلانات المنشورة للعامة." },
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

  const { data: posts = [] } = useQuery({
    queryKey: ["my-posts"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { data, error } = await supabase.from("posts").select("*").eq("user_id", u.user?.id ?? "").order("created_at", { ascending: false });
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
          <h1 className="text-2xl font-black">المنشورات العامة</h1>
          <p className="text-sm text-muted-foreground">ما تضع عليه «منشور للعامة» يظهر في الصفحة الرئيسية وصفحتك العامة.</p>
        </div>
        <Button onClick={() => setDraft({ ...EMPTY })} className="gap-2"><Plus className="size-4" />منشور جديد</Button>
      </div>

      <PublicLinkCard />

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
              {p.is_public && <Button asChild size="icon" variant="ghost" title="عرض"><Link to="/posts/$slug" params={{ slug: p.slug }}><Eye className="size-4" /></Link></Button>}
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
  const qc = useQueryClient();
  const { data: row } = useQuery({
    queryKey: ["my-public-slug"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { data } = await supabase.from("school_settings").select("id,public_slug").eq("user_id", u.user?.id ?? "").order("created_at").limit(1).maybeSingle();
      return data;
    },
  });
  const [value, setValue] = useState<string | null>(null);
  const current = value ?? row?.public_slug ?? "";
  const url = row?.public_slug ? `${typeof window !== "undefined" ? window.location.origin : ""}/c/${row.public_slug}` : "";

  async function saveSlug(): Promise<void> {
    const slug = current.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
    if (slug.length < 3) { toast.error("استخدم 3 أحرف إنجليزية أو أرقام على الأقل"); return; }
    if (!row?.id) { toast.error("أكمل بيانات المدرسة من الإعدادات أولاً"); return; }
    const { error } = await supabase.from("school_settings").update({ public_slug: slug }).eq("id", row.id);
    if (error) { toast.error(error.code === "23505" ? "هذا الرابط مستخدم، جرّب اسماً آخر" : error.message); return; }
    toast.success("تم حفظ رابط صفحتك العامة");
    setValue(null);
    qc.invalidateQueries({ queryKey: ["my-public-slug"] });
  }

  return (
    <div className="rounded-2xl border bg-card p-5">
      <p className="font-bold">رابط صفحتك العامة</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span dir="ltr" className="text-sm text-muted-foreground">/c/</span>
        <Input dir="ltr" className="max-w-xs" placeholder="my-school" value={current} onChange={(e) => setValue(e.target.value)} />
        <Button variant="outline" onClick={saveSlug}>حفظ الرابط</Button>
      </div>
      {url && <a href={url} target="_blank" rel="noreferrer" dir="ltr" className="mt-2 block text-sm text-primary underline">{url}</a>}
    </div>
  );
}
