import type { SchoolSettings } from "@/lib/school";
import moeLogo from "@/assets/moe-logo-official.png";
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
  reportType?: string | undefined;
  reportNo?: string | undefined;
  period?: string | undefined;
}) {
  return (
    <header
      data-pdf-header="true"
      className="official-letterhead overflow-hidden rounded-xl border border-paper-border bg-white text-[#2f2f2f]"
    >
      <div className="h-2 bg-[var(--letterhead-primary)]" />
      <div className="official-header-grid grid items-center gap-4 px-5 py-5 sm:grid-cols-[minmax(0,1fr)_9rem_minmax(0,1fr)] sm:px-7">
        <section className="order-2 text-center text-[10px] font-semibold leading-5 sm:order-1 sm:text-right">
          <p className="text-xs font-black">المملكة العربية السعودية</p>
          <p>وزارة التعليم</p>
          <p>{school?.education_dept || "إدارة التعليم"}</p>
          {school?.logo_url && (
            <div className="mt-2 flex justify-center sm:justify-start">
              <img
                src={school.logo_url}
                alt="شعار المدرسة"
                className="official-school-logo h-12 max-w-28 object-contain"
              />
            </div>
          )}
        </section>

        <section className="order-1 flex flex-col items-center justify-center sm:order-2">
          <img
            src={school?.ministry_logo_url || moeLogo}
            alt="شعار وزارة التعليم"
            width={128}
            height={92}
            className="official-ministry-logo h-20 w-32 object-contain"
          />
        </section>

        <section className="order-3 text-center text-[10px] leading-5 sm:text-left" dir="rtl">
          <div className="inline-grid min-w-[12rem] gap-0.5 rounded-lg border border-[#ded8cf] bg-[#faf9f6] px-3 py-2 text-right">
            <p><span className="font-bold">العام الدراسي:</span> {school?.academic_year || "—"}</p>
            <p><span className="font-bold">الفصل الدراسي:</span> {school?.semester || "—"}</p>
            <p><span className="font-bold">نوع المستند:</span> {reportType || title}</p>
            {reportNo && <p><span className="font-bold">رقم المستند:</span> {reportNo}</p>}
            {period && <p><span className="font-bold">الفترة:</span> {period}</p>}
          </div>
        </section>
      </div>

      <div className="border-t border-paper-border px-5 pb-5 pt-4 text-center">
        <p className="text-[10px] font-bold text-[#77716a]">
          {school?.school_name || "اسم المدرسة"}
        </p>
        <h2 className="official-document-title mx-auto mt-1.5 max-w-[90%] text-lg font-black tracking-tight text-[var(--letterhead-primary)]">
          {title}
        </h2>
        <div className="mx-auto mt-3 h-[2px] w-24 rounded-full bg-[var(--letterhead-secondary)]" />
      </div>
    </header>
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
    <footer className="official-document-footer mt-8">
      <div
        className="report-signatures final-signatures grid gap-8 border-t border-paper-border pt-5 text-xs font-semibold text-paper-foreground"
        style={{ gridTemplateColumns: `repeat(${Math.max(visibleSignatures, 1)}, minmax(0, 1fr))` }}
      >
        {showCounselor && (
          <div className="flex min-h-24 flex-col items-center text-center">
            <p>الموجه الطلابي</p>
            {school?.counselor_signature ? (
              <img
                src={school.counselor_signature}
                alt="توقيع الموجه الطلابي"
                className="mt-2 h-14 w-40 object-contain"
              />
            ) : (
              <div className="h-14" />
            )}
            <p>{school?.counselor_name || "................."}</p>
          </div>
        )}
        {showPrincipal && (
          <div className="flex min-h-24 flex-col items-center text-center">
            <p>مدير المدرسة</p>
            {school?.principal_signature ? (
              <img
                src={school.principal_signature}
                alt="توقيع مدير المدرسة"
                className="mt-2 h-14 w-40 object-contain"
              />
            ) : (
              <div className="h-14" />
            )}
            <p>{school?.principal_name || "................."}</p>
          </div>
        )}
      </div>

      <div
        data-pdf-footer="true"
        className="mt-5 border-t border-paper-border pt-2.5 text-center text-[9px] font-medium text-paper-muted-foreground"
      >
        <p className="leading-5">
          <span className="font-bold text-paper-foreground">{school?.school_name || "المدرسة"}</span>
          <span className="mx-2">•</span>
          <span>منصة الذات | ATHAT</span>
          <span className="mx-2">•</span>
          <span>{todayDate()}</span>
        </p>
      </div>
    </footer>
  );
}
