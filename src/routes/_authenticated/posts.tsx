import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  Copy,
  ExternalLink,
  FileText,
  Globe,
  HeartHandshake,
  Link2,
  Lock,
  Megaphone,
  MessageCircleQuestion,
  ImageIcon,
  Loader2,
  Pencil,
  Plus,
  School,
  ShieldAlert,
  Trash2,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";

import { RequestsInbox } from "@/components/RequestsInbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { POST_KINDS, formatPostDate, kindLabel, makeSlug } from "@/lib/posts";
import { useSchool } from "@/lib/school";

export const Route = createFileRoute("/_authenticated/posts")({
  head: () => ({
    meta: [
      { title: "مدونة الموجه والخدمات | منصة الذات" },
      {
        name: "description",
        content:
          "إدارة مدونة الموجه والخدمات العامة والطلبات الواردة وروابط الاستشارة والبلاغ والإحالة.",
      },
    ],
  }),
  component: CounselorPortalManager,
});

type Draft = {
  id?: string;
  title: string;
  kind: string;
  excerpt: string;
  body: string;
  cover_url: string;
  is_public: boolean;
  published_at?: string | null;
};

type PortalLinkRow = {
  private_blog_token: string;
  public_slug: string | null;
  public_feedback_token: string | null;
};

const EMPTY_ARTICLE: Draft = {
  title: "",
  kind: "article",
  excerpt: "",
  body: "",
  cover_url: "",
  is_public: true,
};

const EMPTY_POST: Draft = {
  title: "",
  kind: "announcement",
  excerpt: "",
  body: "",
  cover_url: "",
  is_public: true,
};

function CounselorPortalManager() {
  const qc = useQueryClient();
  const { data: school } = useSchool();
  const [draft, setDraft] = useState<Draft | null>(null);

  const {
    data: posts = [],
    isError: postsError,
    error: postsQueryError,
    refetch: refetchPosts,
  } = useQuery({
    queryKey: ["my-posts"],
    queryFn: async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      let userId = sessionData.session?.user.id ?? "";
      try {
        const { data: userData, error } = await supabase.auth.getUser();
        if (!error && userData.user) userId = userData.user.id;
      } catch {
        // Use the persisted session during a transient auth/network error.
      }
      if (!userId) throw new Error("انتهت جلسة الدخول؛ سجّل الدخول مجددًا.");

      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async (d: Draft) => {
      if (!d.body.trim() && !d.cover_url.trim()) {
        throw new Error("أضف نصًا أو صورة للمنشور.");
      }
      const fallbackTitle = d.kind === "article" ? "مقال مصور" : "منشور مصور";
      const finalTitle = d.title.trim() || fallbackTitle;

      const row = {
        title: finalTitle,
        kind: d.kind,
        excerpt: d.excerpt.trim() || null,
        body: d.body.trim(),
        cover_url: d.cover_url.trim() || null,
        is_public: d.is_public,
        author_name: school?.counselor_name || school?.school_name || null,
        published_at: d.is_public
          ? d.published_at ?? new Date().toISOString()
          : d.published_at ?? null,
      };

      const result = d.id
        ? await supabase.from("posts").update(row).eq("id", d.id)
        : await supabase.from("posts").insert({ ...row, slug: makeSlug(finalTitle) });

      if (result.error) throw result.error;
    },
    onSuccess: () => {
      toast.success("تم حفظ المحتوى");
      setDraft(null);
      qc.invalidateQueries({ queryKey: ["my-posts"] });
      qc.invalidateQueries({ queryKey: ["public-counselor-blog"] });
      qc.invalidateQueries({ queryKey: ["public-posts"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم الحذف");
      qc.invalidateQueries({ queryKey: ["my-posts"] });
      qc.invalidateQueries({ queryKey: ["public-counselor-blog"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const articles = useMemo(() => posts.filter((item) => item.kind === "article"), [posts]);
  const shortPosts = useMemo(() => posts.filter((item) => item.kind !== "article"), [posts]);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-bl from-primary/10 via-card to-accent/10 p-5 shadow-sm sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black text-primary">المساحة الخاصة بالموجه</p>
            <h1 className="mt-1 text-2xl font-black sm:text-3xl">مدونة الموجه والخدمات</h1>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
              من هنا تدير ما يظهر للعامة، وتستقبل طلبات الاستشارة والبلاغات، وتشارك رابط إحالة خاص بالمعلمين.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setDraft({ ...EMPTY_POST })}>
              <Plus className="size-4" /> منشور جديد
            </Button>
            <Button variant="outline" onClick={() => setDraft({ ...EMPTY_ARTICLE })}>
              <BookOpen className="size-4" /> مقال جديد
            </Button>
          </div>
        </div>
      </section>

      <PortalLinksPanel />

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <ServiceCard
          icon={Megaphone}
          title="المنشورات"
          description="إعلانات ونصائح وأخبار قصيرة تظهر في مدونتك العامة."
          count={shortPosts.length}
          action="إضافة منشور"
          onClick={() => setDraft({ ...EMPTY_POST })}
        />
        <ServiceCard
          icon={BookOpen}
          title="المقالات"
          description="مقالات إرشادية أطول للطلاب وأولياء الأمور والمعلمين."
          count={articles.length}
          action="إضافة مقال"
          onClick={() => setDraft({ ...EMPTY_ARTICLE })}
        />
        <ServiceCard
          icon={HeartHandshake}
          title="الاستشارات والبلاغات"
          description="طلبات الطالب وولي الأمر والبلاغات السرية تظهر مباشرة بالأسفل."
          action="عرض الطلبات"
          href="#incoming-requests"
        />
        <ServiceCard
          icon={UsersRound}
          title="إحالة المعلمين"
          description="رابط مستقل ترسله للمعلمين لإحالة الحالات التي يعالجها الموجه الطلابي."
          action="نسخ الرابط من الأعلى"
          href="#portal-links"
        />
      </section>

      {draft && (
        <ContentEditor
          draft={draft}
          onChange={setDraft}
          onSave={() => save.mutate(draft)}
          onCancel={() => setDraft(null)}
          saving={save.isPending}
        />
      )}

      {postsError && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <p className="font-black text-destructive">تعذّر تحميل محتوى المدونة</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {postsQueryError instanceof Error ? postsQueryError.message : "حدث خطأ أثناء جلب المحتوى."}
          </p>
          <Button className="mt-3" size="sm" variant="outline" onClick={() => void refetchPosts()}>
            إعادة المحاولة
          </Button>
        </div>
      )}

      <ContentSection
        title="المنشورات"
        subtitle="الإعلانات والنصائح والأخبار القصيرة."
        icon={Megaphone}
        items={shortPosts}
        onCreate={() => setDraft({ ...EMPTY_POST })}
        onEdit={(item) =>
          setDraft({
            id: item.id,
            title: item.title,
            kind: item.kind,
            excerpt: item.excerpt ?? "",
            body: item.body,
            cover_url: item.cover_url ?? "",
            is_public: item.is_public,
            published_at: item.published_at,
          })
        }
        onDelete={(id) => remove.mutate(id)}
      />

      <ContentSection
        title="المقالات"
        subtitle="المحتوى الإرشادي المطول الذي يظهر في قسم المقالات في الصفحة العامة."
        icon={BookOpen}
        items={articles}
        onCreate={() => setDraft({ ...EMPTY_ARTICLE })}
        onEdit={(item) =>
          setDraft({
            id: item.id,
            title: item.title,
            kind: item.kind,
            excerpt: item.excerpt ?? "",
            body: item.body,
            cover_url: item.cover_url ?? "",
            is_public: item.is_public,
            published_at: item.published_at,
          })
        }
        onDelete={(id) => remove.mutate(id)}
      />

      <section id="incoming-requests" className="scroll-mt-24 space-y-4">
        <div>
          <p className="text-xs font-black text-primary">خاص بالموجه فقط</p>
          <h2 className="mt-1 text-xl font-black">الطلبات الواردة</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            الاستشارة الفردية والبلاغ السري وإحالة المعلم تظهر هنا فور وصولها من الروابط العامة.
          </p>
        </div>
        <RequestsInbox />
      </section>
    </div>
  );
}

function PortalLinksPanel() {
  const { data: row, isError, error, refetch } = useQuery({
    queryKey: ["my-public-slug"],
    queryFn: async (): Promise<PortalLinkRow | null> => {
      const { data: sessionData } = await supabase.auth.getSession();
      let userId = sessionData.session?.user.id ?? "";
      try {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (!authError && authData.user) userId = authData.user.id;
      } catch {
        // Keep the local session as fallback.
      }
      if (!userId) throw new Error("انتهت جلسة الدخول؛ سجّل الدخول مجددًا.");

      const { data, error: queryError } = await supabase
        .from("school_settings")
        .select("private_blog_token,public_slug,public_feedback_token")
        .eq("user_id", userId)
        .order("created_at")
        .limit(1)
        .maybeSingle();

      if (queryError) throw queryError;
      return data as PortalLinkRow | null;
    },
  });

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const token = row?.private_blog_token ?? "";
  const school = row?.public_slug ?? "";
  const feedbackToken = row?.public_feedback_token ?? "";
  const qs = new URLSearchParams();
  if (school) qs.set("school", school);
  if (token) qs.set("portal", token);
  if (feedbackToken) qs.set("feedback", feedbackToken);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";

  const links = [
    {
      key: "blog",
      title: "رابط المدونة العامة",
      description: "ترسله للطلاب وأولياء الأمور للاطلاع على المنشورات والمقالات والخدمات.",
      icon: Globe,
      url: token
        ? `${origin}/blog/${token}?${new URLSearchParams({
            ...(school ? { school } : {}),
            ...(feedbackToken ? { feedback: feedbackToken } : {}),
          }).toString()}`
        : "",
    },
    {
      key: "consultation",
      title: "طلب استشارة فردية",
      description: "رابط مباشر للطالب أو ولي الأمر لطلب مقابلة أو استشارة.",
      icon: MessageCircleQuestion,
      url: token ? `${origin}/forms/consultation${suffix}` : "",
    },
    {
      key: "report",
      title: "بلاغ سري",
      description: "رابط مباشر للإبلاغ السري عن التنمر أو المشكلات التي تمس سلامة الطالب.",
      icon: ShieldAlert,
      url: token ? `${origin}/forms/report${suffix}` : "",
    },
    {
      key: "teacher-referral",
      title: "رابط إحالة طالب للمعلمين",
      description:
        "رابط خاص ترسله للمعلمين لإحالة تدني التحصيل، الغياب والتأخر، السلوك، التنمر، الانسحاب أو الحالات النفسية للموجه.",
      icon: School,
      url: token ? `${origin}/forms/referral${suffix}` : "",
      teacherOnly: true,
    },
  ];

  async function copyLink(url: string, label: string) {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    toast.success(`تم نسخ ${label}`);
  }

  return (
    <section id="portal-links" className="scroll-mt-24 rounded-3xl border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex items-start gap-3">
        <span className="rounded-xl bg-primary/10 p-2.5 text-primary">
          <Link2 className="size-5" />
        </span>
        <div>
          <h2 className="font-black">روابط المدونة والخدمات</h2>
          <p className="mt-1 text-xs leading-6 text-muted-foreground">
            كل رابط مرتبط بحسابك؛ أي طلب يُرسل من هذه الروابط يصل إلى صندوقك في هذه الصفحة.
          </p>
        </div>
      </div>

      {isError && (
        <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs">
          <span className="text-destructive">
            {error instanceof Error ? error.message : "تعذّر تجهيز الروابط."}
          </span>
          <Button className="mr-2" size="sm" variant="ghost" onClick={() => void refetch()}>
            إعادة المحاولة
          </Button>
        </div>
      )}

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {links.map((item) => {
          const Icon = item.icon;
          return (
            <article
              key={item.key}
              className={`rounded-2xl border p-4 ${item.teacherOnly ? "border-primary/30 bg-primary/[0.04]" : "bg-background"}`}
            >
              <div className="flex items-start gap-3">
                <span className="rounded-xl bg-primary/10 p-2 text-primary">
                  <Icon className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-black">{item.title}</h3>
                    {item.teacherOnly && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-black text-primary">
                        للمعلمين
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs leading-6 text-muted-foreground">{item.description}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!item.url}
                  onClick={() => void copyLink(item.url, item.title)}
                >
                  <Copy className="size-4" /> نسخ الرابط
                </Button>
                <Button asChild size="sm" variant="ghost" disabled={!item.url}>
                  <a href={item.url || "#"} target="_blank" rel="noreferrer">
                    <ExternalLink className="size-4" /> فتح
                  </a>
                </Button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ServiceCard({
  icon: Icon,
  title,
  description,
  count,
  action,
  onClick,
  href,
}: {
  icon: typeof Megaphone;
  title: string;
  description: string;
  count?: number;
  action: string;
  onClick?: () => void;
  href?: string;
}) {
  return (
    <article className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <span className="rounded-xl bg-primary/10 p-2 text-primary">
          <Icon className="size-5" />
        </span>
        {typeof count === "number" && <strong className="text-2xl">{count}</strong>}
      </div>
      <h3 className="mt-3 font-black">{title}</h3>
      <p className="mt-1 min-h-12 text-xs leading-6 text-muted-foreground">{description}</p>
      {onClick ? (
        <Button className="mt-3 px-0" variant="ghost" size="sm" onClick={onClick}>
          {action}
        </Button>
      ) : (
        <a href={href} className="mt-3 inline-flex text-xs font-black text-primary hover:underline">
          {action}
        </a>
      )}
    </article>
  );
}

async function renderPostImage(file: File, targetBytes = 1_800_000): Promise<Blob> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("تعذّر قراءة الصورة المحددة."));
      img.src = objectUrl;
    });

    const maxSide = targetBytes <= 900_000 ? 1400 : 1800;
    const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("تعذّر تجهيز الصورة للرفع.");
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    let quality = 0.86;
    let blob: Blob | null = null;
    do {
      blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
      quality -= 0.08;
    } while (blob && blob.size > targetBytes && quality >= 0.38);

    if (!blob) throw new Error("تعذّر ضغط الصورة.");
    return blob;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function compressPostImage(file: File): Promise<File> {
  if (file.size <= 1_800_000 && ["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return file;
  }
  const blob = await renderPostImage(file, 1_800_000);
  if (blob.size > 2_000_000) throw new Error("الصورة كبيرة جدًا. اختر صورة أصغر من 10 ميجابايت.");
  return new File([blob], "post-image.webp", { type: "image/webp", lastModified: Date.now() });
}

async function postImageDataUrl(file: File): Promise<string> {
  const blob = await renderPostImage(file, 850_000);
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new Error("تعذّر تجهيز الصورة للحفظ."));
    reader.onerror = () => reject(new Error("تعذّر تجهيز الصورة للحفظ."));
    reader.readAsDataURL(blob);
  });
}

function ContentEditor({
  draft,
  onChange,
  onSave,
  onCancel,
  saving,
}: {
  draft: Draft;
  onChange: (draft: Draft) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [uploading, setUploading] = useState(false);

  async function uploadImage(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("اختر ملف صورة فقط.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("حجم الصورة يجب ألا يتجاوز 10 ميجابايت.");
      return;
    }

    setUploading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("انتهت جلسة الدخول؛ سجّل الدخول مجددًا.");

      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const safeExtension = extension.replace(/[^a-z0-9]/g, "") || "jpg";
      const fileId = `${Date.now()}-${crypto.randomUUID()}`;
      const primaryPath = `${uid}/posts/${fileId}.${safeExtension}`;

      // Preferred bucket for public post media.
      const primaryUpload = await supabase.storage
        .from("post-media")
        .upload(primaryPath, file, {
          contentType: file.type,
          cacheControl: "3600",
          upsert: false,
        });

      let publicUrl = "";

      if (!primaryUpload.error) {
        publicUrl = supabase.storage.from("post-media").getPublicUrl(primaryPath).data.publicUrl;
      } else {
        // Older production databases may not yet have post-media or its policies.
        // Try the existing public avatar bucket, then fall back to an embedded,
        // compressed image so the user is never blocked by Storage RLS.
        try {
          const fallbackFile = await compressPostImage(file);
          const fallbackPath = `${uid}/posts/${fileId}.webp`;
          const fallbackUpload = await supabase.storage
            .from("user-avatars")
            .upload(fallbackPath, fallbackFile, {
              contentType: fallbackFile.type,
              cacheControl: "3600",
              upsert: false,
            });

          if (!fallbackUpload.error) {
            publicUrl = supabase.storage.from("user-avatars").getPublicUrl(fallbackPath).data.publicUrl;
          }
        } catch {
          // Continue to the embedded-image fallback below.
        }

        if (!publicUrl) {
          publicUrl = await postImageDataUrl(file);
        }
      }

      if (!publicUrl) throw new Error("تعذّر تجهيز الصورة. جرّب صورة أخرى.");

      onChange({ ...draft, cover_url: publicUrl });
      toast.success("تم إرفاق الصورة بنجاح");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذّر رفع الصورة");
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="space-y-4 rounded-3xl border border-primary/20 bg-card p-5 shadow-sm">
      <div>
        <p className="text-xs font-black text-primary">{draft.kind === "article" ? "مقال" : "منشور"}</p>
        <h2 className="mt-1 text-xl font-black">{draft.id ? "تعديل المحتوى" : "إضافة محتوى جديد"}</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          يمكنك نشر نص مع صورة، أو صورة فقط بدون كتابة محتوى.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>العنوان (اختياري للمنشور المصور)</Label>
          <Input value={draft.title} onChange={(e) => onChange({ ...draft, title: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>النوع</Label>
          <select
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={draft.kind}
            onChange={(e) => onChange({ ...draft, kind: e.target.value })}
          >
            {Object.entries(POST_KINDS).map(([key, value]) => (
              <option key={key} value={key}>{value}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>مقدمة مختصرة</Label>
        <Input
          value={draft.excerpt}
          onChange={(e) => onChange({ ...draft, excerpt: e.target.value })}
          placeholder="اختياري — سطر مختصر يظهر قبل فتح المحتوى"
        />
      </div>
      <div className="space-y-2">
        <Label>المحتوى</Label>
        <Textarea
          rows={8}
          value={draft.body}
          onChange={(e) => onChange({ ...draft, body: e.target.value })}
          placeholder="اختياري إذا كان المنشور أو الإعلان عبارة عن صورة فقط"
        />
      </div>

      <div className="space-y-3 rounded-2xl border border-dashed bg-muted/20 p-4">
        <div className="flex items-center gap-2">
          <ImageIcon className="size-5 text-primary" />
          <div>
            <Label>صورة المقال / الإعلان / المنشور</Label>
            <p className="text-[11px] text-muted-foreground">
              ارفع الصورة مباشرة من الجهاز أو الجوال. JPG وPNG وWEBP حتى 10 ميجابايت.
            </p>
          </div>
        </div>

        <Input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          disabled={uploading}
          onChange={(e) => {
            const file = e.target.files?.[0] ?? null;
            void uploadImage(file);
            e.currentTarget.value = "";
          }}
        />

        {uploading && (
          <div className="flex items-center gap-2 text-xs font-bold text-primary">
            <Loader2 className="size-4 animate-spin" />
            جارٍ رفع الصورة…
          </div>
        )}

        {draft.cover_url && (
          <div className="overflow-hidden rounded-2xl border bg-background">
            <img
              src={draft.cover_url}
              alt="معاينة الصورة"
              className="max-h-[420px] w-full object-contain"
            />
            <div className="flex flex-wrap items-center justify-between gap-2 p-3">
              <span className="text-xs text-muted-foreground">معاينة الصورة المرفقة</span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onChange({ ...draft, cover_url: "" })}
              >
                إزالة الصورة
              </Button>
            </div>
          </div>
        )}

        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer font-bold">أو استخدم رابط صورة خارجي</summary>
          <Input
            className="mt-2"
            dir="ltr"
            placeholder="https://..."
            value={draft.cover_url}
            onChange={(e) => onChange({ ...draft, cover_url: e.target.value })}
          />
        </details>
      </div>

      <div className="flex items-center gap-3">
        <Switch checked={draft.is_public} onCheckedChange={(value) => onChange({ ...draft, is_public: value })} />
        <span className="text-sm">{draft.is_public ? "يظهر في المدونة العامة" : "مسودة خاصة لا تظهر للعامة"}</span>
      </div>
      <div className="flex gap-2">
        <Button onClick={onSave} disabled={saving || uploading}>
          {saving ? "جارٍ الحفظ…" : "حفظ"}
        </Button>
        <Button variant="outline" onClick={onCancel}>إلغاء</Button>
      </div>
    </section>
  );
}

function ContentSection({
  title,
  subtitle,
  icon: Icon,
  items,
  onCreate,
  onEdit,
  onDelete,
}: {
  title: string;
  subtitle: string;
  icon: typeof FileText;
  items: any[];
  onCreate: () => void;
  onEdit: (item: any) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <section className="rounded-3xl border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-primary/10 p-2 text-primary"><Icon className="size-5" /></span>
          <div>
            <h2 className="font-black">{title}</h2>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={onCreate}><Plus className="size-4" /> إضافة</Button>
      </div>

      <div className="mt-4 grid gap-3">
        {items.length === 0 && (
          <p className="rounded-2xl border border-dashed p-7 text-center text-sm text-muted-foreground">
            لا يوجد محتوى في هذا القسم حتى الآن.
          </p>
        )}
        {items.map((item) => (
          <article key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-background p-4">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              {item.cover_url && (
                <img
                  src={item.cover_url}
                  alt={item.title}
                  className="size-16 shrink-0 rounded-xl border object-cover"
                />
              )}
              <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                <span className="rounded-full bg-primary/10 px-2 py-0.5 font-bold text-primary">{kindLabel(item.kind)}</span>
                {item.is_public ? (
                  <span className="inline-flex items-center gap-1"><Globe className="size-3" /> منشور للعامة</span>
                ) : (
                  <span className="inline-flex items-center gap-1"><Lock className="size-3" /> مسودة خاصة</span>
                )}
                <span>{formatPostDate(item.created_at)}</span>
              </div>
              <h3 className="mt-1 truncate font-black">{item.title}</h3>
              {item.excerpt && <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{item.excerpt}</p>}
              {!item.body && item.cover_url && (
                <p className="mt-1 text-xs font-bold text-primary">منشور مصور</p>
              )}
              </div>
            </div>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" title="تعديل" onClick={() => onEdit(item)}>
                <Pencil className="size-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                title="حذف"
                onClick={() => {
                  if (confirm("حذف هذا المحتوى نهائيًا؟")) onDelete(item.id);
                }}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
