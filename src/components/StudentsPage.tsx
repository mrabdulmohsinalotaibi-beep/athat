import { useEffect, useState } from "react";
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
import { useStudentOptions } from "@/components/StudentCombobox";
import { normalizeSaudiGrade, normalizeSaudiStage, SAUDI_STAGE_GRADES } from "@/lib/saudi-school";


type StudentRow = Record<string, unknown>;

function Filter({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="w-full sm:w-auto">
      <Label className="mb-1.5 block text-xs">{label}</Label>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-36"
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const studentId = params.get("student");
    if (!studentId) return;

    void (async () => {
      const { data, error } = await supabase.from("students").select("*").eq("id", studentId).maybeSingle();
      if (!error && data) setProfileStudent(data as StudentRow);
    })();

    params.delete("student");
    const query = params.toString();
    window.history.replaceState(
      window.history.state,
      "",
      `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`,
    );
  }, []);

  const { data: studentOptions = [] } = useStudentOptions();

  const { data: filterOptions } = useQuery({
    queryKey: ["students-filter-options"],
    retry: 1,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_student_filter_options");
      if (error) throw error;
      return (data ?? {}) as {
        nationalities?: string[];
        statuses?: string[];
      };
    },
  });

  const stageOrder = ["ابتدائي", "متوسط", "ثانوي"];
  const stages = Array.from(
    new Set(
      studentOptions
        .map((student) => normalizeSaudiStage(student.stage) || normalizeSaudiStage(student.grade))
        .filter(Boolean),
    ),
  ).sort((a, b) => stageOrder.indexOf(a) - stageOrder.indexOf(b));

  const grades = stage
    ? SAUDI_STAGE_GRADES[stage as keyof typeof SAUDI_STAGE_GRADES] ?? []
    : [];

  const classrooms = Array.from(
    new Set(
      studentOptions
        .filter((student) => {
          const actualStage = normalizeSaudiStage(student.stage) || normalizeSaudiStage(student.grade);
          if (stage && actualStage !== stage) return false;
          if (grade && normalizeSaudiGrade(student.grade, actualStage) !== grade) return false;
          return Boolean(student.classroom?.trim());
        })
        .map((student) => student.classroom.trim()),
    ),
  ).sort((a, b) => a.localeCompare(b, "ar", { numeric: true }));

  const nationalities = filterOptions?.nationalities ?? [];
  const studentStatuses = filterOptions?.statuses ?? [];


  return (
    <>
      <RecordPage
        config={config}
        hideImport
        serverPagination
        serverFilters={{
          stage,
          grade,
          classroom,
          nationality,
          status: studentStatus,
        }}
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
            <Filter
              label="المرحلة"
              value={stage}
              options={stages}
              onChange={(value) => {
                setStage(value);
                setGrade("");
                setClassroom("");
              }}
            />
            <Filter
              label="الصف"
              value={grade}
              options={grades}
              disabled={!stage}
              onChange={(value) => {
                setGrade(value);
                setClassroom("");
              }}
            />
            <Filter
              label="الفصل"
              value={classroom}
              options={classrooms}
              disabled={!stage || !grade}
              onChange={setClassroom}
            />
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
