import type { SchoolSettings } from "@/lib/school";

export function OfficialHeader({ school, title }: { school?: SchoolSettings | null; title: string }) {
  return (
    <div className="border-b-2 border-primary pb-4 text-center">
      <div className="flex items-start justify-between text-xs font-semibold">
        <div className="text-right leading-6">
          <p>المملكة العربية السعودية</p>
          <p>وزارة التعليم</p>
          <p>{school?.education_dept || "إدارة التعليم"}</p>
          <p>{school?.education_office || "مكتب التعليم"}</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-extrabold text-primary">ذات</p>
          <p className="text-[11px] text-muted-foreground">منصة الموجه الطلابي</p>
        </div>
        <div className="text-left leading-6">
          <p>{school?.school_name || "اسم المدرسة"}</p>
          <p>العام الدراسي: {school?.academic_year || "—"}</p>
          <p>الفصل الدراسي: {school?.semester || "—"}</p>
        </div>
      </div>
      <h2 className="mt-4 text-lg font-extrabold">{title}</h2>
    </div>
  );
}

export function OfficialFooter({ school }: { school?: SchoolSettings | null }) {
  return (
    <div className="mt-8 flex justify-between border-t pt-6 text-xs font-semibold">
      <div className="text-center">
        <p>الموجه الطلابي</p>
        <p className="mt-6">{school?.counselor_name || "................."}</p>
      </div>
      <div className="text-center">
        <p>مدير المدرسة</p>
        <p className="mt-6">{school?.principal_name || "................."}</p>
      </div>
    </div>
  );
}
