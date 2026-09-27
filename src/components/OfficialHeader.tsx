import type { SchoolSettings } from "@/lib/school";
import moeLogo from "@/assets/moe-logo-official.png";
import { Copyright } from "@/components/Copyright";
import { formatHijriDate } from "@/lib/date";

function todayDate() {
  return formatHijriDate(new Date());
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
    <>
      <style>{`
        @media print {
          .print-repeat-header { position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important; width: 100% !important; z-index: 9999 !important; background: #fff !important; }
          .print-repeat-footer { position: fixed !important; bottom: 0 !important; left: 0 !important; right: 0 !important; width: 100% !important; z-index: 9999 !important; background: #fff !important; }
        }
      `}</style>
    <div className="official-letterhead print-repeat-header border-b-2 border-paper-border bg-paper text-paper-foreground pb-4">
      <div className="grid grid-cols-[minmax(0,1fr)_9rem_minmax(0,1fr)] items-stretch gap-6 px-6 text-[11px] font-semibold">
        <div className="flex min-h-24 w-full flex-col items-center justify-center text-center leading-6">
          <p>المملكة العربية السعودية</p>
          <p>وزارة التعليم</p>
          <p>{school?.education_dept || "إدارة التعليم"}</p>
          <p>{school?.school_name || "اسم المدرسة"}</p>
        </div>

        <div className="mx-auto flex min-h-24 w-36 items-center justify-center text-center">
          <img
            src={moeLogo}
            alt="شعار وزارة التعليم"
            width={144}
            height={104}
            className="h-24 w-36 object-contain"
          />
        </div>

        <div
          className="flex min-h-24 w-full flex-col items-center justify-center text-center leading-6"
          dir="rtl"
        >
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
    </>
  );
}

export function OfficialFooter({
  school,
  repeatEveryPage = true,
}: {
  school?: SchoolSettings | null | undefined;
  repeatEveryPage?: boolean;
}) {
  const showCounselor = school?.show_counselor_on_documents !== false;
  const showPrincipal = school?.show_principal_on_documents !== false;
  const visibleSignatures = Number(showCounselor) + Number(showPrincipal);

  return (
    <div
      className={`report-signatures mt-8 ${repeatEveryPage ? "print-repeat-footer" : ""} grid gap-8 border-t border-paper-border pt-5 text-xs font-semibold text-paper-foreground`}
      style={{
        gridTemplateColumns: `repeat(${Math.max(visibleSignatures, 1)}, minmax(0, 1fr))`,
      }}
    >
      {showCounselor && <div className="flex min-h-28 flex-col items-center text-center">
        <p>الموجه الطلابي</p>
        {school?.counselor_signature ? (
          <img
            src={school.counselor_signature}
            alt="توقيع الموجه الطلابي"
            className="mt-2 h-16 w-40 object-contain"
          />
        ) : (
          <div className="h-16" />
        )}
        <p>{school?.counselor_name || "................."}</p>
      </div>}
      {showPrincipal && <div className="flex min-h-28 flex-col items-center text-center">
        <p>مدير المدرسة</p>
        {school?.principal_signature ? (
          <img
            src={school.principal_signature}
            alt="توقيع مدير المدرسة"
            className="mt-2 h-16 w-40 object-contain"
          />
        ) : (
          <div className="h-16" />
        )}
        <p>{school?.principal_name || "................."}</p>
      </div>}
      <Copyright className="col-span-full mt-2 border-t pt-2 text-right text-[9px] font-normal" />
    </div>
  );
}
