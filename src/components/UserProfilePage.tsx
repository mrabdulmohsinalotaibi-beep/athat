import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Camera,
  CheckCircle2,
  KeyRound,
  Loader2,
  Mail,
  Save,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { arabicAuthError } from "@/lib/auth-errors";

const ROLE_OPTIONS = [
  "الموجه الطلابي",
  "مساعد الموجه",
  "وكيل شؤون الطلاب",
  "مدير المدرسة",
  "معلم/ـة",
];

type UserProfile = {
  id: string;
  full_name: string | null;
  job_title: string | null;
  phone: string | null;
  avatar_path: string | null;
  bio: string | null;
  school_role: string | null;
};

function initials(value: string) {
  return (
    value
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("") || "م"
  );
}

export function UserProfilePage() {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [uploading, setUploading] = useState(false);

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["auth-user"],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) throw error || new Error("لم يتم العثور على جلسة دخول.");
      return data.user;
    },
  });

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["user-profile", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("user_profiles")
        .select("*")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as UserProfile | null;
    },
  });

  const displayName =
    profile?.full_name ||
    String(user?.user_metadata?.full_name || user?.user_metadata?.name || "الموجه الطلابي");
  const avatarUrl = useMemo(() => {
    if (!profile?.avatar_path) return "";
    return supabase.storage.from("user-avatars").getPublicUrl(profile.avatar_path).data.publicUrl;
  }, [profile?.avatar_path]);

  const saveProfile = useMutation({
    mutationFn: async (form: HTMLFormElement) => {
      if (!user) throw new Error("لم يتم العثور على المستخدم.");
      const values = new FormData(form);
      const payload = {
        id: user.id,
        full_name: String(values.get("full_name") || "").trim() || null,
        job_title: String(values.get("job_title") || "").trim() || null,
        phone: String(values.get("phone") || "").trim() || null,
        school_role: String(values.get("school_role") || "الموجه الطلابي"),
        bio: String(values.get("bio") || "").trim() || null,
        avatar_path: profile?.avatar_path || null,
      };
      const { error } = await (supabase as any).from("user_profiles").upsert(payload);
      if (error) throw error;
      const { error: authError } = await supabase.auth.updateUser({
        data: { full_name: payload.full_name || "", name: payload.full_name || "" },
      });
      if (authError) throw authError;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["user-profile", user?.id] });
      await queryClient.invalidateQueries({ queryKey: ["auth-user"] });
      toast.success("تم حفظ بيانات الملف الشخصي.");
    },
    onError: (error: Error) => toast.error(arabicAuthError(error.message)),
  });

  async function uploadAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith("image/") || file.size > 2 * 1024 * 1024) {
      toast.error("اختر صورة JPG أو PNG أو WEBP بحجم لا يتجاوز 2 ميجابايت.");
      event.target.value = "";
      return;
    }

    setUploading(true);
    try {
      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/avatar-${Date.now()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("user-avatars")
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
        });
      if (uploadError) throw uploadError;

      const { error: profileError } = await (supabase as any).from("user_profiles").upsert({
        id: user.id,
        full_name: profile?.full_name || String(user.user_metadata?.full_name || "") || null,
        avatar_path: path,
      });
      if (profileError) throw profileError;

      if (profile?.avatar_path)
        void supabase.storage.from("user-avatars").remove([profile.avatar_path]);
      await queryClient.invalidateQueries({ queryKey: ["user-profile", user.id] });
      toast.success("تم تحديث الصورة الشخصية.");
    } catch (error) {
      toast.error(`تعذّر رفع الصورة: ${(error as Error).message}`);
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  async function updatePassword(event: React.FormEvent) {
    event.preventDefault();
    if (newPassword.length < 8) {
      toast.error("استخدم كلمة مرور من 8 أحرف على الأقل.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("تأكيد كلمة المرور لا يطابق كلمة المرور الجديدة.");
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast.error(arabicAuthError(error.message));
      return;
    }
    setNewPassword("");
    setConfirmPassword("");
    toast.success("تم تغيير كلمة المرور بنجاح.");
  }

  if (userLoading || profileLoading) {
    return (
      <div className="rounded-3xl border bg-card p-8 text-center text-sm text-muted-foreground">
        جارٍ تحميل الملف الشخصي...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6" dir="rtl">
      <section className="overflow-hidden rounded-[2rem] border border-primary/15 bg-gradient-to-l from-primary via-primary/95 to-[oklch(0.29_0.09_25)] p-6 text-primary-foreground shadow-xl shadow-primary/15 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="relative self-start">
            <Avatar className="size-24 border-4 border-white/35 bg-white/15 text-2xl font-black text-white shadow-xl">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={`صورة ${displayName}`} />}
              <AvatarFallback className="bg-white/15 text-white">
                {initials(displayName)}
              </AvatarFallback>
            </Avatar>
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="absolute -bottom-1 -left-1 size-9 rounded-full shadow-lg"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              title="تغيير الصورة الشخصية"
            >
              {uploading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Camera className="size-4" />
              )}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={uploadAvatar}
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-amber-200">حسابي الشخصي</p>
            <h1 className="mt-1 truncate text-2xl font-black sm:text-3xl">{displayName}</h1>
            <p className="mt-2 text-sm text-primary-foreground/75">
              {profile?.job_title || profile?.school_role || "الموجه الطلابي"}
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 px-4 py-3 text-xs leading-6 backdrop-blur">
            <p className="font-bold">حماية الحساب</p>
            <p className="text-primary-foreground/75">
              أدر بياناتك وصورتك وكلمة المرور من مكان واحد.
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
        <section className="rounded-3xl border bg-card p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center gap-2">
            <div className="rounded-xl bg-primary/10 p-2 text-primary">
              <UserRound className="size-5" />
            </div>
            <div>
              <h2 className="font-black">بيانات الملف الشخصي</h2>
              <p className="text-xs text-muted-foreground">
                تظهر لك داخل النظام ولا تُشارك مع المستفيدين.
              </p>
            </div>
          </div>
          <form
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              saveProfile.mutate(event.currentTarget);
            }}
          >
            <div>
              <Label htmlFor="profile-full-name" className="mb-1.5 block">
                الاسم الكامل
              </Label>
              <Input
                id="profile-full-name"
                name="full_name"
                defaultValue={profile?.full_name || displayName}
                placeholder="الاسم الكامل"
              />
            </div>
            <div>
              <Label htmlFor="profile-role" className="mb-1.5 block">
                الدور في المدرسة
              </Label>
              <select
                id="profile-role"
                name="school_role"
                defaultValue={profile?.school_role || "الموجه الطلابي"}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {ROLE_OPTIONS.map((role) => (
                  <option key={role}>{role}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="profile-title" className="mb-1.5 block">
                المسمى الوظيفي
              </Label>
              <Input
                id="profile-title"
                name="job_title"
                defaultValue={profile?.job_title || ""}
                placeholder="مثال: موجه طلابي"
              />
            </div>
            <div>
              <Label htmlFor="profile-phone" className="mb-1.5 block">
                رقم الجوال المهني
              </Label>
              <Input
                id="profile-phone"
                name="phone"
                dir="ltr"
                defaultValue={profile?.phone || ""}
                placeholder="05XXXXXXXX"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="profile-email" className="mb-1.5 block">
                البريد الإلكتروني المسجل
              </Label>
              <div
                className="flex h-10 items-center gap-2 rounded-md border bg-muted/35 px-3 text-sm"
                dir="ltr"
              >
                <Mail className="size-4 text-muted-foreground" />
                {user?.email || "—"}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                يُستخدم هذا البريد للدخول واستعادة كلمة المرور.
              </p>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="profile-bio" className="mb-1.5 block">
                نبذة مهنية مختصرة
              </Label>
              <Textarea
                id="profile-bio"
                name="bio"
                defaultValue={profile?.bio || ""}
                rows={4}
                placeholder="مجالات الاهتمام، أوقات التواصل، أو ملاحظة مهنية داخلية..."
              />
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <Button type="submit" disabled={saveProfile.isPending}>
                {saveProfile.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}{" "}
                حفظ البيانات
              </Button>
            </div>
          </form>
        </section>

        <section className="rounded-3xl border bg-card p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center gap-2">
            <div className="rounded-xl bg-amber-500/10 p-2 text-amber-700">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <h2 className="font-black">أمان الحساب</h2>
              <p className="text-xs text-muted-foreground">غيّر كلمة المرور متى احتجت.</p>
            </div>
          </div>
          <form onSubmit={updatePassword} className="space-y-4">
            <div>
              <Label htmlFor="account-new-password" className="mb-1.5 block">
                كلمة المرور الجديدة
              </Label>
              <Input
                id="account-new-password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                dir="ltr"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="account-confirm-password" className="mb-1.5 block">
                تأكيد كلمة المرور
              </Label>
              <Input
                id="account-confirm-password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                dir="ltr"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </div>
            <p className="rounded-xl bg-muted/60 p-3 text-xs leading-6 text-muted-foreground">
              استخدم 8 أحرف على الأقل ولا تشارك كلمة المرور مع أي شخص. يمكن استعادتها لاحقًا من رابط
              «نسيت كلمة المرور؟».
            </p>
            <Button type="submit" className="w-full">
              <KeyRound className="size-4" /> تحديث كلمة المرور
            </Button>
          </form>
          <div className="mt-5 flex items-start gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs leading-6 text-emerald-800">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
            يمكن تحديث الصورة والبيانات دون التأثير على سجلات الطلاب أو بيانات المدرسة.
          </div>
        </section>
      </div>
    </div>
  );
}
