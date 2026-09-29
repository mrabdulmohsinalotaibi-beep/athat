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
    <header data-pdf-header="true" className="official-letterhead bg-white text-[#272727]">
      <div className="official-letterhead-accent" />

      <div className="official-header-grid grid grid-cols-[1fr_auto_1fr] items-start gap-5 px-7 pb-4 pt-5">
        <section className="official-authority-block text-right text-[10px] leading-[1.85]">
          <p className="text-[11px] font-black">المملكة العربية السعودية</p>
          <p className="font-bold">وزارة التعليم</p>
          <p>{school?.education_dept || "إدارة التعليم"}</p>
          <p className="mt-0.5 font-bold">{school?.school_name || "اسم المدرسة"}</p>
        </section>

        <section className="official-ministry-block flex min-w-32 flex-col items-center">
          <img
            src={school?.ministry_logo_url || moeLogo}
            alt="شعار وزارة التعليم"
            width={132}
            height={82}
            className="official-ministry-logo h-[72px] w-[132px] object-contain"
          />
          <div className="mt-2 h-px w-20 bg-[#b8aea0]" />
        </section>

        <section className="official-document-meta text-left text-[9.5px] leading-[1.8]" dir="rtl">
          <div className="inline-grid min-w-[11.5rem] gap-0.5 text-right">
            <p><span className="font-black">العام الدراسي:</span> {school?.academic_year || "—"}</p>
            <p><span className="font-black">الفصل الدراسي:</span> {school?.semester || "—"}</p>
            {reportNo && <p><span className="font-black">رقم المستند:</span> {reportNo}</p>}
            {period && <p><span className="font-black">الفترة:</span> {period}</p>}
          </div>
        </section>
      </div>

      <div className="official-title-band mx-7 border-y border-[#d8d2c8] py-3.5 text-center">
        <p className="text-[9px] font-bold tracking-wide text-[#756f67]">
          {reportType || "مستند رسمي"}
        </p>
        <h2 className="official-document-title mx-auto mt-1 max-w-[92%] text-[19px] font-black leading-relaxed text-[#2f2f2f]">
          {title}
        </h2>
      </div>

      {school?.logo_url && (
        <div className="official-school-seal absolute bottom-3 left-7">
          <img
            src={school.logo_url}
            alt="شعار المدرسة"
            className="official-school-logo h-10 max-w-24 object-contain opacity-90"
          />
        </div>
      )}
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
    <footer className="official-document-footer">
      {(showCounselor || showPrincipal) && (
        <div
          className="report-signatures final-signatures grid gap-12 px-5 pt-5 text-[11px] text-[#36322e]"
          style={{ gridTemplateColumns: `repeat(${Math.max(visibleSignatures, 1)}, minmax(0, 1fr))` }}
        >
          {showCounselor && (
            <div className="official-signature-block flex min-h-24 flex-col items-center text-center">
              <p className="font-black">الموجه الطلابي</p>
              {school?.counselor_signature ? (
                <img
                  src={school.counselor_signature}
                  alt="توقيع الموجه الطلابي"
                  className="my-1 h-12 w-36 object-contain"
                />
              ) : (
                <div className="h-12" />
              )}
              <p className="border-t border-[#cfc7bc] px-5 pt-1.5 font-bold">
                {school?.counselor_name || "........................"}
              </p>
            </div>
          )}
          {showPrincipal && (
            <div className="official-signature-block flex min-h-24 flex-col items-center text-center">
              <p className="font-black">مدير المدرسة</p>
              {school?.principal_signature ? (
                <img
                  src={school.principal_signature}
                  alt="توقيع مدير المدرسة"
                  className="my-1 h-12 w-36 object-contain"
                />
              ) : (
                <div className="h-12" />
              )}
              <p className="border-t border-[#cfc7bc] px-5 pt-1.5 font-bold">
                {school?.principal_name || "........................"}
              </p>
            </div>
          )}
        </div>
      )}

      <div data-pdf-footer="true" className="official-footer-line mx-auto mt-4 w-[94%] text-center">
        <div className="h-px w-full bg-[#d8d2c8]" />
        <p className="py-2 text-[8.5px] font-medium tracking-wide text-[#77716a]">
          <span className="font-black text-[#3c3c3c]">{school?.school_name || "المدرسة"}</span>
          <span className="mx-2 text-[#b0a79a]">|</span>
          <span>منصة الذات · ATHAT</span>
          <span className="mx-2 text-[#b0a79a]">|</span>
          <span>{todayDate()}</span>
        </p>
      </div>
    </footer>
  );
}
