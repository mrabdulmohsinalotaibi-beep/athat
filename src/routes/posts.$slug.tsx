import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CalendarDays, CheckCircle2, Home, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Copyright } from "@/components/Copyright";
import { PUBLIC_POST_FIELDS, formatPostDate, kindLabel, type PublicPost } from "@/lib/posts";

export const Route = createFileRoute("/posts/$slug")({
  head: () => ({
    meta: [
      { title: "منشور | منصة الذات" },
      { name: "description", content: "مقالات وأخبار ونصائح إرشادية من الموجهين الطلابيين في منصة الذات." },
      { property: "og:title", content: "منشور | منصة الذات" },
      { property: "og:description", content: "مقالات وأخبار ونصائح إرشادية من منصة الذات." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PostPage,
});

function PostPage() {
  const { slug } = Route.useParams();
  const { data: post, isLoading } = useQuery({
    queryKey: ["public-post", slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("posts").select(PUBLIC_POST_FIELDS).eq("slug", slug).eq("is_public", true).maybeSingle();
      if (error) throw error;
      return data as PublicPost | null;
    },
  });

  function shareOnWhatsApp() {
    if (!post) return;
    const url = window.location.origin + "/posts/" + encodeURIComponent(post.slug);
    const message = post.title + "\\n\\n" + (post.excerpt ? post.excerpt + "\\n\\n" : "") + url + "\\n\\nمن منصة الذات";
    window.open("https://wa.me/?text=" + encodeURIComponent(message), "_blank", "noopener,noreferrer");
  }

  return (
    <div dir="rtl" className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-card/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-8">
          <Link to="/" className="flex items-center gap-2 text-sm font-bold text-primary"><ArrowRight className="size-4" /> الرئيسية</Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex"><Link to="/auth" search={{ next: "" }}>دخول الموجه الطلابي</Link></Button>
            <Link to="/" className="text-lg font-black text-primary">الذات</Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-8 sm:py-16">
        {isLoading ? (
          <div className="mx-auto max-w-2xl animate-pulse space-y-5"><div className="h-5 w-24 rounded-full bg-muted" /><div className="h-14 w-4/5 rounded-xl bg-muted" /><div className="h-72 rounded-3xl bg-muted" /></div>
        ) : !post ? (
          <div className="py-20 text-center">
            <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Home className="size-7" /></div>
            <h1 className="mt-6 text-2xl font-black">المنشور غير متاح</h1>
            <p className="mt-2 text-muted-foreground">قد يكون حُذف أو لم يعد منشورًا للعامة.</p>
            <Button asChild className="mt-6"><Link to="/">العودة إلى المنشورات العامة</Link></Button>
          </div>
        ) : (
          <article>
            <div className="mx-auto max-w-3xl text-center">
              <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-bold">
                <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">{kindLabel(post.kind)}</span>
                <span className="flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-muted-foreground"><CheckCircle2 className="size-3.5 text-primary" />منشور عام</span>
              </div>
              <h1 className="mt-5 text-3xl font-black leading-tight tracking-tight sm:text-5xl">{post.title}</h1>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
                <span>{post.author_name || "الموجه الطلابي"}</span>
                <span className="flex items-center gap-1"><CalendarDays className="size-4" />{formatPostDate(post.published_at ?? post.created_at)}</span>
              </div>
              <Button type="button" onClick={shareOnWhatsApp} className="mt-7 gap-2 bg-[#25D366] font-bold text-white shadow-lg shadow-[#25D366]/20 hover:bg-[#1da851]"><MessageCircle className="size-4" /> مشاركة المنشور عبر واتساب</Button>
            </div>
            {post.cover_url && <img src={post.cover_url} alt={post.title} className="mx-auto mt-10 max-h-[520px] w-full rounded-3xl object-cover shadow-xl" />}
            <div className="mx-auto max-w-3xl">
              {post.excerpt && <p className="mt-10 border-r-4 border-accent pr-5 text-lg font-bold leading-9 text-foreground/80">{post.excerpt}</p>}
              <div className="mt-8 whitespace-pre-line text-base leading-9 text-foreground/90 sm:text-lg">{post.body}</div>
              <div className="mt-12 flex flex-col items-center justify-between gap-4 rounded-2xl border border-primary/15 bg-primary/5 p-5 text-center sm:flex-row sm:text-right">
                <div><p className="font-bold">هل وجدت هذا المنشور مفيدًا؟</p><p className="mt-1 text-sm text-muted-foreground">شاركه مع زميل قد يستفيد منه.</p></div>
                <Button type="button" variant="outline" onClick={shareOnWhatsApp} className="gap-2 border-[#25D366]/40 text-[#128C7E] hover:bg-[#25D366]/10 hover:text-[#128C7E]"><MessageCircle className="size-4" /> مشاركة واتساب</Button>
              </div>
            </div>
          </article>
        )}
      </main>
      <footer className="border-t py-6 text-center text-xs text-muted-foreground"><Copyright /></footer>
    </div>
  );
}
