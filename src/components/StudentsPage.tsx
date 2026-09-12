import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileSpreadsheet, Upload } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { recordByKey } from "@/lib/records";
import { downloadNoorTemplate } from "@/lib/noor";
import { RecordPage } from "@/components/RecordPage";
import { NoorImportDialog } from "@/components/NoorImportDialog";
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
    <div>
      <Label className="mb-1.5 block text-xs">{label}</Label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 min-w-36 rounded-md border border-input bg-background px-3 text-sm"
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
  const [grade, setGrade] = useState("");
  const [classroom, setClassroom] = useState("");
  const [nationality, setNationality] = useState("");

  const { data: rows = [] } = useQuery({
    queryKey: [config.table],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as StudentRow[];
    },
  });

  const uniq = (key: string) =>
    [...new Set(rows.map((r) => String(r[key] ?? "").trim()).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, "ar"),
    );

  const grades = useMemo(() => uniq("grade"), [rows]);
  const classrooms = useMemo(() => uniq("classroom"), [rows]);
  const nationalities = useMemo(() => uniq("nationality"), [rows]);

  const extraFilter = useCallback(
    (row: Record<string, unknown>) =>
      (!grade || String(row["grade"] ?? "") === grade) &&
      (!classroom || String(row["classroom"] ?? "") === classroom) &&
      (!nationality || String(row["nationality"] ?? "") === nationality),
    [grade, classroom, nationality],
  );

  return (
    <>
      <RecordPage
        config={config}
        hideImport
        extraFilter={extraFilter}
        toolbarExtra={
          <>
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="size-4" /> استيراد من نور
            </Button>
            <Button variant="outline" onClick={downloadNoorTemplate}>
              <FileSpreadsheet className="size-4" /> تحميل نموذج استيراد نور
            </Button>
          </>
        }
        filters={
          <>
            <Filter label="الصف" value={grade} options={grades} onChange={setGrade} />
            <Filter label="الفصل" value={classroom} options={classrooms} onChange={setClassroom} />
            <Filter label="الجنسية" value={nationality} options={nationalities} onChange={setNationality} />
            {(grade || classroom || nationality) && (
              <Button
                variant="ghost"
                onClick={() => {
                  setGrade("");
                  setClassroom("");
                  setNationality("");
                }}
              >
                مسح الفلاتر
              </Button>
            )}
          </>
        }
      />
      <NoorImportDialog open={importOpen} onOpenChange={setImportOpen} />
    </>
  );
}
