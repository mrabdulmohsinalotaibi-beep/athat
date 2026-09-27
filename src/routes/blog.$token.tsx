import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CalendarDays, LockKeyhole } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/blog/$token")({
  head: () => ({ meta: [{ title: "مدونة الموجه الطلابي | منصة الذات" }] }),
  component: PrivateBlogPage,
});

type BlogPost = { school_name: string | null; counselor_name: string | null; title: string; kind: string | null; excerpt: string | null; body: string; cover_url: string | null; author_name: string | null; published_at: string | null; created_at: string; slug: string };

function PrivateBlogPage() {
  const { token } = Route.useParams();
  const { data = [], isLoading } = useQuery({
    queryKey: ["private-counselor-blog", token],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_private_counselor_blog", { p_token: token });
      if (error) throw error;
      return (data ?? []) as BlogPost[];
    },
  });
  const first = data[0];
  return <div dir="rtl" className="min-h-screen bg-background"><header className="border-b bg-card/90"><div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4"><Link to="/" className="flex items-center gap-2 text-sm font-bold text-primary"><ArrowRight className="size-4" /> الذات</Link><span className="flex items-center gap-2 text-xs text-muted-foreground"><LockKeyhole className="size-4" /> رابط خاص</span></div></header><main className="mx-auto max-w-4xl px-4 py-10 sm:py-16">{isLoading ? <p className="py-20 text-center text-muted-foreground">جارٍ تحميل المدونة…</p> : !first ? <div className="rounded-3xl border border-dashed p-12 text-center"><LockKeyhole className="mx-auto size-10 text-muted-foreground" /><h1 className="mt-4 text-2xl font-black">المدونة غير متاحة</h1><p className="mt-2 text-sm text-muted-foreground">الرابط خاص أو لم يتم نشر أي منشور فيه.</p></div> : <><header className="mb-10 rounded-3xl border bg-primary/5 p-7 text-center"><p className="text-sm font-bold text-primary">مدونة الموجه الطلابي</p><h1 className="mt-2 text-3xl font-black">{first.counselor_name || first.author_name || "الموجه الطلابي"}</h1>{first.school_name && <p className="mt-2 text-sm text-muted-foreground">{first.school_name}</p>}<p className="mx-auto mt-4 max-w-xl text-xs leading-6 text-muted-foreground">هذه الصفحة لا تظهر في الموقع العام، وتُعرض فقط لمن يملك رابط المشاركة الخاص.</p></header><div className="space-y-6">{data.map((post) => <article key={`${post.slug}-${post.created_at}`} className="rounded-3xl border bg-card p-6 shadow-sm"><h2 className="text-2xl font-black">{post.title}</h2><div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground"><CalendarDays className="size-4" />{new Date(post.published_at ?? post.created_at).toLocaleDateString("ar-SA")}</div>{post.cover_url && <img src={post.cover_url} alt={post.title} className="mt-5 max-h-[460px] w-full rounded-2xl object-cover" />}{post.excerpt && <p className="mt-5 border-r-4 border-primary pr-4 text-lg font-bold leading-8 text-muted-foreground">{post.excerpt}</p>}<div className="mt-5 whitespace-pre-line text-base leading-8">{post.body}</div></article>)}</div></>}</main><footer className="border-t py-6 text-center text-xs text-muted-foreground">منصة الذات للتوجيه الطلابي</footer></div>;
}
