import { Link } from "@tanstack/react-router";
import { CalendarDays } from "lucide-react";
import { formatPostDate, kindLabel, type PublicPost } from "@/lib/posts";

export function PostCard({ post }: { post: PublicPost }) {
  return (
    <Link
      to="/posts/$slug"
      params={{ slug: post.slug }}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm transition-all hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg"
    >
      {post.cover_url ? (
        <img src={post.cover_url} alt={post.title} loading="lazy" className="aspect-[16/9] w-full object-cover" />
      ) : (
        <div className="flex aspect-[16/9] w-full items-center justify-center bg-primary/10 text-2xl font-black text-primary">
          {kindLabel(post.kind)}
        </div>
      )}
      <div className="flex flex-1 flex-col p-5 text-right">
        <span className="mb-2 inline-flex w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
          {kindLabel(post.kind)}
        </span>
        <h3 className="text-lg font-bold leading-snug group-hover:text-primary">{post.title}</h3>
        {post.excerpt && <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{post.excerpt}</p>}
        <div className="mt-auto flex items-center justify-between pt-4 text-xs text-muted-foreground">
          <span>{post.author_name || "الموجه الطلابي"}</span>
          <span className="flex items-center gap-1">
            <CalendarDays className="size-3.5" />
            {formatPostDate(post.published_at ?? post.created_at)}
          </span>
        </div>
      </div>
    </Link>
  );
}
