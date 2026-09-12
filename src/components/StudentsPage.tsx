import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileSpreadsheet, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { recordByKey } from "@/lib/records";
import { downloadNoorTemplate } from "@/lib/noor";
import { RecordPage } from "@/components/RecordPage";
import { NoorImportDialog } from "@/components/NoorImportDialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
  const queryClient = useQueryClient();
  const [importOpen, setImportOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
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

  const deleteAll = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("students").delete().not("id", "is", null);
      if (error) throw error;
    },
    onSuccess: async () => {
      setConfirmText("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["students"] }),
        queryClient.invalidateQueries({ queryKey: ["students-options"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
      toast.success("تم حذف جميع أسماء الطلاب من السجل");
    },
    onError: (error: Error) => toast.error(`تعذّر حذف الطلاب: ${error.message}`),
  });

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
            <AlertDialog onOpenChange={(open) => !open && setConfirmText("")}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={rows.length === 0}>
                  <Trash2 className="size-4" /> حذف جميع الطلاب
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent dir="rtl">
                <AlertDialogHeader className="text-right sm:text-right">
                  <AlertDialogTitle>حذف سجل الطلاب بالكامل؟</AlertDialogTitle>
                  <AlertDialogDescription>
                    سيُحذف {rows.length} طالباً دفعة واحدة، ولا يمكن التراجع عن هذا الإجراء. اكتب «حذف الكل» للتأكيد.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <Input
                  value={confirmText}
                  onChange={(event) => setConfirmText(event.target.value)}
                  placeholder="اكتب: حذف الكل"
                  autoComplete="off"
                />
                <AlertDialogFooter className="gap-2 sm:space-x-0">
                  <AlertDialogCancel>إلغاء</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={confirmText.trim() !== "حذف الكل" || deleteAll.isPending}
                    onClick={(event) => {
                      if (confirmText.trim() !== "حذف الكل") {
                        event.preventDefault();
                        return;
                      }
                      deleteAll.mutate();
                    }}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleteAll.isPending ? "جارٍ الحذف..." : "حذف نهائي"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
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
