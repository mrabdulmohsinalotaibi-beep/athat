export type SchoolRole =
  | "principal"
  | "vice_principal"
  | "counselor"
  | "teacher"
  | "admin_staff"
  | "guard"
  | "observer";

export type SchoolMembershipAccess = {
  id?: string | null;
  role?: SchoolRole | string | null;
  member_status?: string | null;
  is_admin?: boolean | null;
} | null | undefined;

const COLLABORATION_PATHS = [
  "/dashboard",
  "/school-team",
  "/school-tasks",
  "/school-inbox",
  "/profile",
  "/subscription",
] as const;

const ADMIN_BYPASS_PATHS = ["/admin"] as const;

function matchesPath(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(route + "/");
}

export function isGuidanceWorkspaceMember(membership: SchoolMembershipAccess) {
  return membership?.member_status === "active" && membership?.role === "counselor";
}

export function isRestrictedSchoolRole(membership: SchoolMembershipAccess) {
  return Boolean(membership && !isGuidanceWorkspaceMember(membership));
}

export function canOpenWorkspacePath(pathname: string, membership: SchoolMembershipAccess) {
  // Legacy standalone accounts that have not joined a school workspace retain
  // their existing counselor workspace until they choose a school role.
  if (!membership) return true;

  if (ADMIN_BYPASS_PATHS.some((route) => matchesPath(pathname, route))) return true;

  if (membership.member_status !== "active") {
    return ["/dashboard", "/school-team", "/profile", "/subscription"].some((route) =>
      matchesPath(pathname, route),
    );
  }

  if (membership.role === "counselor") return true;

  if (
    membership.is_admin &&
    (matchesPath(pathname, "/settings") || matchesPath(pathname, "/health"))
  ) {
    return true;
  }

  return COLLABORATION_PATHS.some((route) => matchesPath(pathname, route));
}

export function filterWorkspaceSections<T extends { items: Array<{ to: string }> }>(
  sections: T[],
  membership: SchoolMembershipAccess,
): T[] {
  if (!membership || isGuidanceWorkspaceMember(membership)) return sections;

  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => canOpenWorkspacePath(item.to, membership)),
    }))
    .filter((section) => section.items.length > 0) as T[];
}
