import React, { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase"; // تأكد من مسار ملف السوبابيس لديك
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// ==========================================
// 1. ملف الثوابت المدمج (Ministry Programs)
// ==========================================
export const MINISTRY_TERMS = [
  "الفصل الدراسي الأول",
  "الفصل الدراسي الثاني",
  "الفصل الدراسي الثالث",
];

export type MinistryProgramDef = {
  term: string;
  week: string;
  name: string;
  ptype: string;
  domain: string;
  target_group: string;
  goal: string;
  indicator: string;
};

export const MINISTRY_PROGRAMS: MinistryProgramDef[] = [
  {
    term: "الفصل الدراسي الأول",
    week: "الأسبوع الأول",
    name: "برنامج التهيئة الإرشادية والأسبوع التمهيدي",
    ptype: "برنامج وزاري نمائي ووقائي",
    domain: "المهاري والتربوي",
    target_group: "طلبة المستجدين والمرحلة الدراسية",
    goal: "التهيئة النفسية والتربوية والاجتماعية لتحقيق تكيف الطلبة في البيئة المدرسية وتعريفهم بلوائح وأنظمة المدرسة.",
    indicator: "حصر الحالات الصحية والاجتماعية وتفعيل إطار توثيق العلاقة مع الأسرة.",
  },
  {
    term: "الفصل الدراسي الأول",
    week: "الأسبوع الثاني",
    name: "تعزيز السلوك الإيجابي",
    ptype: "برنامج وزاري تعزيرى",
    domain: "السلوكي والقيمي",
    target_group: "طلبة التعليم العام",
    goal: "تفعيل الأنشطة والإجراءات المحفزة للسلوك الإيجابي وتفعيل جائزة المدرسة للتميز السلوكي.",
    indicator: "تفعيل استمارات التكريم على مستوى الفصل والمدرسة ورصد المشكلات السلوكية.",
  },
  {
    term: "الفصل الدراسي الأول",
    week: "الأسبوع الثالث",
    name: "الاستمرار بتعزيز السلوك الإيجابي ورعاية الحالات الخاصة",
    ptype: "برنامج وزاري وعلاجي",
    domain: "الرعاية والاجتماعي",
    target_group: "الفئات الخاصة (الأيتام، ذوي الحاجة المادية، أبناء السجناء والموهوبين)",
    goal: "تقديم الخدمات التربوية والنفسية للفئات الخاصة ورفع مستوى التحصيل الدراسي ورعاية متكرري الغياب.",
    indicator: "اكتمال استمارات تحديث البيانات ومتابعة الخطط العلاجية.",
  },
  {
    term: "الفصل الدراسي الأول",
    week: "الأسبوع الرابع",
    name: "برنامج خفض العنف (رفق) واليوم الوطني",
    ptype: "برنامج وزاري وقائي وعلاجي",
    domain: "الوقائي والسلوكي",
    target_group: "طلبة التعليم العام - موجهي الطلبة - أولياء الأمور",
    goal: "الحد من العنف بين الطلبة في المدارس من خلال أساليب الوقاية والعلاج وإكساب المهارات الشخصية والاجتماعية.",
    indicator: "إعداد الخطة التنفيذية لبرنامج رفق وتفعيل خط مساندة الطفل وتوثيق الفعاليات.",
  },
  {
    term: "الفصل الدراسي الأول",
    week: "الأسبوع الخامس",
    name: "تنمية الدافعية لرفع مستوى التحصيل الدراسي",
    ptype: "برنامج وزاري أكاديمي",
    domain: "التعليمي والتحصيلي",
    target_group: "طلاب وطالبات التعليم العام وأولياء الأمور",
    goal: "تنمية دافعية الطلبة للتعلم ورفع مستواهم التحصيلي والتهيئة لاختبارات أعمال السنة الفصلية.",
    indicator: "تنفيذ خطة المدرسة في دليل دور الأسرة في تنمية الدافعية وتحقيق التكامل بين الموجه والمعلم.",
  },
  {
    term: "الفصل الدراسي الأول",
    week: "الأسبوع السادس",
    name: "تعزيز المهارات النفسية والاجتماعية (برنامجي نبيه ودرع)",
    ptype: "برنامج وزاري نمائي ووقائي",
    domain: "النفسي والاجتماعي",
    target_group: "طلبة التعليم العام",
    goal: "تنمية مهارات الطلبة الانفعالية والاجتماعية في مدارس التعليم العام وحماية الطلاب.",
    indicator: "تفعيل برامج نبيه ودرع والمجلس الطلابي وتوثيق الشواهد.",
  },
  {
    term: "الفصل الدراسي الأول",
    week: "الأسبوع السابع",
    name: "التوجيه المهني",
    ptype: "برنامج وزاري مهني",
    domain: "المهني والتقني",
    target_group: "طلبة مراحل التعليم العام",
    goal: "مساعدة الطلبة في اكتشاف ميولهم واستعداداتهم وقدراتهم وتنميتها وتوجيههم للمسارات التعليمية المناسبة.",
    indicator: "تنظيم زيارات ميدانية وتفعيل دليل التوجيه المهني ونظام المسارات للمرحلة الثانوية.",
  },
  {
    term: "الفصل الدراسي الأول",
    week: "الأسبوع الثامن",
    name: "استمرار تعزيز المهارات النفسية للطلبة",
    ptype: "برنامج وزاري وقائي",
    domain: "النفسي",
    target_group: "طلبة التعليم العام",
    goal: "الوقاية النفسية الأولية وتنمية المهارات الانفعالية والاجتماعية المستهدفة.",
    indicator: "تنفيذ الجلسات الإرشادية واستثمار المجالس الطلابية وأنشطة رعاية النمو السليم.",
  },
  {
    term: "الفصل الدراسي الأول",
    week: "الأسبوع التاسع",
    name: "رعاية ودعم الحالات الخاصة ومتكرري الغياب",
    ptype: "برنامج وزاري علاجي",
    domain: "الرعاية والتوجه الفردي",
    target_group: "طلبة الظروف الخاصة ومتكرري الغياب والتأخر",
    goal: "تحقيق التوافق النفسي والاجتماعي والتربوي والمهني للطلبة والحد من الغياب المتكرر.",
    indicator: "تنفيذ جلسات الإرشاد الفردي ودراسة الحالة واستمارة تحديث البيانات.",
  },
  {
    term: "الفصل الدراسي الأول",
    week: "الأسبوع العاشر",
    name: "متابعة تنمية الدافعية لرفع مستوى التحصيل الدراسي",
    ptype: "برنامج وزاري أكاديمي",
    domain: "التحصيلي",
    target_group: "طلبة التعليم العام وأولياء الأمور",
    goal: "تقديم التدخلات التربوية والخطط المناسبة للرفع من الدافعية وتفعيل مجالس أولياء الأمور.",
    indicator: "رصد نتائج التحصيل الدراسي وتقديم الدعم الإضافي وتوثيق الشراكة المجتمعية.",
  },
  {
    term: "الفصل الدراسي الأول",
    week: "الأسبوع الحادي عشر",
    name: "استمرار الرعاية والدعم للحالات الخاصة وتفعيل جائزة التميز السلوكي",
    ptype: "برنامج وزاري متكامل",
    domain: "القيمي والرعائي",
    target_group: "العاملين في المدارس - طلبة التعليم العام - أولياء الأمور",
    goal: "تعزيز القيم والمهارات الأساسية وتطبيق قائمة المشكلات السلوكية ومعالجتها.",
    indicator: "تطبيق استمارات التكريم للتميز السلوكي (نموذج 1 و 2) وإعداد التقارير.",
  },
  {
    term: "الفصل الدراسي الأول",
    week: "الأسبوع الثاني عشر",
    name: "الانضباط المدرسي والحد من الغياب",
    ptype: "برنامج وزاري تنظيمي",
    domain: "الانضباط والسلوك",
    target_group: "منسوبي المدرسة - طلبة التعليم العام - أولياء الأمور",
    goal: "تنمية دافعية الطلبة للتعلم وتوعيتهم بما يترتب على الغياب من إجراءات في قواعد السلوك والمواظبة.",
    indicator: "الرفع بتقرير مفصل لقسم التوجيه الطلابي عن تشخيص واقع غياب الطلبة وطرق الحد منها.",
  },
  {
    term: "الفصل الدراسي الأول",
    week: "الأسبوع الثالث عشر",
    name: "تنمية الدافعية لرفع مستوى التحصيل الدراسي (متابعة وتحليل)",
    ptype: "برنامج وزاري تحصيلي",
    domain: "التعليمي",
    target_group: "طلاب وطالبات التعليم العام",
    goal: "متابعة تحليل نتائج الطلبة وتقديم التدخلات التربوية والخطط بناءً على مقياس الدافعية.",
    indicator: "إعادة تدريب مجموعة من الطلبة على حقيبة تنمية الدافعية وتنفيذ خطة المدرسة.",
  },
  {
    term: "الفصل الدراسي الأول",
    week: "الأسبوع الرابع عشر",
    name: "الاستخدام الآمن للإنترنت والألعاب الإلكترونية",
    ptype: "برنامج وزاري توعوي وقائي",
    domain: "التقني والوقائي",
    target_group: "الطلبة وأولياء الأمور",
    goal: "توعية الطلبة وأولياء الأمور بالاستخدام الآمن للإنترنت والألعاب الإلكترونية والاستفادة من جوانبها الإيجابية والوقاية من المخاطر.",
    indicator: "تنفيذ برامج توعوية للتحذير من المواقع المشبوهة ومخاطر استغلال الإنترنت.",
  },
  {
    term: "الفصل الدراسي الأول",
    week: "الأسبوع الخامس عشر",
    name: "الاستمرار في التوجيه المهني والختامي",
    ptype: "برنامج وزاري مهني",
    domain: "المهني",
    target_group: "طلبة التعليم العام وموجهي الطلبة",
    goal: "استكمال الخطة التنفيذية للتوجيه المهني وتعريف الطلبة بالمسارات والتخصصات والقدرات والتحصيلي.",
    indicator: "استكمال متطلبات الخطة الختامية وإعداد تقارير الأداء النهائية.",
  },
];

// ==========================================
// 2. المكون الرئيسي (ProgramsPage)
// ==========================================
export default function ProgramsPage({ school }: { school?: { id: string } }) {
  const [selectedMinistryProg, setSelectedMinistryProg] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const queryClient = useQueryClient();

  // جلب البرامج من قاعدة البيانات
  const { data: programs = [], refetch } = useQuery({
    queryKey: ["programs", school?.id],
    queryFn: async () => {
      let query = supabase.from("programs").select("*");
      if (school?.id) {
        query = query.eq("school_id", school.id);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // دالة الإضافة عبر الـ Mutation مع ضبط الحقول بشكل سليم ومطابق
  const addProgramMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data, error } = await supabase.from("programs").insert([payload]);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("تم إضافة البرنامج بنجاح");
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      setSelectedMinistryProg("");
      setStartDate("");
      setEndDate("");
      refetch();
    },
    onError: (err: Error) => {
      toast.error(`حدث خطأ أثناء الإضافة: ${err.message}`);
    },
  });

  const handleAddSingleProgram = useCallback(() => {
    if (!selectedMinistryProg) {
      toast.error("يرجى اختيار برنامج من القائمة الوزارية");
      return;
    }
    const found = MINISTRY_PROGRAMS.find(
      (p) => p.name === selectedMinistryProg
    );
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

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle>إدارة البرامج الإرشادية الوزارية</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">اختر البرنامج الوزاري</label>
              <select
                className="w-full border rounded-md p-2 bg-background"
                value={selectedMinistryProg}
                onChange={(e) => setSelectedMinistryProg(e.target.value)}
              >
                <option value="">-- اختر البرنامج --</option>
                {MINISTRY_PROGRAMS.map((prog, idx) => (
                  <option key={idx} value={prog.name}>
                    {prog.week}: {prog.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium mb-1">تاريخ البداية</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">تاريخ النهاية</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          <Button
            onClick={handleAddSingleProgram}
            disabled={addProgramMutation.isPending}
            className="w-full"
          >
            {addProgramMutation.isPending ? "جاري الحفظ..." : "إضافة البرنامج للخطة"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>البرامج المضافة مسبقاً ({programs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {programs.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">لا توجد برامج مضافة حتى الآن.</p>
            ) : (
              programs.map((prog: any) => (
                <div key={prog.id} className="border p-3 rounded-lg flex justify-between items-center">
                  <div>
                    <h4 className="font-bold">{prog.name}</h4>
                    <p className="text-xs text-muted-foreground">{prog.program_no} | {prog.target_group}</p>
                  </div>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                    {prog.exec_status}
                  </span>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}