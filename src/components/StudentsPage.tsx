import { useCallback, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileSpreadsheet, FolderOpen, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { recordByKey } from "@/lib/records";
import { downloadStudentsTemplate } from "@/lib/students-import";
import { RecordPage } from "@/components/RecordPage";
import { StudentsImportDialog } from "@/components/StudentsImportDialog";
import { StudentProfileDialog } from "@/components/StudentProfileDialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";


type StudentRow = Record<string, unknown>;

function Filter({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="w-full sm:w-auto">
      <Label className="mb-1.5 block text-xs">{label}</Label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm sm:min-w-36"
      >
        <option value="">الكل</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

export function StudentsPage() {
  const config = recordByKey("students");
  const [importOpen, setImportOpen] = useState(false);
  const [profileStudent, setProfileStudent] = useState<StudentRow | null>(null);
  const [stage, setStage] = useState("");
  const [grade, setGrade] = useState("");
  const [classroom, setClassroom] = useState("");
  const [nationality, setNationality] = useState("");
  const [studentStatus, setStudentStatus] = useState("");

  const { data: rows = [] } = useQuery({
    queryKey: ["students-filter-options"],
    retry: 1,
    staleTime: 30_000,
    queryFn: async () => {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData.user) return [] as StudentRow[];

      const { data, error } = await supabase
        .from("students")
        .select("stage,grade,classroom,nationality,status")
        .eq("user_id", authData.user.id)
        .limit(1000);

      if (error) throw error;
      return (data ?? []) as StudentRow[];
    },
  });

  const uniq = (key: string) =>
    [...new Set(rows.map((r) => String(r[key] ?? "").trim()).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, "ar"),
    );

  const stages = useMemo(() => uniq("stage"), [rows]);
  const grades = useMemo(() => uniq("grade"), [rows]);
  const classrooms = useMemo(() => uniq("classroom"), [rows]);
  const nationalities = useMemo(() => uniq("nationality"), [rows]);
  const studentStatuses = useMemo(() => uniq("status"), [rows]);



  const extraFilter = useCallback(
    (row: Record<string, unknown>) =>
      (!stage || String(row["stage"] ?? "") === stage) &&
      (!grade || String(row["grade"] ?? "") === grade) &&
      (!classroom || String(row["classroom"] ?? "") === classroom) &&
      (!nationality || String(row["nationality"] ?? "") === nationality) &&
      (!studentStatus || String(row["status"] ?? "") === studentStatus),
    [stage, grade, classroom, nationality, studentStatus],
  );

  return (
    <>
      <RecordPage
        config={config}
        hideImport
        extraFilter={extraFilter}
        rowAction={{
          icon: <FolderOpen className="size-4" />,
          title: "فتح ملف الطالب",
          onClick: (row) => setProfileStudent(row as StudentRow),
        }}
        toolbarExtra={
          <>
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="size-4" /> استيراد من Excel
            </Button>
            <Button variant="outline" onClick={downloadStudentsTemplate}>
              <FileSpreadsheet className="size-4" /> تحميل نموذج Excel
            </Button>
            <Button asChild variant="outline"><Link to="/integrations">استيراد من نور أو مدرستي</Link></Button>

          </>
        }
        filters={
          <>
            <Filter label="المرحلة" value={stage} options={stages} onChange={setStage} />
            <Filter label="الصف" value={grade} options={grades} onChange={setGrade} />
            <Filter label="الفصل" value={classroom} options={classrooms} onChange={setClassroom} />
            <details className="rounded-lg border px-3 py-1.5">
              <summary className="cursor-pointer text-xs font-semibold">فلاتر إضافية</summary>
              <div className="mt-2 flex flex-wrap items-end gap-3">
                <Filter label="حالة القيد" value={studentStatus} options={studentStatuses} onChange={setStudentStatus} />
                <Filter label="الجنسية" value={nationality} options={nationalities} onChange={setNationality} />
              </div>
            </details>
            {(stage || grade || classroom || nationality || studentStatus) && (
              <Button
                variant="ghost"
                onClick={() => {
                  setStage("");
                  setGrade("");
                  setClassroom("");
                  setNationality("");
                  setStudentStatus("");
                }}
              >
                مسح الفلاتر
              </Button>
            )}
          </>
        }
      />
      <StudentsImportDialog open={importOpen} onOpenChange={setImportOpen} />
      <StudentProfileDialog
        open={profileStudent !== null}
        onOpenChange={(open) => !open && setProfileStudent(null)}
        student={profileStudent as (Record<string, unknown> & { id: string }) | null}
      />
    </>
  );
}
