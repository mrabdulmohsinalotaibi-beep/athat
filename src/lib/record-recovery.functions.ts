import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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

function normEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

/**
 * Recover rows that still exist in production but are owned by an older auth UID.
 *
 * Safety rule: legacy ownership is accepted only when a legacy profile/school row
 * contains the SAME email as the currently authenticated account. We never
 * reassign rows by school name, counselor name, student names, or other fuzzy data.
 */
export const recoverLegacyRecords = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: userData, error: userError } = await supabase.auth.getUser();
    const email = normEmail(userData.user?.email);

    if (userError || !email) {
      throw new Error("تعذّر التحقق من الحساب الحالي.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const candidateIds = new Set<string>();

    // 1) Legacy profile rows: strongest identity link.
    try {
      const { data } = await (supabaseAdmin as any)
        .from("user_profiles")
        .select("id,professional_email")
        .ilike("professional_email", email);

      for (const row of data ?? []) {
        const id = typeof row?.id === "string" ? row.id : "";
        if (id && id !== userId && normEmail(row?.professional_email) === email) {
          candidateIds.add(id);
        }
      }
    } catch (error) {
      console.warn("[record-recovery] user_profiles identity lookup:", error);
    }

    // 2) Legacy school rows: exact contact email only.
    try {
      const { data } = await (supabaseAdmin as any)
        .from("school_settings")
        .select("user_id,contact_email")
        .ilike("contact_email", email);

      for (const row of data ?? []) {
        const id = typeof row?.user_id === "string" ? row.user_id : "";
        if (id && id !== userId && normEmail(row?.contact_email) === email) {
          candidateIds.add(id);
        }
      }
    } catch (error) {
      console.warn("[record-recovery] school identity lookup:", error);
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

    // Restore/merge school settings without overwriting non-empty current values.
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
            const empty =
              current === null ||
              current === undefined ||
              (typeof current === "string" && !current.trim());
            if (empty && value !== null && value !== undefined && value !== "") {
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
