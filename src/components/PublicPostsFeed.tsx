import { useQuery } from "@tanstack/react-query";
import { Newspaper } from "lucide-react";
import { fetchPublicPosts } from "@/lib/posts";
import { PostCard } from "@/components/PostCard";

export function PublicPostsFeed({ userId, limit, title, subtitle }: { userId?: string; limit?: number; title: string; subtitle?: string }) {
  const { data = [], isLoading, isError } = useQuery({
    queryKey: ["public-posts", userId ?? "all", limit ?? 24],
    queryFn: () => fetchPublicPosts({ userId, limit }),
  });

  const news = data.filter((p) => p.kind === "news" || p.kind === "announcement");
  const others = data.filter((p) => p.kind !== "news" && p.kind !== "announcement");

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-8">
      <div className="mx-auto mb-10 max-w-2xl text-center">
        <h2 className="text-2xl font-black tracking-tight sm:text-4xl">{title}</h2>
        {subtitle && <p className="mt-3 text-sm text-muted-foreground sm:text-base">{subtitle}</p>}
      </div>
      {isLoading ? (
        <p className="text-center text-sm text-muted-foreground">جارٍ تحميل المنشورات…</p>
      ) : isError || data.length === 0 ? (
        <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-2xl border border-dashed p-10 text-center text-muted-foreground">
          <Newspaper className="size-8 text-primary" />
          <p className="text-sm">لا توجد منشورات عامة بعد. ستظهر هنا المقالات والأخبار فور نشرها.</p>
        </div>
      ) : (
        <div className="space-y-12">
          {news.length > 0 && (
            <div>
              <h3 className="mb-5 text-xl font-bold">الأخبار والإعلانات</h3>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {news.map((p) => <PostCard key={p.id} post={p} />)}
              </div>
            </div>
          )}
          {others.length > 0 && (
            <div>
              <h3 className="mb-5 text-xl font-bold">مقالات ونصائح إرشادية</h3>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {others.map((p) => <PostCard key={p.id} post={p} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
