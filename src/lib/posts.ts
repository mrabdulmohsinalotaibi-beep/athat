import { supabase } from "@/integrations/supabase/client";

export const POST_KINDS = {
  article: "مقال",
  news: "خبر",
  announcement: "إعلان",
  tip: "نصيحة إرشادية",
} as const;

export type PostKind = keyof typeof POST_KINDS;

export type PublicPost = {
  id: string;
  title: string;
  slug: string;
  kind: string;
  excerpt: string | null;
  body: string;
  cover_url: string | null;
  author_name: string | null;
  published_at: string | null;
  created_at: string;
  user_id: string;
};

export const PUBLIC_POST_FIELDS =
  "id,title,slug,kind,excerpt,body,cover_url,author_name,published_at,created_at,user_id";

export function kindLabel(kind: string): string {
  return POST_KINDS[kind as PostKind] ?? "منشور";
}

export function makeSlug(title: string): string {
  const base = title
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${base || "post"}-${Math.random().toString(36).slice(2, 7)}`;
}

export function formatPostDate(value: string | null | undefined): string {
  if (!value) return "";
  return new Date(value).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" });
}

export async function fetchPublicPosts(opts: { userId?: string | undefined; limit?: number | undefined } = {}) {
  let q = supabase
    .from("posts")
    .select(PUBLIC_POST_FIELDS)
    .eq("is_public", true)
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(opts.limit ?? 24);
  if (opts.userId) q = q.eq("user_id", opts.userId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as PublicPost[];
}
