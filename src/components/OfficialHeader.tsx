import type { SchoolSettings } from "@/lib/school";
import moeLogo from "@/assets/moe-logo.png";

function todayHijriLike() {
  return new Date().toLocaleDateString("ar-SA-u-ca-gregory", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function OfficialHeader({
  school,
  title,
  reportType,
  period,
}: {
  school?: SchoolSettings | null | undefined;
  title: string;
  reportType?: string;
  period?: string;
}) {
  return (
    <div className="border-b-2 border-primary pb-4">
      <div className="grid grid-cols-3 items-center gap-3 text-[11px] font-semibold">
        <div className="text-right leading-6">
          <p>{school?.school_name || "اسم المدرسة"}</p>
          <p>العام الدراسي: {school?.academic_year || "—"}</p>
          <p>الفصل الدراسي: {school?.semester || "—"}</p>
        </div>

        <div className="flex flex-col items-center text-center leading-5">
          <img src={moeLogo} alt="شعار وزارة التعليم" width={72} height={72} className="size-16 object-contain" />
          <p className="mt-1">المملكة العربية السعودية</p>
          <p>وزارة التعليم</p>
          <p>{school?.education_dept || "إدارة التعليم"}</p>
        </div>

        <div className="text-left leading-6">
          <p>نوع التقرير: {reportType || title}</p>
          <p>التاريخ: {todayHijriLike()}</p>
          {period && <p>الفترة: {period}</p>}
        </div>
      </div>
      <h2 className="mt-4 text-center text-lg font-extrabold">{title}</h2>
    </div>
  );
}

export function OfficialFooter({ school }: { school?: SchoolSettings | null | undefined }) {
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
