import type { SchoolSettings } from "@/lib/school";
import moeLogo from "@/assets/moe-logo-official.png";
import { formatHijriDate } from "@/lib/date";

function todayDate() {
  return formatHijriDate(new Date());
}

function AthatDocumentMark() {
  return (
    <svg
      viewBox="0 0 180 300"
      role="img"
      aria-label="شعار الذات"
      className="h-11 w-8 shrink-0"
    >
      <defs>
        <linearGradient id="athat-doc-teal" x1="20" y1="270" x2="115" y2="25" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#07566A" />
          <stop offset="1" stopColor="#2A9D8F" />
        </linearGradient>
        <linearGradient id="athat-doc-gold" x1="100" y1="265" x2="155" y2="35" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#C79A5B" />
          <stop offset="1" stopColor="#E5C27B" />
        </linearGradient>
      </defs>
      <path d="M80 285C57 226 60 176 83 137C105 99 124 68 126 18C157 70 151 126 119 164C94 194 83 233 80 285Z" fill="url(#athat-doc-gold)" />
      <path d="M67 283C25 231 15 181 32 136C47 97 78 72 91 18C107 73 95 119 65 154C42 181 44 229 67 283Z" fill="url(#athat-doc-teal)" />
      <path d="M76 285C68 238 77 201 102 173C129 143 144 111 143 72C163 117 151 160 121 191C99 214 85 245 76 285Z" fill="#F7F0E4" />
      <path d="M67 283C81 244 103 216 132 197C153 183 166 162 173 139C177 180 159 211 129 229C104 244 84 262 67 283Z" fill="#0A6A73" />
    </svg>
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

        <section className="official-ministry-block flex min-w-40 flex-col items-center justify-center">
          <img
            src={school?.ministry_logo_url || moeLogo}
            alt="شعار وزارة التعليم"
            width={150}
            height={88}
            className="official-ministry-logo h-[82px] w-[150px] object-contain"
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
          <div className="text-center leading-none">
            <p className="text-[18px] font-black text-[#07566a]">الذات</p>
            <p className="mt-1 text-[7px] font-black tracking-[0.28em] text-[#c79a5b]">ATHAT</p>
          </div>
          <AthatDocumentMark />
        </div>
        <span className="official-footer-line official-footer-line-left" aria-hidden="true" />
      </div>
    </footer>
  );
}
