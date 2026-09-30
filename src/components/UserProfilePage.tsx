import { useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  Camera,
  CheckCircle2,
  Eye,
  EyeOff,
  FileText,
  GraduationCap,
  KeyRound,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Save,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
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
  "مساعد الموجه الطلابي",
  "وكيل شؤون الطلاب",
  "وكيل المدرسة",
  "مدير المدرسة",
  "معلم/ـة",
  "إداري/ـة",
  "أخرى",
];

const QUALIFICATION_OPTIONS = [
  "دبلوم",
  "بكالوريوس",
  "دبلوم عالٍ",
  "ماجستير",
  "دكتوراه",
  "أخرى",
];

type UserProfile = {
  id: string;
  full_name: string | null;
  job_title: string | null;
  phone: string | null;
  avatar_path: string | null;
  avatar_data_url?: string | null;
  bio: string | null;
  school_role: string | null;
  professional_email?: string | null;
  employee_no?: string | null;
  qualification?: string | null;
  specialization?: string | null;
  experience_years?: number | null;
  school_name?: string | null;
  education_department?: string | null;
  education_office?: string | null;
  city?: string | null;
  office_location?: string | null;
  office_hours?: string | null;
  interests?: string | null;
};

type ExtendedProfile = {
  professional_email?: string;
  employee_no?: string;
  qualification?: string;
  specialization?: string;
  experience_years?: string;
  school_name?: string;
  education_department?: string;
  education_office?: string;
  city?: string;
  office_location?: string;
  office_hours?: string;
  interests?: string;
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

function metadataValue(user: { user_metadata?: Record<string, unknown> } | undefined, key: keyof ExtendedProfile) {
  const value = user?.user_metadata?.[key];
  return typeof value === "string" ? value : "";
}

function profileValue(
  profile: UserProfile | null | undefined,
  user: { user_metadata?: Record<string, unknown> } | undefined,
  key: keyof ExtendedProfile,
) {
  const value = profile?.[key as keyof UserProfile];
  if (value !== null && value !== undefined && String(value).trim()) return String(value);
  return metadataValue(user, key);
}

export function UserProfilePage() {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [uploading, setUploading] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);

  const {
    data: user,
    isLoading: userLoading,
    isError: userError,
    error: userQueryError,
    refetch: refetchUser,
  } = useQuery({
    queryKey: ["auth-user"],
    queryFn: async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      try {
        const { data, error } = await supabase.auth.getUser();
        if (!error && data.user) return data.user;
      } catch {
        // Keep a locally persisted valid session during a transient auth/network failure.
      }
      if (sessionData.session?.user) return sessionData.session.user;
      throw new Error("لم يتم العثور على جلسة دخول.");
    },
  });

  const {
    data: profile,
    isLoading: profileLoading,
    isError: profileError,
    error: profileQueryError,
    refetch: refetchProfile,
  } = useQuery({
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
    String(user?.user_metadata?.["full_name"] || user?.user_metadata?.["name"] || "الموجه الطلابي");

  const avatarUrl = useMemo(() => {
    if (profile?.avatar_path) {
      return supabase.storage.from("user-avatars").getPublicUrl(profile.avatar_path).data.publicUrl;
    }
    if (profile?.avatar_data_url) return profile.avatar_data_url;
    const fallback = user?.user_metadata?.["avatar_data_url"];
    return typeof fallback === "string" ? fallback : "";
  }, [profile?.avatar_path, profile?.avatar_data_url, user?.user_metadata]);

  const completion = useMemo(() => {
    const fields = [
      displayName,
      profile?.job_title,
      profile?.phone,
      profile?.bio,
      profile?.avatar_path,
      profileValue(profile, user, "qualification"),
      profileValue(profile, user, "specialization"),
      profileValue(profile, user, "school_name"),
      profileValue(profile, user, "education_department"),
      profileValue(profile, user, "professional_email"),
    ];
    const done = fields.filter((value) => String(value || "").trim()).length;
    return Math.round((done / fields.length) * 100);
  }, [displayName, profile, user]);

  const saveProfile = useMutation({
    mutationFn: async (form: HTMLFormElement) => {
      if (!user) throw new Error("لم يتم العثور على المستخدم.");
      const values = new FormData(form);

      const basePayload = {
        id: user.id,
        full_name: String(values.get("full_name") || "").trim() || null,
        job_title: String(values.get("job_title") || "").trim() || null,
        phone: String(values.get("phone") || "").trim() || null,
        school_role: String(values.get("school_role") || "الموجه الطلابي"),
        bio: String(values.get("bio") || "").trim() || null,
        avatar_path: profile?.avatar_path || null,
      };

      const extendedPayload: ExtendedProfile = {
        professional_email: String(values.get("professional_email") || "").trim(),
        employee_no: String(values.get("employee_no") || "").trim(),
        qualification: String(values.get("qualification") || "").trim(),
        specialization: String(values.get("specialization") || "").trim(),
        experience_years: String(values.get("experience_years") || "").trim(),
        school_name: String(values.get("school_name") || "").trim(),
        education_department: String(values.get("education_department") || "").trim(),
        education_office: String(values.get("education_office") || "").trim(),
        city: String(values.get("city") || "").trim(),
        office_location: String(values.get("office_location") || "").trim(),
        office_hours: String(values.get("office_hours") || "").trim(),
        interests: String(values.get("interests") || "").trim(),
      };

      const cloudProfilePayload = {
        ...basePayload,
        ...extendedPayload,
        experience_years: extendedPayload.experience_years
          ? Number(extendedPayload.experience_years)
          : null,
      };

      const { error } = await (supabase as any)
        .from("user_profiles")
        .upsert(cloudProfilePayload, { onConflict: "id" });
      if (error) throw error;

      // Keep auth metadata as a second copy for resilience and fast restore.
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          ...user.user_metadata,
          ...extendedPayload,
          full_name: basePayload.full_name || "",
          name: basePayload.full_name || "",
          job_title: basePayload.job_title || "",
          school_role: basePayload.school_role,
        },
      });
      if (authError) throw authError;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["user-profile", user?.id] });
      await queryClient.invalidateQueries({ queryKey: ["auth-user"] });
      toast.success("تم حفظ الملف الشخصي وتحديث بياناتك.");
    },
    onError: (error: Error) => toast.error(arabicAuthError(error.message)),
  });

  async function createAvatarFallback(file: File) {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("تعذّرت قراءة الصورة."));
      reader.onload = () => resolve(String(reader.result || ""));
      reader.readAsDataURL(file);
    });

    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("تعذّر تجهيز الصورة."));
      img.src = dataUrl;
    });

    const size = 160;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("تعذّر تجهيز الصورة.");

    const sourceSize = Math.min(image.naturalWidth, image.naturalHeight);
    const sx = Math.max(0, (image.naturalWidth - sourceSize) / 2);
    const sy = Math.max(0, (image.naturalHeight - sourceSize) / 2);
    context.drawImage(image, sx, sy, sourceSize, sourceSize, 0, 0, size, size);

    return canvas.toDataURL("image/webp", 0.72);
  }

  async function uploadAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith("image/") || file.size > 4 * 1024 * 1024) {
      toast.error("اختر صورة JPG أو PNG أو WEBP بحجم لا يتجاوز 4 ميجابايت.");
      event.target.value = "";
      return;
    }

    setUploading(true);
    try {
      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/avatar-${Date.now()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("user-avatars")
        .upload(path, file, { cacheControl: "31536000", upsert: false });

      if (uploadError) {
        const message = uploadError.message.toLowerCase();
        const storagePolicyIssue =
          message.includes("row-level security") ||
          message.includes("policy") ||
          message.includes("bucket") ||
          message.includes("unauthorized");

        if (!storagePolicyIssue) throw uploadError;

        // Safe fallback: keep a very small, optimized avatar in auth metadata so
        // the user can update the profile even before Storage RLS is deployed.
        const fallbackAvatar = await createAvatarFallback(file);
        const { error: profileFallbackError } = await (supabase as any)
          .from("user_profiles")
          .upsert({
            id: user.id,
            full_name: profile?.full_name || String(user.user_metadata?.["full_name"] || "") || null,
            avatar_data_url: fallbackAvatar,
          }, { onConflict: "id" });
        if (profileFallbackError) throw profileFallbackError;

        const { error: metadataError } = await supabase.auth.updateUser({
          data: {
            ...user.user_metadata,
            avatar_data_url: fallbackAvatar,
          },
        });
        if (metadataError) throw metadataError;

        await queryClient.invalidateQueries({ queryKey: ["user-profile", user.id] });
        await queryClient.invalidateQueries({ queryKey: ["auth-user"] });
        toast.success("تم تحديث الصورة الشخصية.");
        return;
      }

      const { error: profileError } = await (supabase as any).from("user_profiles").upsert({
        id: user.id,
        full_name: profile?.full_name || String(user.user_metadata?.["full_name"] || "") || null,
        avatar_path: path,
        avatar_data_url: null,
      });
      if (profileError) throw profileError;

      // Storage succeeded, so remove any temporary metadata fallback.
      if (profile?.avatar_data_url) {
        const { error: clearFallbackError } = await (supabase as any)
          .from("user_profiles")
          .update({ avatar_data_url: null })
          .eq("id", user.id);
        if (clearFallbackError) throw clearFallbackError;
      }

      if (user.user_metadata?.["avatar_data_url"]) {
        const nextMetadata = { ...user.user_metadata };
        delete nextMetadata["avatar_data_url"];
        await supabase.auth.updateUser({ data: nextMetadata });
      }

      if (profile?.avatar_path) {
        void supabase.storage.from("user-avatars").remove([profile.avatar_path]);
      }
      await queryClient.invalidateQueries({ queryKey: ["user-profile", user.id] });
      await queryClient.invalidateQueries({ queryKey: ["auth-user"] });
      toast.success("تم تحديث الصورة الشخصية.");
    } catch (error) {
      toast.error(`تعذّر رفع الصورة: ${(error as Error).message}`);
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  async function removeAvatar() {
    if (!user || (!profile?.avatar_path && !profile?.avatar_data_url && !user.user_metadata?.["avatar_data_url"])) return;
    if (!window.confirm("هل تريد إزالة الصورة الشخصية؟")) return;

    setUploading(true);
    try {
      if (profile?.avatar_path) {
        await supabase.storage.from("user-avatars").remove([profile.avatar_path]);
        const { error } = await (supabase as any)
          .from("user_profiles")
          .update({ avatar_path: null })
          .eq("id", user.id);
        if (error) throw error;
      }

      if (user.user_metadata?.["avatar_data_url"]) {
        const nextMetadata = { ...user.user_metadata };
        delete nextMetadata["avatar_data_url"];
        const { error: metadataError } = await supabase.auth.updateUser({ data: nextMetadata });
        if (metadataError) throw metadataError;
      }

      await queryClient.invalidateQueries({ queryKey: ["user-profile", user.id] });
      await queryClient.invalidateQueries({ queryKey: ["auth-user"] });
      toast.success("تمت إزالة الصورة الشخصية.");
    } catch (error) {
      toast.error(`تعذّرت إزالة الصورة: ${(error as Error).message}`);
    } finally {
      setUploading(false);
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
      <div className="mx-auto max-w-6xl rounded-3xl border bg-card p-10 text-center">
        <Loader2 className="mx-auto size-6 animate-spin text-primary" />
        <p className="mt-3 text-sm text-muted-foreground">جارٍ تجهيز ملفك الشخصي...</p>
      </div>
    );
  }

  if (userError || profileError) {
    const message =
      userQueryError instanceof Error
        ? userQueryError.message
        : profileQueryError instanceof Error
          ? profileQueryError.message
          : "تعذّر تحميل بيانات الحساب.";

    return (
      <div className="mx-auto max-w-3xl rounded-3xl border border-destructive/30 bg-card p-8 text-center">
        <h2 className="text-lg font-black text-destructive">تعذّر تحميل الحساب</h2>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        <Button
          type="button"
          className="mt-5"
          onClick={() => {
            void refetchUser();
            void refetchProfile();
          }}
        >
          إعادة المحاولة
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6" dir="rtl">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#3C3C3C] p-6 text-[#F1E9DD] shadow-xl sm:p-8">
        <div className="pointer-events-none absolute -left-16 -top-20 size-56 rounded-full border border-white/5" />
        <div className="pointer-events-none absolute -left-8 -top-12 size-40 rounded-full border border-white/5" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center">
          <div className="relative self-start">
            <Avatar className="size-28 border-4 border-[#F1E9DD]/30 bg-white/10 text-3xl font-black text-[#F1E9DD] shadow-xl sm:size-32">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={`صورة ${displayName}`} />}
              <AvatarFallback className="bg-white/10 text-[#F1E9DD]">
                {initials(displayName)}
              </AvatarFallback>
            </Avatar>
            <Button
              type="button"
              size="icon"
              className="absolute -bottom-1 -left-1 size-10 rounded-full bg-[#F1E9DD] text-[#3C3C3C] shadow-lg hover:bg-white"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              title="تغيير الصورة الشخصية"
            >
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
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
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold">
                الملف الشخصي
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200/20 bg-emerald-300/10 px-3 py-1 text-[11px] font-bold text-emerald-100">
                <BadgeCheck className="size-3.5" />
                حساب نشط
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-sky-200/20 bg-sky-300/10 px-3 py-1 text-[11px] font-bold text-sky-100">
                <ShieldCheck className="size-3.5" />
                محفوظ سحابيًا
              </span>
            </div>
            <h1 className="mt-3 truncate text-2xl font-black sm:text-4xl">{displayName}</h1>
            <p className="mt-2 text-sm text-[#D8D0C4]">
              {profile?.job_title || profile?.school_role || "الموجه الطلابي"}
              {profileValue(profile, user, "school_name") ? ` · ${profileValue(profile, user, "school_name")}` : ""}
            </p>

            <div className="mt-5 max-w-xl">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="font-bold">اكتمال الملف</span>
                <span>{completion}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-[#F1E9DD] transition-all"
                  style={{ width: `${completion}%` }}
                />
              </div>
              <p className="mt-2 text-[11px] text-[#CFC6B9]">
                أكمل بياناتك المهنية لتظهر معلومات الحساب بصورة أكثر تنظيمًا داخل المنصة.
              </p>
            </div>
          </div>

          <div className="grid min-w-[240px] grid-cols-2 gap-2 text-xs">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <Mail className="mb-2 size-4 text-[#E4DACC]" />
              <p className="text-[#BFB6AA]">البريد</p>
              <p className="mt-1 truncate font-bold" dir="ltr">{user?.email || "—"}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <BriefcaseBusiness className="mb-2 size-4 text-[#E4DACC]" />
              <p className="text-[#BFB6AA]">الدور</p>
              <p className="mt-1 truncate font-bold">{profile?.school_role || "الموجه الطلابي"}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
        <div className="space-y-6">
          <section className="rounded-3xl border bg-card p-5 shadow-sm sm:p-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-2xl bg-primary/10 p-2.5 text-primary">
                <UserRound className="size-5" />
              </div>
              <div>
                <h2 className="font-black">البيانات الأساسية والمهنية</h2>
                <p className="text-xs text-muted-foreground">معلوماتك الأساسية ومؤهلاتك وبيانات العمل.</p>
              </div>
            </div>

            <form
              id="profile-form"
              className="grid gap-5 sm:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                saveProfile.mutate(event.currentTarget);
              }}
            >
              <div>
                <Label htmlFor="profile-full-name" className="mb-1.5 block">الاسم الكامل</Label>
                <Input id="profile-full-name" name="full_name" defaultValue={profile?.full_name || displayName} placeholder="الاسم الرباعي" />
              </div>
              <div>
                <Label htmlFor="profile-role" className="mb-1.5 block">الدور في المدرسة</Label>
                <select
                  id="profile-role"
                  name="school_role"
                  defaultValue={profile?.school_role || "الموجه الطلابي"}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {ROLE_OPTIONS.map((role) => <option key={role}>{role}</option>)}
                </select>
              </div>
              <div>
                <Label htmlFor="profile-title" className="mb-1.5 block">المسمى الوظيفي</Label>
                <Input id="profile-title" name="job_title" defaultValue={profile?.job_title || ""} placeholder="مثال: موجه طلابي" />
              </div>
              <div>
                <Label htmlFor="profile-employee-no" className="mb-1.5 block">الرقم الوظيفي</Label>
                <Input id="profile-employee-no" name="employee_no" dir="ltr" defaultValue={profileValue(profile, user, "employee_no")} placeholder="اختياري" />
              </div>
              <div>
                <Label htmlFor="profile-qualification" className="mb-1.5 block">المؤهل العلمي</Label>
                <select
                  id="profile-qualification"
                  name="qualification"
                  defaultValue={profileValue(profile, user, "qualification")}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">اختر المؤهل</option>
                  {QUALIFICATION_OPTIONS.map((item) => <option key={item}>{item}</option>)}
                </select>
              </div>
              <div>
                <Label htmlFor="profile-specialization" className="mb-1.5 block">التخصص</Label>
                <Input id="profile-specialization" name="specialization" defaultValue={profileValue(profile, user, "specialization")} placeholder="مثال: القياس والتقويم" />
              </div>
              <div>
                <Label htmlFor="profile-experience" className="mb-1.5 block">سنوات الخبرة</Label>
                <Input id="profile-experience" name="experience_years" type="number" min="0" max="60" defaultValue={profileValue(profile, user, "experience_years")} placeholder="0" />
              </div>
              <div>
                <Label htmlFor="profile-phone" className="mb-1.5 block">رقم الجوال المهني</Label>
                <Input id="profile-phone" name="phone" dir="ltr" defaultValue={profile?.phone || ""} placeholder="05XXXXXXXX" />
              </div>
              <div>
                <Label htmlFor="profile-professional-email" className="mb-1.5 block">البريد المهني</Label>
                <Input id="profile-professional-email" name="professional_email" type="email" dir="ltr" defaultValue={profileValue(profile, user, "professional_email")} placeholder="name@school.edu.sa" />
              </div>
              <div>
                <Label htmlFor="profile-city" className="mb-1.5 block">المدينة</Label>
                <Input id="profile-city" name="city" defaultValue={profileValue(profile, user, "city")} placeholder="مثال: مكة المكرمة" />
              </div>

              <div className="sm:col-span-2 mt-2 border-t pt-5">
                <div className="mb-4 flex items-center gap-2">
                  <Building2 className="size-4 text-primary" />
                  <h3 className="text-sm font-black">جهة العمل</h3>
                </div>
              </div>
              <div>
                <Label htmlFor="profile-school-name" className="mb-1.5 block">اسم المدرسة</Label>
                <Input id="profile-school-name" name="school_name" defaultValue={profileValue(profile, user, "school_name")} placeholder="اسم المدرسة" />
              </div>
              <div>
                <Label htmlFor="profile-department" className="mb-1.5 block">إدارة التعليم</Label>
                <Input id="profile-department" name="education_department" defaultValue={profileValue(profile, user, "education_department")} placeholder="إدارة التعليم بمنطقة..." />
              </div>
              <div>
                <Label htmlFor="profile-office" className="mb-1.5 block">مكتب التعليم</Label>
                <Input id="profile-office" name="education_office" defaultValue={profileValue(profile, user, "education_office")} placeholder="اختياري" />
              </div>
              <div>
                <Label htmlFor="profile-office-location" className="mb-1.5 block">موقع مكتب التوجيه</Label>
                <Input id="profile-office-location" name="office_location" defaultValue={profileValue(profile, user, "office_location")} placeholder="مثال: الدور الأول - غرفة التوجيه" />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="profile-office-hours" className="mb-1.5 block">أوقات التواصل والمقابلات</Label>
                <Input id="profile-office-hours" name="office_hours" defaultValue={profileValue(profile, user, "office_hours")} placeholder="مثال: الأحد إلى الخميس من 8:00 ص إلى 12:30 م" />
              </div>

              <div className="sm:col-span-2 mt-2 border-t pt-5">
                <div className="mb-4 flex items-center gap-2">
                  <GraduationCap className="size-4 text-primary" />
                  <h3 className="text-sm font-black">النبذة والاهتمامات المهنية</h3>
                </div>
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="profile-bio" className="mb-1.5 block">نبذة مهنية</Label>
                <Textarea
                  id="profile-bio"
                  name="bio"
                  defaultValue={profile?.bio || ""}
                  rows={4}
                  maxLength={800}
                  placeholder="اكتب نبذة موجزة عن خبرتك ودورك المهني..."
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="profile-interests" className="mb-1.5 block">مجالات الاهتمام</Label>
                <Textarea
                  id="profile-interests"
                  name="interests"
                  defaultValue={profileValue(profile, user, "interests")}
                  rows={3}
                  maxLength={500}
                  placeholder="مثال: التوجيه الطلابي، القياس والتقويم، الإرشاد النفسي، تحليل البيانات..."
                />
              </div>

              <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3 border-t pt-5">
                <div className="text-xs text-muted-foreground">
                  البريد المستخدم للدخول: <span dir="ltr" className="font-semibold text-foreground">{user?.email || "—"}</span>
                </div>
                <Button type="submit" disabled={saveProfile.isPending}>
                  {saveProfile.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                  {saveProfile.isPending ? "جارٍ الحفظ..." : "حفظ جميع البيانات"}
                </Button>
              </div>
            </form>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-3xl border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles className="size-5 text-primary" />
              <h2 className="font-black">بطاقة الحساب</h2>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3 rounded-2xl bg-muted/45 p-3">
                <Phone className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">الجوال المهني</p>
                  <p className="mt-0.5 font-bold" dir="ltr">{profile?.phone || "غير مضاف"}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-2xl bg-muted/45 p-3">
                <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">المدينة</p>
                  <p className="mt-0.5 font-bold">{profileValue(profile, user, "city") || "غير مضافة"}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-2xl bg-muted/45 p-3">
                <GraduationCap className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">المؤهل والتخصص</p>
                  <p className="mt-0.5 font-bold">
                    {[profileValue(profile, user, "qualification"), profileValue(profile, user, "specialization")].filter(Boolean).join(" · ") || "غير مكتمل"}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-2">
              <Button asChild variant="outline" className="justify-start">
                <Link to="/settings"><Settings className="size-4" /> إعدادات المدرسة</Link>
              </Button>
              <Button asChild variant="outline" className="justify-start">
                <Link to="/posts"><FileText className="size-4" /> منشوراتي ومحتواي</Link>
              </Button>
            </div>
          </section>

          <section className="rounded-3xl border bg-card p-5 shadow-sm">
            <div className="mb-5 flex items-center gap-2">
              <div className="rounded-xl bg-amber-500/10 p-2 text-amber-700">
                <ShieldCheck className="size-5" />
              </div>
              <div>
                <h2 className="font-black">أمان الحساب</h2>
                <p className="text-xs text-muted-foreground">إدارة كلمة المرور والحماية.</p>
              </div>
            </div>
            <form onSubmit={updatePassword} className="space-y-4">
              <div>
                <Label htmlFor="account-new-password" className="mb-1.5 block">كلمة المرور الجديدة</Label>
                <div className="relative">
                  <Input
                    id="account-new-password"
                    type={passwordVisible ? "text" : "password"}
                    autoComplete="new-password"
                    minLength={8}
                    required
                    dir="ltr"
                    className="pl-10"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setPasswordVisible((value) => !value)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    aria-label={passwordVisible ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                  >
                    {passwordVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
              <div>
                <Label htmlFor="account-confirm-password" className="mb-1.5 block">تأكيد كلمة المرور</Label>
                <Input
                  id="account-confirm-password"
                  type={passwordVisible ? "text" : "password"}
                  autoComplete="new-password"
                  minLength={8}
                  required
                  dir="ltr"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </div>
              <p className="rounded-xl bg-muted/60 p-3 text-xs leading-6 text-muted-foreground">
                استخدم 8 أحرف على الأقل، ويفضل مزيجًا من الأحرف والأرقام والرموز.
              </p>
              <Button type="submit" className="w-full">
                <KeyRound className="size-4" /> تحديث كلمة المرور
              </Button>
            </form>

            <div className="mt-5 flex items-start gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs leading-6 text-emerald-800">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
              تحديث الملف أو الصورة لا يؤثر على سجلات الطلاب أو المستندات المحفوظة.
            </div>
          </section>

          <section className="rounded-3xl border border-destructive/15 bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <Avatar className="size-12">
                {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
                <AvatarFallback>{initials(displayName)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black">{displayName}</p>
                <p className="truncate text-xs text-muted-foreground">{user?.email || "—"}</p>
              </div>
            </div>
            {(profile?.avatar_path || profile?.avatar_data_url || user?.user_metadata?.["avatar_data_url"]) && (
              <Button
                type="button"
                variant="outline"
                className="mt-4 w-full border-destructive/30 text-destructive hover:bg-destructive/5"
                onClick={() => void removeAvatar()}
                disabled={uploading}
              >
                <Trash2 className="size-4" />
                إزالة الصورة الشخصية
              </Button>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
