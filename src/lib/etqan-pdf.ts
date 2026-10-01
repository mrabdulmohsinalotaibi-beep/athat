export type EtqanAttendanceRow = {
  nationalId: string;
  studentName: string;
  grade: string;
  classroom: string;
  phone: string;
  date: string;
  excuse: string;
  absenceType: string;
};

const normalize = (value: string) =>
  value.replace(/[\u200e\u200f]/g, " ").replace(/\s+/g, " ").trim();

export async function readEtqanAttendancePdf(file: File): Promise<EtqanAttendanceRow[]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const document = await pdfjs.getDocument({ data: bytes }).promise;
  const rows: EtqanAttendanceRow[] = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = normalize(
      content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" "),
    );

    const identities = [...text.matchAll(/\b\d{10}\b/g)];
    for (let index = 0; index < identities.length; index += 1) {
      const current = identities[index];
      if (!current) continue;
      const start = current.index ?? 0;
      const end = identities[index + 1]?.index ?? text.length;
      const record = text.slice(start, end);
      const date = record.match(/\b14\d{2}[-/]\d{2}[-/]\d{2}\b/)?.[0]?.replaceAll("/", "-");
      const grade = record.match(/(الأول|االول|الثاني|الثالث)\s+المتوسط\s+(\d{1,2})/);
      if (!date || !grade) continue;

      const phone = record.match(/\b966\d{9}\b/)?.[0] ?? "";
      const afterId = record.slice(current[0].length);
      const gradeAt = afterId.search(/(الأول|االول|الثاني|الثالث)\s+المتوسط/);
      const studentName = normalize((gradeAt >= 0 ? afterId.slice(0, gradeAt) : "").replace(/^\d+\s+/, ""));

      rows.push({
        nationalId: current[0] ?? "",
        studentName,
        grade: grade[1] ?? "",
        classroom: grade[2] ?? "",
        phone,
        date,
        excuse: /بدون\s+عذر/.test(record) ? "بدون عذر" : /بعذر/.test(record) ? "بعذر" : "",
        absenceType: /يوم\s+كامل/.test(record) ? "يوم كامل" : /حص[هة]/.test(record) ? "حصة" : "غياب",
      });
    }
  }

  return [...new Map(rows.map((row) => [row.nationalId + "|" + row.date, row])).values()];
}
