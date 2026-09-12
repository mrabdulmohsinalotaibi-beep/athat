import type { SchoolSettings } from "@/lib/school";
import moeLogo from "@/assets/moe-logo-official.png";

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
    <div className="official-letterhead border-b-2 border-primary bg-card pb-4">
      <div className="grid grid-cols-[minmax(0,1fr)_9rem_minmax(0,1fr)] items-stretch gap-6 px-2 text-[11px] font-semibold sm:px-6">
        <div className="flex min-h-24 w-full flex-col items-center justify-center text-center leading-6">
          <p>المملكة العربية السعودية</p>
          <p>وزارة التعليم</p>
          <p>إدارة التعليم {school?.education_dept || "—"}</p>
          <p>{school?.school_name || "اسم المدرسة"}</p>
        </div>

        <div className="flex min-h-24 w-36 items-center justify-center text-center">
          <img
            src={moeLogo}
            alt="شعار وزارة التعليم"
            width={144}
            height={104}
            className="h-24 w-36 object-contain"
          />
        </div>

        <div className="flex min-h-24 w-full flex-col items-center justify-center text-center leading-6" dir="rtl">
          <p>التاريخ: {todayDate()}</p>
          <p>العام الدراسي: {school?.academic_year || "—"}</p>
          <p>الفصل الدراسي: {school?.semester || "—"}</p>
          <p>نوع السجل: {reportType || title}</p>
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
