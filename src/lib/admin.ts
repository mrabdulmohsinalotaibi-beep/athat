import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const DEFAULT_FEATURE_FLAGS = {
  dashboard: true,
  students: true,
  cases: true,
  interviews: true,
  calendar: true,
  plan: true,
  programs: true,
  evidences: true,
  reports: true,
  attendance: true,
  behavior: true,
  referrals: true,
  committees: true,
  toolkit: true,
  messages: true,
  weekly_poster: true,
  posts: true,
  settings: true,
  integrations: true,
  profile: true,
  public_home: true,
  public_about: true,
  public_services: true,
  public_resources: true,
  public_forms: true,
  public_contact: true,
} as const;

export type FeatureKey = keyof typeof DEFAULT_FEATURE_FLAGS;
export type FeatureFlags = Record<FeatureKey, boolean>;

export type GlobalAppSettings = {
  site_name: string;
  announcement: string | null;
  maintenance_mode: boolean;
  feature_flags: FeatureFlags;
  updated_at: string | null;
};

export const ROUTE_FEATURE_MAP: Array<{ prefix: string; feature: FeatureKey }> = [
  { prefix: "/dashboard", feature: "dashboard" },
  { prefix: "/students", feature: "students" },
  { prefix: "/cases", feature: "cases" },
  { prefix: "/interviews", feature: "interviews" },
  { prefix: "/calendar", feature: "calendar" },
  { prefix: "/plan", feature: "plan" },
  { prefix: "/programs", feature: "programs" },
  { prefix: "/evidences", feature: "evidences" },
  { prefix: "/reports", feature: "reports" },
  { prefix: "/attendance", feature: "attendance" },
  { prefix: "/behavior", feature: "behavior" },
  { prefix: "/referrals", feature: "referrals" },
  { prefix: "/committees", feature: "committees" },
  { prefix: "/toolkit", feature: "toolkit" },
  { prefix: "/messages", feature: "messages" },
  { prefix: "/weekly-poster", feature: "weekly_poster" },
  { prefix: "/posts", feature: "posts" },
  { prefix: "/settings", feature: "settings" },
  { prefix: "/integrations", feature: "integrations" },
  { prefix: "/profile", feature: "profile" },
];

export function featureForPath(pathname: string) {
  return ROUTE_FEATURE_MAP.find(({ prefix }) =>
    pathname === prefix || pathname.startsWith(prefix + "/"),
  )?.feature;
}

export function normalizeFeatureFlags(value: unknown): FeatureFlags {
  const incoming =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  return Object.fromEntries(
    Object.entries(DEFAULT_FEATURE_FLAGS).map(([key, fallback]) => [
      key,
      typeof incoming[key] === "boolean" ? incoming[key] : fallback,
    ]),
  ) as FeatureFlags;
}

export function useGlobalAppSettings() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["global-app-settings"],
    queryFn: async (): Promise<GlobalAppSettings> => {
      const { data, error } = await (supabase as any)
        .from("global_app_settings")
        .select("site_name,announcement,maintenance_mode,feature_flags,updated_at")
        .eq("id", true)
        .maybeSingle();

      if (error) {
        console.warn("[global-settings]", error.message);
        return {
          site_name: "الذات",
          announcement: null,
          maintenance_mode: false,
          feature_flags: { ...DEFAULT_FEATURE_FLAGS },
          updated_at: null,
        };
      }

      return {
        site_name: data?.site_name || "الذات",
        announcement: data?.announcement ?? null,
        maintenance_mode: Boolean(data?.maintenance_mode),
        feature_flags: normalizeFeatureFlags(data?.feature_flags),
        updated_at: data?.updated_at ?? null,
      };
    },
    staleTime: 5_000,
    refetchInterval: 20_000,
  });

  useEffect(() => {
    const channel = supabase
      .channel("global-app-settings-live")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "global_app_settings" },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["global-app-settings"] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}

export function useAdminStatus() {
  return useQuery({
    queryKey: ["app-admin-status"],
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      const userId = session.session?.user.id;
      if (!userId) return { isAdmin: false, role: null as string | null };

      const { data, error } = await (supabase as any)
        .from("app_admins")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.warn("[admin-status]", error.message);
        return { isAdmin: false, role: null as string | null };
      }

      return {
        isAdmin: data?.role === "owner" || data?.role === "admin",
        role: data?.role ?? null,
      };
    },
    staleTime: 60_000,
  });
}
