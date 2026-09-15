import { useState } from "react";
import * as XLSX from "xlsx";

// 1. التعريفات الهيكلية للمشروع
export interface MinistryProgram {
  week: number;
  term: string;
  name: string;
  ptype: string;
  domain: string;
  target_group: string;
  goal: string;
  indicator: string;
}

export interface PlanTaskRecord {
  id: string;
  seq: number;
  task: string;
  domain: string;
  target_group: string;
  term: string;
  indicator: string;
  exec_status: string;
  doc_status: string;
  required_evidence: string;
  due_date_hijri: string; // تاريخ الاستحقاق بالهجري
  evidence_urls: string[]; // الشواهد المرتبطة
}

export interface EvidenceRecord {
  id: string;
  name: string;
  etype: string;
  linked_type: "برنامج" | "حالة" | "مهمة";
  linked_ref: string;
  edate_hijri: string;
  doc_status: string;
  file_url: string;
  description: string;
}

// 2. البرامج الإرشادية الوزارية المعتمدة
export const MINISTRY_PROGRAMS: MinistryProgram[] = [
  { week: 1, term: "الفصل الأول", name: "أسبوع التهيئة والإرشاد", ptype: "إنمائي", domain: "تنظيمي", target_group: "جميع الطلاب", goal: "تهيئة الطلاب للعام الدراسي", indicator: "تنفيذ لقاء تهيئة" },
  { week: 2, term: "الفصل الأول", name: "تعزيز الانضباط المدرسي", ptype: "وقائي", domain: "سلوكي", target_group: "جميع الطلاب", goal: "رفع نسبة المواظبة تقليل الغياب", indicator: "انخفاض حالات التأخر" },
  { week: 4, term: "الفصل الأول", name: "برنامج رفق لمناهضة التنمر", ptype: "وقائي", domain: "سلوكي", target_group: "جميع الطلاب", goal: "الحد من التنمر المدرسي", indicator: "أنشطة توعوية واستبانة" },
  { week: 10, term: "الفصل الأول", name: "الإرشاد المهني والتعليمي", ptype: "إنمائي", domain: "أكاديمي", target_group: "صفوف منتهية", goal: "توجيه الطلاب للمسارات", indicator: "دليل مسارات + لقاء" },
];

// 3. محاكي التحويل إلى التقويم الهجري
export function getHijriDueDate(term: string, week: number): string {
  const baseYear = 1448; // السنة الهجرية المعتمدة
  let month = 1; // المحرم
  
  if (term === "الفصل الثاني") month = 5; // جمادى الأولى
  if (term === "الفصل الثالث") month = 8; // شعبان

  const calculatedDay = Math.min(28, week * 7 - 3);
  const formattedMonth = String(month).padStart(2, "0");
  const formattedDay = String(calculatedDay).padStart(2, "0");
  
  return `${baseYear}/${formattedMonth}/${formattedDay} هـ`;
}

// 4. المحرك الذكي لاستيراد البرامج والربط التلقائي بالشواهد والكليشة
export function useProgramManager() {
  const [tasks, setTasks] = useState<PlanTaskRecord[]>([]);
  const [evidences, setEvidences] = useState<EvidenceRecord[]>([]);

  /**
   * استيراد برنامج فردي محدد بالذكاء الاصطناعي مع تحويل التاريخ للهجري والربط الآلي
   */
  const importSingleProgram = (program: MinistryProgram) => {
    const hijriDate = getHijriDueDate(program.term, program.week);
    const taskId = `TASK-${Date.now()}`;
    const evidenceId = `EVI-${Date.now()}`;

    // 1. إنشاء المهمة داخل الخطة التشغيلية
    const newTask: PlanTaskRecord = {
      id: taskId,
      seq: tasks.length + 1,
      task: program.name,
      domain: program.domain,
      target_group: program.target_group,
      term: program.term,
      indicator: program.indicator,
      exec_status: "مكتمـل",
      doc_status: "معتمد",
      required_evidence: `تقرير تنفيذ + صور شواهد (${program.name})`,
      due_date_hijri: hijriDate,
      evidence_urls: [evidenceId],
    };

    // 2. التوليد التلقائي للشاهد وإضافته لسجل الشواهد داخل الموقع
    const autoEvidence: EvidenceRecord = {
      id: evidenceId,
      name: `شاهد تنفيذ: ${program.name}`,
      etype: "تقرير",
      linked_type: "برنامج",
      linked_ref: taskId,
      edate_hijri: hijriDate,
      doc_status: "معتمد",
      file_url: `/uploads/evidences/${taskId}.pdf`,
      description: `تم توليد هذا الشاهد تلقائياً للبرنامج الوزاري: ${program.name}`,
    };

    setTasks((prev) => [...prev, newTask]);
    setEvidences((prev) => [...prev, autoEvidence]);

    return { newTask, autoEvidence };
  };

  /**
   * تحليل واستيراد ملفات الإكسل العشوائية عبر DeepSeek API برنامجاً برنامجاً
   */
  const importFromExcelAI = async (
    file: File,
    apiKey: string,
    onProgramProcessed?: (progName: string) => void
  ) => {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);

    const prompt = `
أنت مساعد ذكي مخصص للتوجيه الطلابي. 
قم بقراءة البيانات التالية المأخوذة من ملف إكسل واستخرج قائمة البرامج الإرشادية.
قم بإرجاع الأنشطة والبرامج بصيغة JSON Array فقط، تحتوي الكائنات التالية:
{
  "name": "اسم البرنامج",
  "term": "الفصل الأول أو الثاني أو الثالث",
  "week": رقم_الأسبوع,
  "domain": "المجال",
  "target_group": "الفئة المستهدفة",
  "goal": "الهدف",
  "indicator": "المؤشر"
}

البيانات المرفوعة:
${JSON.stringify(rawRows.slice(0, 15), null, 2)}
`;

    try {
      const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            { role: "system", content: "أنت محرك معالجة البيانات الإرشادية." },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
          temperature: 0.1,
        }),
      });

      const resData = await response.json();
      const parsed = JSON.parse(resData.choices[0].message.content);
      const extractedPrograms: MinistryProgram[] = parsed.programs || parsed;

      // استيراد كل برنامج على حدة مع معالجة التواريخ والشواهد
      extractedPrograms.forEach((prog) => {
        importSingleProgram(prog);
        if (onProgramProcessed) onProgramProcessed(prog.name);
      });
    } catch (error) {
      console.error("خطأ أثناء استيراد الملف عبر الذكاء الاصطناعي:", error);
    }
  };

  return { tasks, evidences, importSingleProgram, importFromExcelAI };
}

// 5. مكون الكليشة الخاصة للطباعة والتصدير بكامل التفاصيل
export function PrintableReportTemplate({
  task,
  evidence,
}: {
  task: PlanTaskRecord;
  evidence?: EvidenceRecord;
}) {
  return (
    <div
      id="printable-kleeja-report"
      style={{
        direction: "rtl",
        fontFamily: "Tahoma, Arial, sans-serif",
        padding: "30px",
        backgroundColor: "#ffffff",
        color: "#000000",
        border: "1px solid #ccc",
      }}
    >
      {/* الكليشة الهيدر الرسمي */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "2px solid #000",
          paddingBottom: "15px",
          marginBottom: "20px",
        }}
      >
        <div style={{ textAlign: "right" }}>
          <p style={{ margin: 0, fontWeight: "bold" }}>المملكة العربية السعودية</p>
          <p style={{ margin: 0 }}>وزارة التعليم</p>
          <p style={{ margin: 0 }}>إدارة التوجيه الطلابي</p>
        </div>
        <div style={{ textAlign: "center" }}>
          <h2 style={{ margin: 0, fontSize: "18px" }}>تقرير تنفيذ برنامج إرشادي</h2>
          <p style={{ margin: "5px 0 0 0", fontSize: "14px" }}>
            تاريخ الاستحقاق الهجري: <strong>{task.due_date_hijri}</strong>
          </p>
        </div>
        <div style={{ textAlign: "left" }}>
          <p style={{ margin: 0 }}>الفصل الدراسي: {task.term}</p>
          <p style={{ margin: 0 }}>حالة التوثيق: {task.doc_status}</p>
        </div>
      </header>

      {/* تفاصيل البرنامج المستورد */}
      <section style={{ marginBottom: "20px" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            textAlign: "right",
            marginBottom: "15px",
          }}
          border={1}
        >
          <tbody>
            <tr>
              <td style={{ padding: "8px", backgroundColor: "#f2f2f2", fontWeight: "bold" }}>اسم البرنامج</td>
              <td style={{ padding: "8px" }}>{task.task}</td>
              <td style={{ padding: "8px", backgroundColor: "#f2f2f2", fontWeight: "bold" }}>المجال</td>
              <td style={{ padding: "8px" }}>{task.domain}</td>
            </tr>
            <tr>
              <td style={{ padding: "8px", backgroundColor: "#f2f2f2", fontWeight: "bold" }}>الفئة المستهدفة</td>
              <td style={{ padding: "8px" }}>{task.target_group}</td>
              <td style={{ padding: "8px", backgroundColor: "#f2f2f2", fontWeight: "bold" }}>مؤشر الأداء</td>
              <td style={{ padding: "8px" }}>{task.indicator}</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* الشواهد المرتبطة تلقائياً */}
      <section style={{ border: "1px solid #000", padding: "15px", borderRadius: "4px" }}>
        <h3 style={{ marginTop: 0, fontSize: "16px", borderBottom: "1px solid #ccc", paddingBottom: "5px" }}>
          سجل الشواهد والتوثيق المرفق
        </h3>
        {evidence ? (
          <div>
            <p><strong>اسم الشاهد:</strong> {evidence.name}</p>
            <p><strong>نوع الشاهد:</strong> {evidence.etype}</p>
            <p><strong>التاريخ الهجري:</strong> {evidence.edate_hijri}</p>
            <p><strong>الوصف:</strong> {evidence.description}</p>
            <p><strong>مسار التوثيق:</strong> {evidence.file_url}</p>
          </div>
        ) : (
          <p>لا يوجد شاهد مرتبط بهذا البرنامج حتى الآن.</p>
        )}
      </section>

      {/* توقيعات الكليشة */}
      <footer
        style={{
          marginTop: "40px",
          display: "flex",
          justifyContent: "space-between",
          textAlign: "center",
          fontWeight: "bold",
        }}
      >
        <div>
          <p>الموجه الطلابي</p>
          <p style={{ marginTop: "30px" }}>........................</p>
        </div>
        <div>
          <p>مدير المدرسة</p>
          <p style={{ marginTop: "30px" }}>........................</p>
        </div>
      </footer>
    </div>
  );
}