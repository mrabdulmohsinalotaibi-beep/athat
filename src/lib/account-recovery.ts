import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { recoverLegacyRecords } from "@/lib/record-recovery.functions";

const RECOVERY_EMAIL_SHA256 =
  "f85fb6c59825f60fcd934e427128495266b9031d300f51d8fb33aa6f1f209d00";

const RECOVERY_PROFILE = {
  full_name: "عبدالمحسن العتيبي",
  name: "عبدالمحسن العتيبي",
  job_title: "الموجه الطلابي",
  school_role: "الموجه الطلابي",
  qualification: "ماجستير",
  specialization: "علم النفس - القياس والتقويم",
  school_name: "متوسطة العلاء بن الحضرمي",
  education_department: "إدارة التعليم بمنطقة مكة المكرمة",
} as const;

const RECOVERY_SCHOOL = {
  school_name: "متوسطة العلاء بن الحضرمي",
  education_dept: "إدارة التعليم بمنطقة مكة المكرمة",
  counselor_name: "عبدالمحسن العتيبي",
  academic_year: "1448هـ",
} as const;

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function missing(value: unknown) {
  return !text(value);
}

/**
 * Restores only verified, previously known account fields.
 * Existing non-empty values always win; this never wipes user data.
 */
export function useKnownAccountRecovery() {
  const queryClient = useQueryClient();

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user?.email || cancelled) return;

      const emailHash = await sha256(user.email.trim().toLowerCase());
      if (cancelled) return;

      // Record ownership recovery is safe for every account because the server
      // only reassigns legacy rows when an exact matching email exists.
      try {
        const recovery = await recoverLegacyRecords();
        if (recovery?.recovered && recovery.total > 0) {
          console.info("[record-recovery] restored", recovery.total, "records");
        }

        // Verify from the signed-in client's RLS view that the most important
        // records are now visible to this account. This keeps ownership linking
        // automatic and immediately refreshes the UI without exposing a manual
        // recovery action to the user.
        const [studentsCheck, programsCheck, evidencesCheck] = await Promise.all([
          supabase.from("students").select("id", { count: "exact", head: true }),
          supabase.from("programs").select("id", { count: "exact", head: true }),
          supabase.from("evidences").select("id", { count: "exact", head: true }),
        ]);
        if (studentsCheck.error) console.warn("[account-link] students:", studentsCheck.error.message);
        if (programsCheck.error) console.warn("[account-link] programs:", programsCheck.error.message);
        if (evidencesCheck.error) console.warn("[account-link] evidences:", evidencesCheck.error.message);

        console.info("[account-link] visible rows", {
          students: studentsCheck.count ?? 0,
          programs: programsCheck.count ?? 0,
          evidences: evidencesCheck.count ?? 0,
        });
      } catch (error) {
        console.warn("[record-recovery] automatic account linking unavailable:", error);
      }

      // The profile reconstruction below contains verified values for one known
      // affected account only; never apply those values to other users.
      if (emailHash !== RECOVERY_EMAIL_SHA256) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["students"] }),
          queryClient.invalidateQueries({ queryKey: ["counseling_cases"] }),
          queryClient.invalidateQueries({ queryKey: ["plan_tasks"] }),
          queryClient.invalidateQueries({ queryKey: ["programs"] }),
          queryClient.invalidateQueries({ queryKey: ["interviews"] }),
          queryClient.invalidateQueries({ queryKey: ["attendance"] }),
          queryClient.invalidateQueries({ queryKey: ["behavior"] }),
          queryClient.invalidateQueries({ queryKey: ["referrals"] }),
          queryClient.invalidateQueries({ queryKey: ["committees"] }),
          queryClient.invalidateQueries({ queryKey: ["evidences"] }),
          queryClient.invalidateQueries({ queryKey: ["reports"] }),
          queryClient.invalidateQueries({ queryKey: ["calendar_events"] }),
          queryClient.invalidateQueries({ queryKey: ["lookups"] }),
          queryClient.invalidateQueries({ queryKey: ["posts"] }),
          queryClient.invalidateQueries({ queryKey: ["dashboard-live-v2"] }),
          queryClient.invalidateQueries({ queryKey: ["school_settings"] }),
        ]);
        return;
      }

      const metadata = user.user_metadata ?? {};
      const metadataPatch: Record<string, string> = {};
      for (const [key, value] of Object.entries(RECOVERY_PROFILE)) {
        if (missing(metadata[key])) metadataPatch[key] = value;
      }
      if (missing(metadata["professional_email"])) {
        metadataPatch["professional_email"] = user.email;
      }

      if (Object.keys(metadataPatch).length) {
        const { error } = await supabase.auth.updateUser({
          data: { ...metadata, ...metadataPatch },
        });
        if (error) console.warn("[account-recovery] auth metadata:", error.message);
      }

      const { data: existingProfile, error: profileReadError } = await (supabase as any)
        .from("user_profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (!profileReadError) {
        const profilePayload: Record<string, unknown> = {
          id: user.id,
          full_name: text(existingProfile?.full_name) || RECOVERY_PROFILE.full_name,
          job_title: text(existingProfile?.job_title) || RECOVERY_PROFILE.job_title,
          school_role: text(existingProfile?.school_role) || RECOVERY_PROFILE.school_role,
          phone: existingProfile?.phone ?? null,
          bio: existingProfile?.bio ?? null,
          avatar_path: existingProfile?.avatar_path ?? null,
        };

        const { error: baseProfileError } = await (supabase as any)
          .from("user_profiles")
          .upsert(profilePayload, { onConflict: "id" });

        if (baseProfileError) {
          console.warn("[account-recovery] profile base:", baseProfileError.message);
        }

        const optionalProfilePatch: Record<string, unknown> = {};
        const optionalValues: Record<string, unknown> = {
          qualification: RECOVERY_PROFILE.qualification,
          specialization: RECOVERY_PROFILE.specialization,
          school_name: RECOVERY_PROFILE.school_name,
          education_department: RECOVERY_PROFILE.education_department,
          professional_email: user.email,
        };

        for (const [key, value] of Object.entries(optionalValues)) {
          if (missing(existingProfile?.[key])) optionalProfilePatch[key] = value;
        }

        if (Object.keys(optionalProfilePatch).length) {
          const { error: optionalError } = await (supabase as any)
            .from("user_profiles")
            .update(optionalProfilePatch)
            .eq("id", user.id);
          if (optionalError) {
            console.warn("[account-recovery] optional profile fields pending:", optionalError.message);
          }
        }
      }

      const { data: existingSchool, error: schoolReadError } = await (supabase as any)
        .from("school_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!schoolReadError) {
        const schoolPayload: Record<string, unknown> = {
          user_id: user.id,
          school_name: text(existingSchool?.school_name) || RECOVERY_SCHOOL.school_name,
          education_dept:
            text(existingSchool?.education_dept) || RECOVERY_SCHOOL.education_dept,
          counselor_name:
            text(existingSchool?.counselor_name) || RECOVERY_SCHOOL.counselor_name,
          academic_year:
            text(existingSchool?.academic_year) || RECOVERY_SCHOOL.academic_year,
          contact_email: text(existingSchool?.contact_email) || user.email,
        };

        const { error: schoolWriteError } = await (supabase as any)
          .from("school_settings")
          .upsert(schoolPayload, { onConflict: "user_id" });

        if (schoolWriteError) {
          console.warn("[account-recovery] school settings:", schoolWriteError.message);
        }
      }

      if (cancelled) return;

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["auth-user"] }),
        queryClient.invalidateQueries({ queryKey: ["user-profile", user.id] }),
        queryClient.invalidateQueries({ queryKey: ["school_settings"] }),
        queryClient.invalidateQueries({ queryKey: ["students"] }),
        queryClient.invalidateQueries({ queryKey: ["counseling_cases"] }),
        queryClient.invalidateQueries({ queryKey: ["plan_tasks"] }),
        queryClient.invalidateQueries({ queryKey: ["programs"] }),
        queryClient.invalidateQueries({ queryKey: ["interviews"] }),
        queryClient.invalidateQueries({ queryKey: ["attendance"] }),
        queryClient.invalidateQueries({ queryKey: ["behavior"] }),
        queryClient.invalidateQueries({ queryKey: ["referrals"] }),
        queryClient.invalidateQueries({ queryKey: ["committees"] }),
        queryClient.invalidateQueries({ queryKey: ["evidences"] }),
        queryClient.invalidateQueries({ queryKey: ["reports"] }),
        queryClient.invalidateQueries({ queryKey: ["calendar_events"] }),
        queryClient.invalidateQueries({ queryKey: ["lookups"] }),
        queryClient.invalidateQueries({ queryKey: ["posts"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-live-v2"] }),
      ]);
      })();
    }, 1800);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [queryClient]);
}
