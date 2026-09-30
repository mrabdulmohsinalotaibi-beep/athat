import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const VERIFIED_EMAIL_HASH =
  "f85fb6c59825f60fcd934e427128495266b9031d300f51d8fb33aa6f1f209d00";

const RECORD_TABLES = [
  "students",
  "counseling_cases",
  "plan_tasks",
  "programs",
  "interviews",
  "attendance",
  "behavior",
  "referrals",
  "committees",
  "evidences",
  "reports",
  "calendar_events",
  "lookups",
  "posts",
  "public_requests",
  "feedback_messages",
  "subscriptions",
  "noor_export_jobs",
] as const;

async function sha256(value: string) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export const recoverLegacyRecords = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user?.email) {
      throw new Error("تعذّر التحقق من الحساب الحالي.");
    }

    const emailHash = await sha256(userData.user.email.trim().toLowerCase());
    if (emailHash !== VERIFIED_EMAIL_HASH) {
      return { recovered: false, reason: "not_target_account", total: 0, tables: {} };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Candidate legacy owner IDs must be tied to the verified school/counselor
    // identity. Current user is excluded. This avoids claiming unrelated data.
    const candidateIds = new Set<string>();

    const { data: schools } = await (supabaseAdmin as any)
      .from("school_settings")
      .select("user_id,school_name,counselor_name,contact_email")
      .or(
        [
          "school_name.eq.متوسطة العلاء بن الحضرمي",
          "counselor_name.eq.عبدالمحسن العتيبي",
          "contact_email.eq." + userData.user.email,
        ].join(","),
      );

    for (const row of schools ?? []) {
      const id = typeof row?.user_id === "string" ? row.user_id : "";
      if (id && id !== userId) candidateIds.add(id);
    }

    const { data: profiles } = await (supabaseAdmin as any)
      .from("user_profiles")
      .select("id,full_name,professional_email,school_name")
      .or(
        [
          "school_name.eq.متوسطة العلاء بن الحضرمي",
          "full_name.eq.عبدالمحسن العتيبي",
          "professional_email.eq." + userData.user.email,
        ].join(","),
      );

    for (const row of profiles ?? []) {
      const id = typeof row?.id === "string" ? row.id : "";
      if (id && id !== userId) candidateIds.add(id);
    }

    if (!candidateIds.size) {
      return { recovered: true, total: 0, tables: {}, candidates: 0 };
    }

    const ids = [...candidateIds];
    const recoveredByTable: Record<string, number> = {};
    let total = 0;

    for (const table of RECORD_TABLES) {
      try {
        const { data, error } = await (supabaseAdmin as any)
          .from(table)
          .update({ user_id: userId })
          .in("user_id", ids)
          .select("id");

        if (error) {
          // Older deployments may not have every optional table. Skip safely.
          console.warn("[record-recovery]", table, error.message);
          continue;
        }

        const count = Array.isArray(data) ? data.length : 0;
        recoveredByTable[table] = count;
        total += count;
      } catch (error) {
        console.warn("[record-recovery]", table, error);
      }
    }

    // Merge school settings conservatively: keep the current row if present,
    // otherwise move the best legacy row to the current account.
    try {
      const { data: currentSchool } = await (supabaseAdmin as any)
        .from("school_settings")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      const { data: legacySchool } = await (supabaseAdmin as any)
        .from("school_settings")
        .select("*")
        .in("user_id", ids)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (legacySchool) {
        if (currentSchool) {
          const patch: Record<string, unknown> = {};
          for (const [key, value] of Object.entries(legacySchool)) {
            if (["id", "user_id", "created_at", "updated_at"].includes(key)) continue;
            const current = currentSchool[key];
            const currentEmpty =
              current === null ||
              current === undefined ||
              (typeof current === "string" && !current.trim());
            if (currentEmpty && value !== null && value !== undefined && value !== "") {
              patch[key] = value;
            }
          }
          if (Object.keys(patch).length) {
            await (supabaseAdmin as any)
              .from("school_settings")
              .update(patch)
              .eq("user_id", userId);
          }
        } else {
          const restored = { ...legacySchool, user_id: userId };
          delete restored.id;
          delete restored.created_at;
          delete restored.updated_at;
          await (supabaseAdmin as any).from("school_settings").insert(restored);
        }
      }
    } catch (error) {
      console.warn("[record-recovery] school_settings merge:", error);
    }

    return {
      recovered: true,
      total,
      tables: recoveredByTable,
      candidates: ids.length,
    };
  });
