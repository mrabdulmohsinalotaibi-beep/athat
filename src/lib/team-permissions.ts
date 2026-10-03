export type SchoolRole =
  | "principal"
  | "vice_principal"
  | "counselor"
  | "teacher"
  | "admin_staff"
  | "guard"
  | "observer"
  | "student"
  | "parent"
  | "custom";

export type PermissionKey =
  | "dashboard.view"
  | "team.view"
  | "team.manage"
  | "tasks.view"
  | "tasks.manage"
  | "reports.view"
  | "reports.create"
  | "reports.approve"
  | "messages.view"
  | "messages.send"
  | "documents.view"
  | "documents.edit"
  | "settings.view"
  | "settings.edit"
  | "students.view"
  | "students.edit"
  | "programs.view"
  | "programs.edit"
  | "cases.view"
  | "cases.edit"
  | "interviews.view"
  | "interviews.edit"
  | "attendance.view"
  | "attendance.edit"
  | "referrals.view"
  | "referrals.edit"
  | "posts.view"
  | "posts.edit"
  | "guidance.full";

export type DataScope = {
  type: "school" | "stage" | "grade" | "classroom" | "assigned" | "self" | "children";
  stage?: string;
  grade?: string;
  classroom?: string;
};

export const SCHOOL_ROLES: Array<{ value: SchoolRole; label: string; description: string }> = [
  { value: "principal", label: "مدير المدرسة", description: "إدارة الفريق والمهام والاعتمادات والتقارير." },
  { value: "vice_principal", label: "وكيل المدرسة", description: "إدارة تشغيلية واسعة مع قابلية تقييد الصلاحيات." },
  { value: "counselor", label: "الموجه الطلابي", description: "كامل أعمال التوجيه الطلابي والسجلات المرتبطة." },
  { value: "teacher", label: "معلم", description: "المهام والإحالات وما يرتبط بطلابه ونطاقه." },
  { value: "admin_staff", label: "إداري", description: "المهام والمراسلات والمستندات الإدارية المحددة." },
  { value: "student", label: "طالب", description: "صلاحيات ذاتية محدودة وآمنة." },
  { value: "parent", label: "ولي أمر", description: "صلاحيات مرتبطة بالأبناء والخدمات المخصصة." },
  { value: "guard", label: "حارس", description: "المهام المحددة فقط." },
  { value: "observer", label: "اطلاع فقط", description: "عرض محدود دون تعديل." },
  { value: "custom", label: "مخصص", description: "ابدأ من دون صلاحيات واخترها يدويًا." },
];

export const PERMISSION_GROUPS: Array<{
  title: string;
  items: Array<{ key: PermissionKey; label: string }>;
}> = [
  {
    title: "الفريق والمهام",
    items: [
      { key: "dashboard.view", label: "عرض لوحة العمل" },
      { key: "team.view", label: "عرض فريق المدرسة" },
      { key: "team.manage", label: "إدارة الفريق والصلاحيات" },
      { key: "tasks.view", label: "عرض المهام" },
      { key: "tasks.manage", label: "إنشاء وإسناد واعتماد المهام" },
    ],
  },
  {
    title: "التقارير والمراسلات",
    items: [
      { key: "reports.view", label: "عرض التقارير" },
      { key: "reports.create", label: "إنشاء التقارير" },
      { key: "reports.approve", label: "اعتماد التقارير" },
      { key: "messages.view", label: "عرض الرسائل" },
      { key: "messages.send", label: "إرسال الرسائل" },
      { key: "documents.view", label: "عرض المستندات" },
      { key: "documents.edit", label: "إنشاء وتعديل المستندات" },
    ],
  },
  {
    title: "بيانات الطلاب والتوجيه",
    items: [
      { key: "students.view", label: "عرض الطلاب" },
      { key: "students.edit", label: "تعديل بيانات الطلاب" },
      { key: "programs.view", label: "عرض البرامج والخطة" },
      { key: "programs.edit", label: "إدارة البرامج والخطة" },
      { key: "cases.view", label: "عرض الحالات" },
      { key: "cases.edit", label: "إدارة الحالات" },
      { key: "interviews.view", label: "عرض المقابلات" },
      { key: "interviews.edit", label: "إدارة المقابلات" },
      { key: "attendance.view", label: "عرض المواظبة" },
      { key: "attendance.edit", label: "إدارة المواظبة" },
      { key: "referrals.view", label: "عرض الإحالات" },
      { key: "referrals.edit", label: "إنشاء ومعالجة الإحالات" },
      { key: "posts.view", label: "عرض إدارة المدونة" },
      { key: "posts.edit", label: "النشر وإدارة المدونة" },
      { key: "guidance.full", label: "وصول كامل لمساحة التوجيه الحساسة" },
    ],
  },
  {
    title: "الإعدادات",
    items: [
      { key: "settings.view", label: "عرض الإعدادات" },
      { key: "settings.edit", label: "تعديل الإعدادات" },
    ],
  },
];

export const ROLE_PERMISSION_PRESETS: Record<SchoolRole, Record<string, boolean>> = {
  principal: {
    "dashboard.view": true, "team.view": true, "team.manage": true,
    "tasks.view": true, "tasks.manage": true,
    "reports.view": true, "reports.create": true, "reports.approve": true,
    "messages.view": true, "messages.send": true,
    "documents.view": true, "documents.edit": true,
    "settings.view": true, "settings.edit": true,
  },
  vice_principal: {
    "dashboard.view": true, "team.view": true, "team.manage": true,
    "tasks.view": true, "tasks.manage": true,
    "reports.view": true, "reports.create": true, "reports.approve": true,
    "messages.view": true, "messages.send": true,
    "documents.view": true, "documents.edit": true,
    "settings.view": true,
  },
  counselor: Object.fromEntries(PERMISSION_GROUPS.flatMap((group) => group.items.map((item) => [item.key, item.key !== "team.manage" && item.key !== "reports.approve" && item.key !== "settings.edit"]))) as Record<string, boolean>,
  teacher: {
    "dashboard.view": true, "team.view": true, "tasks.view": true,
    "messages.view": true, "messages.send": true,
    "students.view": true, "referrals.view": true, "referrals.edit": true,
  },
  admin_staff: {
    "dashboard.view": true, "team.view": true, "tasks.view": true,
    "messages.view": true, "messages.send": true, "documents.view": true,
  },
  guard: { "dashboard.view": true, "tasks.view": true, "messages.view": true },
  observer: { "dashboard.view": true, "team.view": true, "tasks.view": true, "reports.view": true },
  student: { "dashboard.view": true, "students.view": true, "messages.view": true, "documents.view": true },
  parent: { "dashboard.view": true, "students.view": true, "messages.view": true, "documents.view": true },
  custom: {},
};

export function roleLabel(role: string) {
  return SCHOOL_ROLES.find((item) => item.value === role)?.label ?? role;
}

export function permissionsForRole(role: SchoolRole) {
  return { ...(ROLE_PERMISSION_PRESETS[role] ?? {}) };
}

export function hasPermission(
  membership: { role?: string | null; is_admin?: boolean | null; permissions?: Record<string, boolean> | null } | null | undefined,
  permission: PermissionKey,
) {
  if (!membership) return true;
  const role = membership.role as SchoolRole;
  const explicit = membership.permissions?.[permission];
  if (typeof explicit === "boolean") return explicit;
  return Boolean(ROLE_PERMISSION_PRESETS[role]?.[permission]);
}
