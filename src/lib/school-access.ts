import { hasPermission, type PermissionKey, type SchoolRole } from "@/lib/team-permissions";

export type SchoolMembershipAccess = {
  id?: string | null;
  role?: SchoolRole | string | null;
  member_status?: string | null;
  is_admin?: boolean | null;
  permissions?: Record<string, boolean> | null;
  group_permissions?: Record<string, boolean> | null;
  group_ids?: string[] | null;
  data_scope?: Record<string, unknown> | null;
  access_expires_at?: string | null;
  access_expired?: boolean | null;
} | null | undefined;

const ADMIN_BYPASS_PATHS = ["/admin"] as const;
const GUIDANCE_HUB_PATH = "/guidance-work";

function matchesPath(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(route + "/");
}

export function isGuidanceWorkspaceMember(membership: SchoolMembershipAccess) {
  return membership?.member_status === "active" && (
    membership?.role === "counselor" ||
    hasPermission(membership, "guidance.full")
  );
}

export function isRestrictedSchoolRole(membership: SchoolMembershipAccess) {
  return Boolean(membership && !isGuidanceWorkspaceMember(membership));
}

const PATH_PERMISSIONS: Array<{ routes: string[]; permission: PermissionKey }> = [
  { routes: ["/school-team"], permission: "team.view" },
  { routes: [GUIDANCE_HUB_PATH, "/guidance-requests"], permission: "dashboard.view" },
  { routes: ["/school-tasks", "/initiative-teams", "/initiative-member-work", "/initiative-member-review", "/initiative-dashboard"], permission: "tasks.view" },
  { routes: ["/reports"], permission: "reports.view" },
  { routes: ["/free-documents"], permission: "documents.view" },
  { routes: ["/messages", "/outgoing-messages", "/inbox", "/school-inbox"], permission: "messages.view" },
  { routes: ["/students"], permission: "students.view" },
  { routes: ["/programs", "/plan", "/execution", "/evidences"], permission: "programs.view" },
  { routes: ["/cases"], permission: "cases.view" },
  { routes: ["/interviews"], permission: "interviews.view" },
  { routes: ["/attendance", "/behavior"], permission: "attendance.view" },
  { routes: ["/referrals"], permission: "referrals.view" },
  { routes: ["/posts"], permission: "posts.view" },
  { routes: ["/settings"], permission: "settings.view" },
  { routes: ["/health"], permission: "referrals.view" },
];

export function canOpenWorkspacePath(pathname: string, membership: SchoolMembershipAccess) {
  // Legacy standalone accounts retain their current workspace until linked to a school.
  if (!membership) return true;
  if (ADMIN_BYPASS_PATHS.some((route) => matchesPath(pathname, route))) return true;

  if (membership.member_status !== "active" || membership.access_expired) {
    return ["/dashboard", "/school-team", "/profile", "/subscription"].some((route) =>
      matchesPath(pathname, route),
    );
  }

  if (matchesPath(pathname, "/dashboard") || matchesPath(pathname, "/profile") || matchesPath(pathname, "/subscription")) {
    return hasPermission(membership, "dashboard.view");
  }

  const match = PATH_PERMISSIONS.find((entry) =>
    entry.routes.some((route) => matchesPath(pathname, route)),
  );
  if (match) return hasPermission(membership, match.permission);

  return isGuidanceWorkspaceMember(membership);
}

export function filterWorkspaceSections<T extends { items: Array<{ to: string }> }>(
  sections: T[],
  membership: SchoolMembershipAccess,
): T[] {
  if (!membership) return sections;

  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => canOpenWorkspacePath(item.to, membership)),
    }))
    .filter((section) => section.items.length > 0) as T[];
}
