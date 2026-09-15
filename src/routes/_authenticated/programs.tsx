import React, { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { MINISTRY_TERMS, MINISTRY_PROGRAMS, MinistryProgramDef } from "@/lib/ministry-programs";
import { toast } from "sonner";
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Trash2, 
  Edit3, 
  FileText, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Search,
  Filter
} from "lucide-react";

export default function ProgramsPage() {
  const queryClient = useQueryClient();
  
  // States
  const [selectedTerm, setSelectedTerm] = useState<string>("الفصل الدراسي الأول");
  const [selectedMinistryProg, setSelectedMinistryProg] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filterDomain, setFilterDomain] = useState<string>("all");

  // Fetch School Info
  const { data: school } = useQuery({
    queryKey: ["current-school"],
    queryFn: async () => {
      const { data, error } = await supabase.from("schools").select("*").single();
      if (error) throw error;
      return data;
    },
  });

  // Fetch Saved Programs
  const { data: programs = [], isLoading } = useQuery({
    queryKey: ["school-programs", school?.id],
    queryFn: async () => {
      if (!school?.id) return [];
      const { data, error } = await supabase
        .from("programs")
        .select("*")
        .eq("school_id", school.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!school?.id,
  });

  // Add Program Mutation
  const addProgramMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data, error } = await supabase.from("programs").insert([payload]).select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["school-programs"] });
      toast.success("تم إضافة البرنامج الإرشادي بنجاح");
      setSelectedMinistryProg("");
      setStartDate("");
      setEndDate("");
    },
    onError: (err: any) => {
      toast.error(`خطأ أثناء الإضافة: ${err.message || "حدث خطأ غير متوقع"}`);
    },
  });

  // Delete Program Mutation
  const deleteProgramMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("programs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["school-programs"] });
      toast.success("تم حذف البرنامج بنجاح");
    },
    onError: (err: any) => {
      toast.error(`خطأ أثناء الحذف: ${err.message}`);
    },
  });

  // Handle Add Single Program Action
  const handleAddSingleProgram = useCallback(() => {
    if (!selectedMinistryProg) {
      toast.error("يرجى اختيار برنامج من القائمة الوزارية");
      return;
    }
    const found = MINISTRY_PROGRAMS.find((p) => p.name === selectedMinistryProg);
    if (!found) {
      toast.error("البرنامج المختار غير موجود في القائمة");
      return;
    }

    const payload: Record<string, unknown> = {
      name: found.name,
      program_no: `${found.term} - ${found.week}`,
      ptype: found.ptype,
      domain: found.domain,
      target_group: found.target_group,
      term: found.term,
      goal: found.goal,
      indicator: found.indicator,
      start_date: startDate || null,
      end_date: endDate || null,
      exec_status: "قيد التنفيذ",
      summary: `برنامج إرشادي وزاري (${found.name}) موجه لـ ${found.target_group} بهدف: ${found.goal}.`,
      evidence_images: [],
      evidence_videos: [],
    };

    if (school?.id) {
      payload.school_id = school.id;
    }

    addProgramMutation.mutate(payload);
  }, [school?.id, selectedMinistryProg, startDate, endDate, addProgramMutation]);

  // Filter available ministry programs based on selected term
  const filteredMinistryList = MINISTRY_PROGRAMS.filter(
    (p) => p.term === selectedTerm
  );

  // Filter saved programs for display
  const filteredPrograms = programs.filter((prog: any) => {
    const matchesSearch = prog.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          prog.target_group?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDomain = filterDomain === "all" || prog.domain === filterDomain;
    return matchesSearch && matchesDomain;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 text-right" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b pb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">إدارة البرامج والخطط الإرشادية</h1>
          <p className="text-sm text-gray-500 mt-1">تفعيل ومتابعة البرامج الوزارية المعتمدة للتوجيه الطلابي</p>
        </div>
      </div>

      {/* Add Program Section Form */}
      <div className="bg-white rounded-xl shadow-sm border p-6 space-y-6">
        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <Plus className="w-5 h-5 text-indigo-600" />
          إضافة برنامج وزاري جديد للخطة
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Term Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الفصل الدراسي</label>
            <select
              value={selectedTerm}
              onChange={(e) => {
                setSelectedTerm(e.target.value);
                setSelectedMinistryProg("");
              }}
              className="w-full rounded-lg border-gray-300 border p-2.5 text-sm focus:ring-2 focus:ring-indigo-500"
            >
              {MINISTRY_TERMS.map((term, idx) => (
                <option key={idx} value={term}>{term}</option>
              ))}
            </select>
          </div>

          {/* Program Selection */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">البرنامج الوزاري المدرج بالأسبوع</label>
            <select
              value={selectedMinistryProg}
              onChange={(e) => setSelectedMinistryProg(e.target.value)}
              className="w-full rounded-lg border-gray-300 border p-2.5 text-sm focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">-- اختر البرنامج الوزاري --</option>
              {filteredMinistryList.map((prog, idx) => (
                <option key={idx} value={prog.name}>
                  {prog.week}: {prog.name}
                </option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ البدء (اختياري)</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border-gray-300 border p-2 text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ الانتهاء (اختياري)</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg border-gray-300 border p-2 text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Submit Button */}
          <div className="flex items-end">
            <button
              onClick={handleAddSingleProgram}
              disabled={addProgramMutation.isPending}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-4 rounded-lg transition text-sm flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              {addProgramMutation.isPending ? "جاري الإضافة..." : "إضافة للخطة التنفيذية"}
            </button>
          </div>
        </div>
      </div>

      {/* Filters and Search for Existing Programs */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute right-3 top-3 w-4 h-4 text-gray-400" />
          py-2.5
          <input
            type="text"
            placeholder="بحث في البرامج المضافة..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-10 pl-4 py-2 bg-white rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-gray-500" />
          <select
            value={filterDomain}
            onChange={(e) => setFilterDomain(e.target.value)}
            className="rounded-lg border border-gray-300 py-2 px-3 text-sm bg-white focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">جميع المجالات</option>
            <option value="المهاري والتربوي">المهاري والتربوي</option>
            <option value="السلوكي والقيمي">السلوكي والقيمي</option>
            <option value="الوقائي والسلوكي">الوقائي والسلوكي</option>
            <option value="التعليمي والتحصيلي">التعليمي والتحصيلي</option>
            <option value="النفسي والاجتماعي">النفسي والاجتماعي</option>
            <option value="المهني والتقني">المهني والتقني</option>
          </select>
        </div>
      </div>

      {/* Programs List Grid/Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">البرامج الإرشادية المُفعلة للمدرسة</h3>
          <span className="text-xs bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full font-medium">
            إجمالي البرامج: {filteredPrograms.length}
          </span>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-500">جاري تحميل البيانات...</div>
        ] : filteredPrograms.length === 0 ? (
          <div className="p-12 text-center text-gray-500 flex flex-col items-center justify-center gap-2">
            <FileText className="w-10 h-10 text-gray-300" />
            <p>لا توجد برامج مضافة حتى الآن بناءً على خيارات البحث أو القائمة الحالية.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-gray-100 text-gray-700 uppercase text-xs">
                <tr>
                  <th className="py-3 px-4">اسم البرنامج</th>
                  <th className="py-3 px-4">الفترة / الأسبوع</th>
                  <th className="py-3 px-4">المجال</th>
                  <th className="py-3 px-4">الفئة المستهدفة</th>
                  <th className="py-3 px-4">الحالة</th>
                  <th className="py-3 px-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredPrograms.map((prog: any) => (
                  <tr key={prog.id} className="hover:bg-gray-50 transition">
                    <td className="py-3 px-4 font-medium text-gray-900">
                      {prog.name}
                      <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">{prog.goal}</div>
                    </td>
                    <td className="py-3 px-4 text-gray-600 whitespace-nowrap">{prog.program_no}</td>
                    <td className="py-3 px-4">
                      <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs">
                        {prog.domain || "عام"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{prog.target_group}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full text-xs font-medium">
                        <Clock className="w-3 h-3" />
                        {prog.exec_status || "قيد التنفيذ"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            if (confirm("هل أنت متأكد من حذف هذا البرنامج من الخطة؟")) {
                              deleteProgramMutation.mutate(prog.id);
                            }
                          }}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="حذف البرنامج"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}