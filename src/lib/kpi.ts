import React from "react";
import { computeKpis, KpiInput, isPercentKpi } from "./kpiUtils"; // استدعاء دالة الحسابات

interface KpiDashboardProps {
  data: KpiInput;
}

export const CompactKpiDashboard: React.FC<KpiDashboardProps> = ({ data }) => {
  const kpis = computeKpis(data);

  // ألوان شارات الحالة لحجم أصغر
  const statusStyles = {
    success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    warning: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    info: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
  };

  return (
    <div className="w-full bg-slate-50 dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800 dir-rtl">
      {/* شبكة مدمجة: 5 أعمدة للشاشات الكبيرة، وتلتف تلقائياً للشاشات الصغيرة */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
        {kpis.map((kpi) => {
          const isPct = isPercentKpi(kpi.key);
          const statusClass = statusStyles[kpi.status || "info"];

          return (
            <div
              key={kpi.key}
              className={`p-2.5 rounded-lg border transition-all duration-150 flex flex-col justify-between ${statusClass}`}
            >
              {/* العنوان والرمز */}
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-xs font-semibold truncate leading-tight opacity-90">
                  {kpi.label}
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full border bg-white/50 dark:bg-black/20 font-medium">
                  {kpi.key}
                </span>
              </div>

              {/* القيمة والشريط المدمج */}
              <div className="my-1">
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold tracking-tight">
                    {kpi.value}
                  </span>
                  {isPct && <span className="text-xs font-semibold">%</span>}
                </div>

                {/* شريط تقدم مصغر للمؤشرات المئوية */}
                {isPct && (
                  <div className="w-full bg-black/10 dark:bg-white/10 h-1 rounded-full mt-1 overflow-hidden">
                    <div
                      className="h-full bg-current rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, kpi.value)}%` }}
                    />
                  </div>
                )}
              </div>

              {/* التلميح الفرعي بحجم مصغر جداً */}
              <p className="text-[10px] opacity-75 truncate mt-0.5">
                {kpi.hint}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
