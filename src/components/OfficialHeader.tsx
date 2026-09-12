import type { SchoolSettings } from "@/lib/school";
import moeLogo from "@/assets/moe-logo.png";

function todayDate() {
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
  reportNo,
  period,
}: {
  school?: SchoolSettings | null | undefined;
  title: string;
  reportType?: string;
  reportNo?: string;
  period?: string;
}) {
  return (
    <div className="border-b-2 border-primary pb-4">
      <div className="grid grid-cols-3 items-start gap-3 text-[11px] font-semibold">
        <div className="text-right leading-6">
          <p>المملكة العربية السعودية</p>
          <p>وزارة التعليم</p>
          <p>{school?.education_dept || "إدارة التعليم"}</p>
          <p>{school?.school_name || "اسم المدرسة"}</p>
        </div>

        <div className="flex flex-col items-center justify-center text-center">
          <img
            src={moeLogo}
            alt="شعار وزارة التعليم"
            width={112}
            height={112}
            className="size-24 object-contain"
          />
        </div>

        <div className="text-left leading-6">
          <p>التاريخ: {todayDate()}</p>
          <p>الفصل الدراسي: {school?.semester || "—"}</p>
          <p>نوع التقرير: {reportType || title}</p>
          {reportNo && <p>رقم التقرير: {reportNo}</p>}
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
