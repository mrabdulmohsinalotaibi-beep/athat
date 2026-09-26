import { Link } from "@tanstack/react-router";
import { ArrowUpLeft, CalendarDays, MessageCircle } from "lucide-react";
import { formatPostDate, kindLabel, type PublicPost } from "@/lib/posts";
import { Button } from "@/components/ui/button";

export function PostCard({ post, featured = false }: { post: PublicPost; featured?: boolean }) {
  function shareOnWhatsApp() {
    const url = "https://athat.app/posts/" + encodeURIComponent(post.slug);
    const message = post.title + "\\n\\n" + (post.excerpt ? post.excerpt + "\\n\\n" : "") + url + "\\n\\nمن منصة الذات";
    window.location.assign("https://api.whatsapp.com/send?text=" + encodeURIComponent(message));
  }

  return (
    <article className={"group overflow-hidden rounded-3xl border border-border/60 bg-card shadow-sm transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl " + (featured ? "grid lg:grid-cols-[1.1fr_0.9fr]" : "flex flex-col")}>
      <Link to="/posts/$slug" params={{ slug: post.slug }} className={"flex flex-col " + (featured ? "lg:order-2" : "flex-1")}>
        {post.cover_url ? (
          <img src={post.cover_url} alt={post.title} loading="lazy" className={"w-full object-cover " + (featured ? "aspect-[16/10] h-full min-h-[260px] lg:aspect-auto" : "aspect-[16/9]")} />
        ) : (
          <div className={"flex w-full items-center justify-center bg-gradient-to-br from-primary/15 via-primary/5 to-accent/10 text-2xl font-black text-primary " + (featured ? "aspect-[16/10] min-h-[260px] lg:aspect-auto" : "aspect-[16/9]")}>
            {kindLabel(post.kind)}
          </div>
        )}
        <div className={"flex flex-1 flex-col text-right " + (featured ? "p-6 sm:p-8" : "p-5")}>
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">{kindLabel(post.kind)}</span>
            <span className="text-xs text-muted-foreground">قراءة عامة</span>
          </div>
          <h3 className={"mt-4 font-black leading-snug group-hover:text-primary " + (featured ? "text-2xl sm:text-3xl" : "text-lg")}>{post.title}</h3>
          {post.excerpt && <p className={"mt-3 line-clamp-3 leading-7 text-muted-foreground " + (featured ? "text-base" : "text-sm")}>{post.excerpt}</p>}
          <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-6 text-xs text-muted-foreground">
            <span>{post.author_name || "الموجه الطلابي"}</span>
            <span className="flex items-center gap-1"><CalendarDays className="size-3.5" />{formatPostDate(post.published_at ?? post.created_at)}</span>
          </div>
        </div>
      </Link>
      <div className={"flex items-center justify-between gap-3 border-t border-border/60 px-5 py-3 " + (featured ? "lg:order-1 lg:border-t-0 lg:border-l" : "")}>
        <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><ArrowUpLeft className="size-3.5 text-primary" />اقرأ التفاصيل</span>
        <Button type="button" variant="ghost" size="sm" onClick={shareOnWhatsApp} className="gap-1.5 font-bold text-[#128C7E] hover:bg-[#25D366]/10 hover:text-[#128C7E]">
          <MessageCircle className="size-4" /> مشاركة واتساب
        </Button>
      </div>
    </article>
  );
}
