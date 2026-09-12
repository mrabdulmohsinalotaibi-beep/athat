import type { SchoolSettings } from "@/lib/school";
import moeLogo from "@/assets/moe-logo-official.png";
import { Copyright } from "@/components/Copyright";

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
      <div className="grid grid-cols-1 items-stretch gap-3 px-2 text-[11px] font-semibold sm:grid-cols-[minmax(0,1fr)_7rem_minmax(0,1fr)] sm:gap-4 sm:px-4 lg:grid-cols-[minmax(0,1fr)_9rem_minmax(0,1fr)] lg:gap-6 lg:px-6">
        <div className="flex min-h-24 w-full flex-col items-center justify-center text-center leading-6">
          <p>المملكة العربية السعودية</p>
          <p>وزارة التعليم</p>
          <p>إدارة التعليم {school?.education_dept || "—"}</p>
          <p>{school?.school_name || "اسم المدرسة"}</p>
        </div>

        <div className="mx-auto flex min-h-20 w-28 items-center justify-center text-center sm:min-h-24 sm:w-28 lg:w-36">
          <img
            src={moeLogo}
            alt="شعار وزارة التعليم"
            width={144}
            height={104}
            className="h-20 w-28 object-contain sm:h-24 lg:w-36"
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
    <div className="report-signatures mt-8 grid grid-cols-1 gap-6 border-t pt-5 text-xs font-semibold sm:grid-cols-2 sm:gap-12">
      <div className="flex min-h-28 flex-col items-center text-center">
        <p>الموجه الطلابي</p>
        {school?.counselor_signature ? (
          <img src={school.counselor_signature} alt="توقيع الموجه الطلابي" className="mt-2 h-16 w-40 object-contain" />
        ) : <div className="h-16" />}
        <p>{school?.counselor_name || "................."}</p>
      </div>
      <div className="flex min-h-28 flex-col items-center text-center">
        <p>مدير المدرسة</p>
        {school?.principal_signature ? (
          <img src={school.principal_signature} alt="توقيع مدير المدرسة" className="mt-2 h-16 w-40 object-contain" />
        ) : <div className="h-16" />}
        <p>{school?.principal_name || "................."}</p>
      </div>
      <Copyright className="col-span-full mt-2 border-t pt-3 font-normal" />
    </div>
  );
}
