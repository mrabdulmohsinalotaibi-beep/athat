import { useMemo, useState } from "react";
import { Newspaper, Sparkles } from "lucide-react";
import { fetchPublicPosts, type PublicPost } from "@/lib/posts";
import { PostCard } from "@/components/PostCard";

const filters = [
  { key: "all", label: "الكل" },
  { key: "article", label: "مقالات" },
  { key: "news", label: "أخبار وإعلانات" },
  { key: "tip", label: "نصائح إرشادية" },
] as const;

type FilterKey = (typeof filters)[number]["key"];

function matchesFilter(post: PublicPost, filter: FilterKey) {
  if (filter === "all") return true;
  if (filter === "article") return post.kind === "article";
  if (filter === "news") return post.kind === "news" || post.kind === "announcement";
  return post.kind === "tip";
}

function LoadingCard() {
  return <div className="h-[310px] animate-pulse rounded-2xl border border-border/60 bg-muted/30" />;
}

export function PublicPostsFeed({ userId, limit, title, subtitle }: { userId?: string; limit?: number; title: string; subtitle?: string }) {
  const [filter, setFilter] = useState<FilterKey>("all");
  const { data = [], isLoading, isError } = useQuery({
    queryKey: ["public-posts", userId ?? "all", limit ?? 24],
    queryFn: () => fetchPublicPosts({ userId, limit }),
  });

  const filteredPosts = useMemo(() => data.filter((post) => matchesFilter(post, filter)), [data, filter]);
  const featured = filter === "all" ? filteredPosts[0] : undefined;
  const remaining = featured ? filteredPosts.slice(1) : filteredPosts;

  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-8 sm:py-24">
      <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <div className="mb-4 inline-flex items-center gap-2 text-xs font-bold tracking-wide text-accent">
            <Sparkles className="size-4" /> من مجلة الذات
          </div>
          <h2 className="text-3xl font-black tracking-tight sm:text-5xl">{title}</h2>
          {subtitle && <p className="mt-4 max-w-xl text-base leading-8 text-muted-foreground sm:text-lg">{subtitle}</p>}
        </div>
        <p className="max-w-xs text-sm leading-7 text-muted-foreground lg:text-left">محتوى عام يفتح لك نافذة على الممارسة الإرشادية، ويُشارك بسهولة مع من يهمه الأمر.</p>
      </div>

      <div className="mt-8 flex flex-wrap gap-2" role="tablist" aria-label="تصفية المنشورات العامة">
        {filters.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={filter === item.key}
            onClick={() => setFilter(item.key)}
            className={"rounded-full border px-4 py-2 text-sm font-bold transition-colors " + (filter === item.key ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-primary")}
          >
            {item.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <LoadingCard />
          <LoadingCard />
          <LoadingCard />
        </div>
      ) : isError || data.length === 0 ? (
        <div className="mx-auto mt-10 flex max-w-lg flex-col items-center gap-4 rounded-3xl border border-dashed border-primary/25 bg-primary/5 p-12 text-center text-muted-foreground">
          <div className="rounded-2xl bg-primary/10 p-4 text-primary"><Newspaper className="size-8" /></div>
          <h3 className="text-lg font-bold text-foreground">المجلة تستعد لأول منشوراتها</h3>
          <p className="text-sm leading-7">ستظهر هنا المقالات والأخبار والنصائح الإرشادية فور نشرها للعامة.</p>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">لا توجد منشورات في هذا التصنيف حاليًا.</div>
      ) : (
        <div className="mt-10 space-y-6">
          {featured && <PostCard post={featured} featured />}
          {remaining.length > 0 && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {remaining.map((post) => <PostCard key={post.id} post={post} />)}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
