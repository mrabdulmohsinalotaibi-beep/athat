import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PublicPostsFeed } from "@/components/PublicPostsFeed";
import { Copyright } from "@/components/Copyright";

export const Route = createFileRoute("/c/$slug")({
  head: () => ({
    meta: [
      { title: "صفحة الموجه الطلابي | منصة الذات" },
      { name: "description", content: "المنشورات العامة والأخبار والمقالات الإرشادية لمدرسة على منصة الذات." },
      { property: "og:title", content: "صفحة الموجه الطلابي | منصة الذات" },
      { property: "og:description", content: "أخبار ومقالات ونصائح إرشادية من الموجه الطلابي." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SchoolPage,
});

function SchoolPage() {
  const { slug } = Route.useParams();
  const { data: school, isLoading } = useQuery({
    queryKey: ["public-school", slug],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_public_school", { p_slug: slug });
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-8">
          <Link to="/" className="flex items-center gap-2 text-sm font-semibold text-primary"><ArrowRight className="size-4" /> منصة الذات</Link>
        </div>
      </header>
      {isLoading ? (
        <p className="py-20 text-center text-muted-foreground">جارٍ التحميل…</p>
      ) : !school ? (
        <div className="py-20 text-center">
          <h1 className="text-2xl font-bold">الصفحة غير موجودة</h1>
          <p className="mt-2 text-muted-foreground">تأكد من صحة الرابط.</p>
        </div>
      ) : (
        <>
          <section className="border-b bg-primary/5 py-12 text-center">
            {school.logo_url && <img src={school.logo_url} alt={school.school_name ?? ""} className="mx-auto mb-4 size-20 object-contain" />}
            <h1 className="text-3xl font-black">{school.school_name || "صفحة الموجه الطلابي"}</h1>
            {school.education_dept && <p className="mt-2 text-muted-foreground">{school.education_dept}</p>}
          </section>
          <PublicPostsFeed userId={school.user_id} title="منشورات الموجه الطلابي" />
        </>
      )}
      <footer className="border-t py-6 text-center text-xs text-muted-foreground"><Copyright /></footer>
    </div>
  );
}
