import { useMemo } from "react";
import { CalendarDays } from "lucide-react";
import { HIJRI_MONTHS, hijriToIso, isoToHijriParts } from "@/lib/date";
import { cn } from "@/lib/utils";

export function HijriDatePicker({ value, onChange, className, id, required, disabled }: {
  value?: string | null; onChange:(iso:string)=>void; className?:string; id?:string; required?:boolean; disabled?:boolean;
}) {
  const current = useMemo(() => isoToHijriParts(value), [value]);
  const hasValue = Boolean(value);
  const years = useMemo(() => Array.from({length:11},(_,i)=>current.year-5+i),[current.year]);
  const set = (part:"year"|"month"|"day", n:number) => {
    const next={...current,[part]:n};
    // Umm al-Qura conversion validates actual month length.
    let iso=hijriToIso(next.year,next.month,next.day);
    if(!iso && part!=="day") iso=hijriToIso(next.year,next.month,Math.min(next.day,29));
    if(iso) onChange(iso);
  };
  return <div id={id} className={cn("hijri-picker grid grid-cols-[1fr_1.65fr_1.1fr] gap-2",className)} dir="rtl">
    <label className="sr-only">اليوم</label>
    <select disabled={disabled} required={required} value={hasValue ? current.day : ""} onChange={e=>e.target.value && set("day",Number(e.target.value))} className="h-11 rounded-xl border border-input bg-card px-2 text-center text-sm font-bold text-foreground">
      {!hasValue && <option value="">اليوم</option>}
      {Array.from({length:30},(_,i)=>i+1).map(d=><option key={d} value={d}>{d}</option>)}
    </select>
    <label className="sr-only">الشهر الهجري</label>
    <select disabled={disabled} value={hasValue ? current.month : ""} onChange={e=>e.target.value && set("month",Number(e.target.value))} className="h-11 min-w-0 rounded-xl border border-input bg-card px-2 text-sm font-bold text-foreground">
      {!hasValue && <option value="">الشهر</option>}
      {HIJRI_MONTHS.map((m,i)=><option key={m} value={i+1}>{m}</option>)}
    </select>
    <label className="sr-only">السنة الهجرية</label>
    <select disabled={disabled} value={hasValue ? current.year : ""} onChange={e=>e.target.value && set("year",Number(e.target.value))} className="h-11 rounded-xl border border-input bg-card px-2 text-center text-sm font-bold text-foreground">
      {!hasValue && <option value="">السنة</option>}
      {years.map(y=><option key={y} value={y}>{y} هـ</option>)}
    </select>
  </div>;
}

export function HijriDateField({ label, ...props }: React.ComponentProps<typeof HijriDatePicker> & {label?:string}) {
 return <div>{label && <div className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-foreground"><CalendarDays className="size-4 text-primary"/>{label}</div>}<HijriDatePicker {...props}/></div>;
}
