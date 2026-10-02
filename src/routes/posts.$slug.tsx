import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CalendarDays, Home, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PUBLIC_POST_FIELDS, formatPostDate, kindLabel, type PublicPost } from "@/lib/posts";

export const Route = createFileRoute("/posts/$slug")({
  validateSearch: (search: Record<string, unknown>): { portal?: string } => { const portal = typeof search["portal"] === "string" ? search["portal"] : ""; return portal ? { portal } : {}; },
  head: () => ({
    meta: [
      { title: "منشور | الذات" },
      { name: "description", content: "مقالات وأخبار ونصائح توجيهية من الموجهين الطلابيين في الذات." },
      { property: "og:title", content: "منشور | الذات" },
      { property: "og:description", content: "مقالات وأخبار ونصائح توجيهية من الذات." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PostPage,
});

function PostPage() {
  const { slug } = Route.useParams();
  const { portal } = Route.useSearch();
  const blogHref = portal ? `/blog/${encodeURIComponent(portal)}` : "/";
  const { data: post, isLoading } = useQuery({
    queryKey: ["public-post", slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("posts").select(PUBLIC_POST_FIELDS).eq("slug", slug).eq("is_public", true).maybeSingle();
      if (error) throw error;
      return data as PublicPost | null;
    },
  });

  function sharePost() {
    if (!post) return;

    const cleanSlug = decodeURIComponent(post.slug);
    const url = `${window.location.origin}/posts/${cleanSlug}${portal ? `?portal=${encodeURIComponent(portal)}` : ""}`;
    const excerpt = post.excerpt?.trim();
    const message = [post.title, excerpt, url, "من الذات"].filter(Boolean).join("\n\n");
    if (navigator.share) {
      void navigator.share({ title: post.title, text: excerpt || post.title, url }).catch(() => undefined);
      return;
    }
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.location.assign(whatsappUrl);
  }

  return (
    <div dir="rtl" className="min-h-screen bg-[#F8F5EF] text-[#264938]">
      <header className="sticky top-0 z-20 border-b border-[#D9C0A3]/45 bg-[#FFFDF9]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-3 py-2 sm:px-5">
          <a href={blogHref} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-black text-[#264938] hover:bg-[#E4ECDF]"><ArrowRight className="size-4" /> المدونة</a>
          <div className="flex items-center gap-2">
            <img src="/athat-logo-final.png?v=20261002-final" alt="الذات" className="size-8 rounded-lg object-contain" />
            <span className="text-xs font-black">مدونة الموجه الطلابي</span>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-3 py-5 sm:px-5 sm:py-8">
        {isLoading ? (
          <div className="animate-pulse space-y-3"><div className="h-4 w-20 rounded bg-[#E4ECDF]" /><div className="h-10 w-4/5 rounded bg-[#E4ECDF]" /><div className="h-56 rounded-2xl bg-[#E4ECDF]" /></div>
        ) : !post ? (
          <div className="rounded-2xl border border-dashed border-[#D9C0A3] bg-[#FFFDF9] p-10 text-center">
            <Home className="mx-auto size-7 text-[#9A6C78]" /><h1 className="mt-3 text-lg font-black">المنشور غير متاح</h1>
            <a href={blogHref} className="mt-4 inline-block rounded-xl bg-[#264938] px-4 py-2 text-xs font-black text-white">العودة إلى المدونة</a>
          </div>
        ) : (
          <article className="overflow-hidden rounded-2xl border border-[#D9C0A3]/50 bg-[#FFFDF9] shadow-sm">
            {post.cover_url && <img src={post.cover_url} alt={post.title} className="max-h-[520px] w-full object-cover" />}
            <div className="p-4 sm:p-6">
              <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold">
                <span className="rounded-full bg-[#E4ECDF] px-2.5 py-1 text-[#264938]">{kindLabel(post.kind)}</span>
                <span className="inline-flex items-center gap-1 text-muted-foreground"><CalendarDays className="size-3.5" />{formatPostDate(post.published_at ?? post.created_at)}</span>
              </div>
              <h1 className="mt-3 text-2xl font-black leading-tight sm:text-3xl">{post.title}</h1>
              <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span>{post.author_name || "الموجه الطلابي"}</span>
                <button type="button" onClick={sharePost} className="inline-flex items-center gap-1.5 rounded-lg border border-[#D9C0A3]/55 px-2.5 py-1.5 font-black text-[#4A141F]"><Share2 className="size-4" /> مشاركة</button>
              </div>
              {post.excerpt && <p className="mt-5 rounded-xl bg-[#F4ECE3]/65 p-3 text-sm font-bold leading-7">{post.excerpt}</p>}
              <div className="mt-5 whitespace-pre-line text-sm leading-8 text-[#264938]/90 sm:text-base">{post.body}</div>
            </div>
          </article>
        )}
      </main>
      <footer className="border-t border-[#D9C0A3]/40 bg-[#FFFDF9] px-4 py-4 text-center text-[10px] text-muted-foreground">مدونة الموجه الطلابي · الذات | ATHAT</footer>
    </div>
  );
}
