export type SchoolRole =
  | "principal" | "vice_principal" | "student_affairs_vice" | "academic_vice"
  | "counselor" | "teacher" | "activity_leader" | "health_guide"
  | "admin_staff" | "registrar" | "guard" | "observer" | "student" | "parent" | "custom";

export type PermissionKey =
  | "dashboard.view" | "team.view" | "team.manage" | "tasks.view" | "tasks.manage"
  | "reports.view" | "reports.create" | "reports.approve" | "messages.view" | "messages.send"
  | "documents.view" | "documents.edit" | "settings.view" | "settings.edit"
  | "students.view" | "students.edit" | "programs.view" | "programs.edit"
  | "cases.view" | "cases.edit" | "interviews.view" | "interviews.edit"
  | "attendance.view" | "attendance.edit" | "referrals.view" | "referrals.edit"
  | "posts.view" | "posts.edit" | "guidance.full";

export type DataScope={type:"school"|"stage"|"grade"|"classroom"|"assigned"|"self"|"children";stage?:string;grade?:string;classroom?:string};

export const SCHOOL_ROLES:Array<{value:SchoolRole;label:string;description:string}>=[
 {value:"principal",label:"مدير المدرسة",description:"الإشراف والاعتمادات والتقارير ومتابعة أعمال التوجيه."},
 {value:"student_affairs_vice",label:"وكيل شؤون الطلاب",description:"المواظبة والسلوك والإحالات والمتابعة الطلابية."},
 {value:"academic_vice",label:"وكيل الشؤون التعليمية",description:"التحصيل والخطط العلاجية والمتابعة التعليمية."},
 {value:"vice_principal",label:"وكيل المدرسة",description:"دور وكيل عام للتوافق مع الحسابات السابقة."},
 {value:"counselor",label:"الموجه الطلابي",description:"كامل أعمال التوجيه الطلابي والسجلات المرتبطة."},
 {value:"teacher",label:"معلم",description:"الإحالات والمبادرات والمهام والطلاب المسندون."},
 {value:"activity_leader",label:"رائد النشاط",description:"المبادرات والبرامج والأنشطة والشواهد المسندة."},
 {value:"health_guide",label:"الموجه الصحي",description:"الإحالات والبرامج الصحية والوقائية المصرح بها."},
 {value:"registrar",label:"الإداري / مسجل المعلومات",description:"بيانات الطلاب والسجلات التشغيلية المصرح بها."},
 {value:"admin_staff",label:"إداري",description:"المهام والمراسلات والمستندات الإدارية المحددة."},
 {value:"guard",label:"حارس",description:"المهام المحددة فقط."},{value:"observer",label:"اطلاع فقط",description:"عرض محدود دون تعديل."},
 {value:"student",label:"طالب",description:"صلاحيات ذاتية محدودة وآمنة."},{value:"parent",label:"ولي أمر",description:"صلاحيات مرتبطة بالأبناء والخدمات المخصصة."},
 {value:"custom",label:"مخصص",description:"ابدأ من دون صلاحيات واخترها يدويًا."},
];

export const PERMISSION_GROUPS:Array<{title:string;items:Array<{key:PermissionKey;label:string}>}>=[
 {title:"الفريق والمهام",items:[["dashboard.view","عرض لوحة العمل"],["team.view","عرض فريق المدرسة"],["team.manage","إدارة الفريق والصلاحيات"],["tasks.view","عرض المهام"],["tasks.manage","إنشاء وإسناد واعتماد المهام"]].map(([key,label])=>({key:key as PermissionKey,label}))},
 {title:"التقارير والمراسلات",items:[["reports.view","عرض التقارير"],["reports.create","إنشاء التقارير"],["reports.approve","اعتماد التقارير"],["messages.view","عرض الرسائل"],["messages.send","إرسال الرسائل"],["documents.view","عرض المستندات"],["documents.edit","إنشاء وتعديل المستندات"]].map(([key,label])=>({key:key as PermissionKey,label}))},
 {title:"بيانات الطلاب والتوجيه",items:[["students.view","عرض الطلاب"],["students.edit","تعديل بيانات الطلاب"],["programs.view","عرض البرامج والخطة"],["programs.edit","إدارة البرامج والخطة"],["cases.view","عرض الحالات"],["cases.edit","إدارة الحالات"],["interviews.view","عرض المقابلات"],["interviews.edit","إدارة المقابلات"],["attendance.view","عرض المواظبة"],["attendance.edit","إدارة المواظبة"],["referrals.view","عرض الإحالات"],["referrals.edit","إنشاء ومعالجة الإحالات"],["posts.view","عرض إدارة المدونة"],["posts.edit","النشر وإدارة المدونة"],["guidance.full","وصول كامل لمساحة التوجيه الحساسة"]].map(([key,label])=>({key:key as PermissionKey,label}))},
 {title:"الإعدادات",items:[["settings.view","عرض الإعدادات"],["settings.edit","تعديل الإعدادات"]].map(([key,label])=>({key:key as PermissionKey,label}))},
];
const P=(...keys:PermissionKey[])=>Object.fromEntries(keys.map(k=>[k,true])) as Record<string,boolean>;
const base=P("dashboard.view","tasks.view");
export const ROLE_PERMISSION_PRESETS:Record<SchoolRole,Record<string,boolean>>={
 principal:{...base,...P("team.view","team.manage","tasks.manage","reports.view","reports.create","reports.approve","messages.view","messages.send","documents.view","settings.view")},
 student_affairs_vice:{...base,...P("team.view","tasks.manage","reports.view","reports.create","reports.approve","messages.view","messages.send","students.view","attendance.view","attendance.edit","referrals.view","referrals.edit")},
 academic_vice:{...base,...P("reports.view","reports.create","messages.view","students.view","programs.view","referrals.view")},
 vice_principal:{...base,...P("team.view","team.manage","tasks.manage","reports.view","reports.create","reports.approve","messages.view","messages.send","documents.view","settings.view","students.view","attendance.view","attendance.edit","referrals.view","referrals.edit")},
 counselor:Object.fromEntries(PERMISSION_GROUPS.flatMap(g=>g.items.map(i=>[i.key,i.key!=="team.manage"&&i.key!=="reports.approve"&&i.key!=="settings.edit"]))) as Record<string,boolean>,
 teacher:{...base,...P("team.view","messages.view","messages.send","students.view","referrals.view","referrals.edit")},
 activity_leader:{...base,...P("programs.view","programs.edit","documents.view","documents.edit","reports.view","reports.create")},
 health_guide:{...base,...P("students.view","referrals.view","referrals.edit","reports.view")},
 registrar:{...base,...P("students.view","students.edit","documents.view")},
 admin_staff:{...base,...P("team.view","messages.view","messages.send","documents.view")},
 guard:{...base,...P("messages.view")},observer:{...base,...P("team.view","reports.view")},
 student:P("dashboard.view","students.view","messages.view","documents.view"),parent:P("dashboard.view","students.view","messages.view","documents.view"),custom:{}
};
export function roleLabel(role:string){return SCHOOL_ROLES.find(i=>i.value===role)?.label??role}
export function permissionsForRole(role:SchoolRole){return {...(ROLE_PERMISSION_PRESETS[role]??{})}}
export function hasPermission(membership:{role?:string|null;is_admin?:boolean|null;permissions?:Record<string,boolean>|null;group_permissions?:Record<string,boolean>|null}|null|undefined,permission:PermissionKey){
 if(!membership)return true; if(membership.is_admin)return true; const explicit=membership.permissions?.[permission];if(explicit===true)return true;if(membership.group_permissions?.[permission]===true)return true;if(explicit===false)return false;return Boolean(ROLE_PERMISSION_PRESETS[membership.role as SchoolRole]?.[permission]);
}