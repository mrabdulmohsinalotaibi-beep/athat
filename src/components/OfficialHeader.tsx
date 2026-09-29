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
      <div data-pdf-header="true" className="official-letterhead overflow-hidden rounded-b-[1.35rem] bg-[var(--letterhead-primary)] pb-4 text-white">
        <div className="official-header-grid grid grid-cols-1 items-center gap-3 border-t-4 border-[var(--letterhead-secondary)] px-4 py-3 text-[11px] font-semibold sm:grid-cols-[minmax(0,1fr)_10rem_minmax(0,1fr)] sm:gap-6 sm:px-6">
          <div className="flex min-h-24 w-full flex-col items-center justify-center text-center leading-6">
            <p>المملكة العربية السعودية</p>
            <p>وزارة التعليم</p>
            <p>{school?.education_dept || "إدارة التعليم"}</p>
            <p>{school?.school_name || "اسم المدرسة"}</p>
            {school?.logo_url && (
              <img
                src={school.logo_url}
                alt="شعار المدرسة"
                className="official-school-logo mt-2 h-16 w-28 rounded-lg p-1 object-contain" style={{ backgroundColor: "rgba(255,255,255,0.95)" }}
              />
            )}
          </div>

          <div className="mx-auto flex min-h-24 w-36 items-center justify-center text-center">
            <img
              src={school?.ministry_logo_url || moeLogo}
              alt="شعار وزارة التعليم"
              width={144}
              height={104}
              className="official-ministry-logo h-24 w-36 object-contain sm:h-28 sm:w-40"
            />
          </div>

          <div
            className="flex min-h-24 w-full flex-col items-center justify-center text-center leading-6"
            dir="rtl"
          >
            <p>العام الدراسي: {school?.academic_year || "—"}</p>
            <p>الفصل الدراسي: {school?.semester || "—"}</p>
            <p>نوع المستند: {reportType || title}</p>
            <p>تاريخ الإصدار: {todayDate()}</p>
            {reportNo && <p>رقم المستند: {reportNo}</p>}
            {period && <p>الفترة: {period}</p>}
          </div>
        </div>
        <h2 className="official-document-title mx-auto mt-3 w-fit rounded-t-lg border px-7 py-2 text-center text-lg font-extrabold text-white" style={{ borderColor: "rgba(255,255,255,0.18)", backgroundColor: "rgba(255,255,255,0.10)" }}>
          {title}
        </h2>
      </div>
    </>
  );
}

export function OfficialFooter({
  school,
}: {
  school?: SchoolSettings | null | undefined;
}) {
  const showCounselor = school?.show_counselor_on_documents !== false;
  const showPrincipal = school?.show_principal_on_documents !== false;
  const visibleSignatures = Number(showCounselor) + Number(showPrincipal);

  return (
    <div
      className="report-signatures final-signatures mt-8 grid gap-8 border-t border-paper-border pt-5 text-xs font-semibold text-paper-foreground"
      style={{ gridTemplateColumns: `repeat(${Math.max(visibleSignatures, 1)}, minmax(0, 1fr))` }}
    >
      {showCounselor && (
        <div className="flex min-h-28 flex-col items-center text-center">
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
        </div>
      )}
      {showPrincipal && (
        <div className="flex min-h-28 flex-col items-center text-center">
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
        </div>
      )}
      <div className="col-span-full mt-1 flex items-center justify-between gap-3 border-t border-paper-border pt-2 text-[9px] font-normal text-paper-muted-foreground">
        <span>{school?.school_name || "المدرسة"} · مستند صادر من منصة الذات</span>
        <span>{todayDate()}</span>
      </div>
      <Copyright className="col-span-full text-right text-[9px] font-normal" />
    </div>
  );
}
