import type { SchoolSettings } from "@/lib/school";
import moeLogo from "@/assets/moe-logo-official.png";
import { formatHijriDate } from "@/lib/date";

function todayDate() {
  return formatHijriDate(new Date());
}

function AthatDocumentMark() {
  return (
    <img
      src="/brand-final.webp?v=20261001-finalbrandbrand"
      alt="شعار الذات"
      className="h-14 w-14 shrink-0 rounded-[14px] object-contain"
    />
  );
}

export function OfficialHeader({
  school,
  title,
  reportNo,
  attachments,
}: {
  school?: SchoolSettings | null | undefined;
  title: string;
  reportType?: string | undefined;
  reportNo?: string | undefined;
  period?: string | undefined;
  attachments?: string | number | undefined;
}) {
  return (
    <header data-pdf-header="true" className="official-letterhead bg-white text-[#123d49]">
      <div className="official-header-grid grid grid-cols-[minmax(0,1fr)_170px_minmax(0,1fr)] items-center gap-8 px-10 pb-5 pt-6">
        <section
          className="official-authority-block flex min-h-[7.75rem] flex-col items-center justify-center text-center text-[10.5px] font-bold leading-[1.9]"
          dir="rtl"
        >
          <p className="text-[11.5px] font-black">المملكة العربية السعودية</p>
          <p className="font-black">وزارة التعليم</p>
          <p>{school?.education_dept || "إدارة التعليم"}</p>
          <p className="font-black">{school?.school_name || "اسم المدرسة"}</p>
        </section>

        <section className="official-ministry-block flex min-w-40 flex-col items-center justify-center gap-2">
          <img
            src={school?.ministry_logo_url || moeLogo}
            alt="شعار وزارة التعليم"
            width={150}
            height={88}
            className="official-ministry-logo h-[72px] w-[140px] object-contain"
          />
        </section>

        <section
          className="official-document-meta flex min-h-[7.75rem] flex-col items-center justify-center text-center text-[10px] leading-[1.9]"
          dir="rtl"
        >
          <p>
            <span className="font-black">رقم المستند:</span>{" "}
            <span>{reportNo || "........................"}</span>
          </p>
          <p>
            <span className="font-black">التاريخ:</span>{" "}
            <span>{todayDate()}</span>
          </p>
          <p className="max-w-[13rem]">
            <span className="font-black">الموضوع:</span>{" "}
            <span>{title}</span>
          </p>
          <p>
            <span className="font-black">المرفقات:</span>{" "}
            <span>{attachments ?? "—"}</span>
          </p>
        </section>
      </div>

      <div className="official-letterhead-rule" aria-hidden="true">
        <span className="official-letterhead-rule-teal" />
        <span className="official-letterhead-emblem">◆</span>
        <span className="official-letterhead-rule-gold" />
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

      <div data-pdf-footer="true" className="official-footer-brand">
        <span className="official-footer-line official-footer-line-right" aria-hidden="true" />
        <div className="official-footer-logo" aria-label="الذات ATHAT">
          <AthatDocumentMark />
        </div>
        <span className="official-footer-line official-footer-line-left" aria-hidden="true" />
      </div>
    </footer>
  );
}
