import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CalendarDays, Share2 } from "lucide-react";
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

  function share() {
    const text = `${post?.title ?? ""}\n${window.location.href}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/80">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2 text-sm font-semibold text-primary">
            <ArrowRight className="size-4" /> الرئيسية
          </Link>
          <span className="text-lg font-black text-primary">الذات</span>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10 text-right">
        {isLoading ? (
          <p className="text-center text-muted-foreground">جارٍ التحميل…</p>
        ) : !post ? (
          <div className="py-20 text-center">
            <h1 className="text-2xl font-bold">المنشور غير متاح</h1>
            <p className="mt-2 text-muted-foreground">قد يكون حُذف أو لم يعد منشوراً للعامة.</p>
          </div>
        ) : (
          <article>
            <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">{kindLabel(post.kind)}</span>
            <h1 className="mt-4 text-3xl font-black leading-tight sm:text-4xl">{post.title}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span>{post.author_name || "الموجه الطلابي"}</span>
              <span className="flex items-center gap-1"><CalendarDays className="size-4" />{formatPostDate(post.published_at ?? post.created_at)}</span>
              <Button size="sm" variant="outline" onClick={share} className="gap-2"><Share2 className="size-4" />مشاركة واتساب</Button>
            </div>
            {post.cover_url && <img src={post.cover_url} alt={post.title} className="mt-6 w-full rounded-2xl object-cover" />}
            {post.excerpt && <p className="mt-6 text-lg font-medium text-foreground/80">{post.excerpt}</p>}
            <div className="mt-6 whitespace-pre-line text-base leading-8">{post.body}</div>
          </article>
        )}
      </main>
      <footer className="border-t py-6 text-center text-xs text-muted-foreground"><Copyright /></footer>
    </div>
  );
}
