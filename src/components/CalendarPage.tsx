import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Plus } from "lucide-react";
import { RecordPage } from "@/components/RecordPage";
import { Button } from "@/components/ui/button";
import { recordByKey } from "@/lib/records";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type CalendarEvent = {
  id: string | number;
  edate: string | null;
  etime: string | null;
  title: string | null;
  etype: string | null;
  status: string | null;
  source?: "calendar" | "interview" | "case";
  sourceId?: string;
};

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}

function addDays(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
}

function startOfWeek(date: Date) {
  return addDays(date, -date.getDay());
}

export function CalendarPage() {
  const [cursor, setCursor] = useState(() => new Date());
  const [view, setView] = useState<"week" | "month">("week");
  const [selectedDay, setSelectedDay] = useState(() => dateKey(new Date()));
  const visibleDays = useMemo(() => {
    const periodStart =
      view === "week"
        ? startOfWeek(cursor)
        : startOfWeek(new Date(cursor.getFullYear(), cursor.getMonth(), 1));
    const count = view === "week" ? 7 : 42;
    return Array.from({ length: count }, (_, index) => addDays(periodStart, index));
  }, [cursor, view]);
  const rangeStart = dateKey(visibleDays[0] ?? cursor);
  const rangeEnd = dateKey(visibleDays[visibleDays.length - 1] ?? cursor);
  const { data: events = [], isLoading, isError } = useQuery({
    queryKey: ["calendar_events", rangeStart, rangeEnd],
    queryFn: async (): Promise<CalendarEvent[]> => {
      const [calendarResult, interviewResult, caseResult] = await Promise.all([
        supabase.from("calendar_events").select("id, edate, etime, title, etype, status").gte("edate", rangeStart).lte("edate", rangeEnd),
        supabase.from("interviews").select("id, followup_at, student_name, topic").gte("followup_at", rangeStart).lte("followup_at", rangeEnd),
        supabase.from("counseling_cases").select("id, followup_at, student_name, summary, case_status").gte("followup_at", rangeStart).lte("followup_at", rangeEnd),
      ]);
      if (calendarResult.error) throw calendarResult.error;
      if (interviewResult.error) throw interviewResult.error;
      if (caseResult.error) throw caseResult.error;
      const manual = (calendarResult.data ?? []).map((item: any) => ({ ...item, source: "calendar" as const, sourceId: String(item.id) }));
      const interviews = (interviewResult.data ?? []).map((item: any) => ({
        id: `interview-${item.id}`, edate: item.followup_at, etime: null,
        title: item.student_name ? `متابعة: ${item.student_name}` : "متابعة مقابلة",
        etype: item.topic || "مقابلة", status: "متابعة", source: "interview" as const, sourceId: String(item.id),
      }));
      const cases = (caseResult.data ?? []).filter((item: any) => !["مغلقة", "مغلق"].includes(String(item.case_status ?? ""))).map((item: any) => ({
        id: `case-${item.id}`, edate: item.followup_at, etime: null,
        title: item.student_name ? `حالة: ${item.student_name}` : "متابعة حالة",
        etype: item.summary || "حالة طلابية", status: item.case_status || "متابعة", source: "case" as const, sourceId: String(item.id),
      }));
      return [...manual, ...interviews, ...cases].sort((a, b) => String(a.edate ?? "").localeCompare(String(b.edate ?? "")));
    },
  });
  const eventsByDay = useMemo(() => {
    const grouped = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      if (!event.edate) continue;
      const list = grouped.get(event.edate) ?? [];
      list.push(event);
      grouped.set(event.edate, list);
    }
    return grouped;
  }, [events]);
  const selectedEvents = eventsByDay.get(selectedDay) ?? [];
  const monthLabel = new Intl.DateTimeFormat("ar-SA-u-ca-gregory", {
    month: "long",
    year: "numeric",
  }).format(cursor);
  const selectedLabel = new Intl.DateTimeFormat("ar-SA-u-ca-gregory", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(selectedDay + "T00:00:00"));
  const weekdayFormat = new Intl.DateTimeFormat("ar-SA-u-ca-gregory", { weekday: "short" });
  const todayKey = dateKey(new Date());

  function movePeriod(direction: number) {
    const next =
      view === "month"
        ? new Date(cursor.getFullYear(), cursor.getMonth() + direction, 1)
        : addDays(cursor, direction * 7);
    setCursor(next);
    setSelectedDay(dateKey(next));
  }

  function goToToday() {
    const today = new Date();
    setCursor(today);
    setSelectedDay(dateKey(today));
  }

  return (
    <div className="space-y-5" dir="rtl">
      <section className="relative overflow-hidden rounded-3xl border border-primary/15 bg-card p-4 shadow-[var(--shadow-soft)] sm:p-5">
        <div aria-hidden="true" className="pointer-events-none absolute -left-12 -top-12 size-40 rounded-full bg-primary/8 blur-2xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CalendarDays className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[11px] font-bold text-primary">الجلسات والمتابعات</p>
              <h2 className="text-lg font-black">تقويم المواعيد</h2>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline"><a href="#calendar-records"><Plus className="size-4" /> إضافة أو تعديل</a></Button>
            <Button asChild size="sm"><Link to="/interviews">تسجيل جلسة</Link></Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button type="button" size="icon" variant="outline" aria-label="الفترة السابقة" onClick={() => movePeriod(-1)}>
              <ChevronRight className="size-4" />
            </Button>
            <strong className="min-w-36 text-center text-sm font-black">{monthLabel}</strong>
            <Button type="button" size="icon" variant="outline" aria-label="الفترة التالية" onClick={() => movePeriod(1)}>
              <ChevronLeft className="size-4" />
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={goToToday}>اليوم</Button>
          </div>
          <div className="flex rounded-xl border p-1" role="group" aria-label="طريقة عرض التقويم">
            <Button type="button" size="sm" variant={view === "week" ? "default" : "ghost"} onClick={() => setView("week")}>أسبوعي</Button>
            <Button type="button" size="sm" variant={view === "month" ? "default" : "ghost"} onClick={() => setView("month")}>شهري</Button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-1 overflow-x-auto sm:gap-2">
          {visibleDays.map((date) => {
            const key = dateKey(date);
            const dayEvents = eventsByDay.get(key) ?? [];
            const isSelected = selectedDay === key;
            const isToday = todayKey === key;
            const isOutsideMonth = view === "month" && date.getMonth() !== cursor.getMonth();
            return (
              <button
                key={key}
                type="button"
                aria-pressed={isSelected}
                onClick={() => {
                  setSelectedDay(key);
                  if (isOutsideMonth) setCursor(date);
                }}
                className={cn(
                  "min-h-24 min-w-0 rounded-xl border p-1.5 text-right transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:p-2",
                  view === "month" && "min-h-20 p-1 sm:p-1.5",
                  isSelected ? "border-primary bg-primary/5" : "border-border/70 bg-background/70 hover:border-primary/40",
                  isOutsideMonth && "text-muted-foreground/60",
                )}
              >
                <span className="flex items-center justify-between gap-1">
                  <span className="truncate text-[9px] font-semibold sm:text-[10px]">{weekdayFormat.format(date)}</span>
                  <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold", isToday && "bg-primary text-primary-foreground")}>
                    {date.getDate()}
                  </span>
                </span>
                <span className="mt-1 block space-y-1 text-right">
                  {dayEvents.slice(0, 2).map((event) => (
                    <span key={event.id} title={event.title ?? event.etype ?? "موعد"} className="block truncate rounded-md bg-primary/10 px-1 py-0.5 text-[8px] font-semibold text-primary sm:text-[9px]">
                      {event.etime ? event.etime + " " : ""}{event.title || event.etype || "موعد"}
                    </span>
                  ))}
                  {dayEvents.length > 2 && <span className="block text-[8px] font-bold text-muted-foreground">+{dayEvents.length - 2}</span>}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 rounded-2xl border bg-background/80 p-3 shadow-[var(--shadow-card)]">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-black">مواعيد {selectedLabel}</h3>
            <span className="text-[11px] text-muted-foreground">{selectedEvents.length} موعد</span>
          </div>
          {isLoading ? (
            <p className="py-3 text-xs text-muted-foreground">جارٍ تحميل الجدول...</p>
          ) : isError ? (
            <p className="py-3 text-xs text-destructive">تعذّر تحميل المواعيد. يمكنك فتح سجل المواعيد أسفل الصفحة.</p>
          ) : selectedEvents.length === 0 ? (
            <p className="py-3 text-xs text-muted-foreground">لا توجد جلسات أو مواعيد مسجلة لهذا اليوم.</p>
          ) : (
            <div className="space-y-2">
              {selectedEvents.map((event) => (
                <div key={event.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-card px-3 py-2 text-xs">
                  <div>
                    <span className="font-bold">{event.title || event.etype || "موعد إرشادي"}</span>
                    <span className="mr-2 text-[10px] text-muted-foreground">{event.etype || ""}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Clock className="size-3.5" aria-hidden="true" />
                      {event.etime || "وقت غير محدد"}
                      {event.status ? " · " + event.status : ""}
                    </span>
                    {event.source === "interview" && <Button asChild size="sm" variant="outline"><Link to="/interviews">فتح الجلسات</Link></Button>}
                    {event.source === "case" && <Button asChild size="sm" variant="outline"><Link to="/cases">فتح الحالات</Link></Button>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section id="calendar-records" className="scroll-mt-28 rounded-3xl border bg-card p-3.5 shadow-[var(--shadow-card)] sm:p-4">
        <RecordPage config={{ ...recordByKey("calendar"), title: "إدارة المواعيد" }} />
      </section>
    </div>
  );
}
