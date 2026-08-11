import { daysBetweenDateStrings } from "@/lib/date";
import { getTaskDisplayStatus } from "@/lib/taskStatus";
import type { WorkOrderTask } from "@/lib/types";

const DAY_WIDTH = 28;
const LABEL_WIDTH = 160;

function addDays(dateStr: string, days: number) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

export default function ScheduleGantt({
  tasks,
  todayDateString,
}: {
  tasks: WorkOrderTask[];
  todayDateString: string;
}) {
  const dated = tasks
    .filter((t) => t.start_date || t.end_date)
    .map((t) => ({
      ...t,
      effectiveStart: t.start_date ?? t.end_date!,
      effectiveEnd: t.end_date ?? t.start_date!,
    }));

  if (dated.length === 0) return null;

  const minDate = addDays(dated.reduce((min, t) => (t.effectiveStart < min ? t.effectiveStart : min), dated[0].effectiveStart), -1);
  const maxDate = addDays(dated.reduce((max, t) => (t.effectiveEnd > max ? t.effectiveEnd : max), dated[0].effectiveEnd), 1);
  const totalDays = daysBetweenDateStrings(minDate, maxDate) + 1;

  const days = Array.from({ length: totalDays }, (_, i) => {
    const dateString = addDays(minDate, i);
    const date = new Date(`${dateString}T00:00:00Z`);
    const weekday = date.getUTCDay();
    return {
      dateString,
      dayOfMonth: date.getUTCDate(),
      month: date.getUTCMonth() + 1,
      isWeekend: weekday === 0 || weekday === 6,
      isToday: dateString === todayDateString,
      isMonthStart: date.getUTCDate() === 1,
    };
  });

  const gridWidth = totalDays * DAY_WIDTH;

  return (
    <div className="mb-5">
      <div className="overflow-x-auto rounded-sm border border-nude/60">
        <div style={{ width: LABEL_WIDTH + gridWidth }}>
          <div className="flex border-b border-nude/60">
            <div
              style={{ width: LABEL_WIDTH }}
              className="sticky left-0 z-10 shrink-0 border-r border-nude/60 bg-stone-50 px-2 py-1 text-[10px] text-charcoal/50"
            >
              공정
            </div>
            <div className="flex">
              {days.map((d) => (
                <div
                  key={d.dateString}
                  style={{ width: DAY_WIDTH }}
                  className={`shrink-0 border-r border-stone-100 py-1 text-center text-[10px] ${
                    d.isToday
                      ? "bg-orange-100 font-semibold text-orange-700"
                      : d.isWeekend
                        ? "bg-stone-50 text-charcoal/40"
                        : "text-charcoal/50"
                  }`}
                >
                  {d.isMonthStart && <div className="text-[9px] text-taupe">{d.month}월</div>}
                  <div>{d.dayOfMonth}</div>
                </div>
              ))}
            </div>
          </div>

          {dated.map((t) => {
            const status = getTaskDisplayStatus(t, todayDateString);
            const offset = daysBetweenDateStrings(minDate, t.effectiveStart);
            const duration = daysBetweenDateStrings(t.effectiveStart, t.effectiveEnd) + 1;
            const barStyle =
              status === "in_progress"
                ? "bg-orange-400 text-white"
                : status === "completed"
                  ? "bg-stone-300 text-charcoal/70"
                  : "border-2 border-dashed border-stone-300 bg-white text-charcoal/50";

            return (
              <div key={t.id} className="flex border-b border-nude/20 last:border-0">
                <div
                  style={{ width: LABEL_WIDTH }}
                  className="sticky left-0 z-10 shrink-0 truncate border-r border-nude/60 bg-white px-2 py-1.5 text-xs text-charcoal"
                >
                  {t.title}
                </div>
                <div className="relative" style={{ width: gridWidth, height: 32 }}>
                  <div className="absolute inset-0 flex">
                    {days.map((d) => (
                      <div
                        key={d.dateString}
                        style={{ width: DAY_WIDTH }}
                        className={`h-full shrink-0 border-r border-stone-50 ${
                          d.isToday ? "bg-orange-50/60" : d.isWeekend ? "bg-stone-50/60" : ""
                        }`}
                      />
                    ))}
                  </div>
                  <div
                    title={`${t.title} (${t.start_date ?? "-"} ~ ${t.end_date ?? "-"})`}
                    className={`absolute top-1 bottom-1 flex items-center truncate rounded-md px-2 text-[11px] ${barStyle}`}
                    style={{ left: offset * DAY_WIDTH, width: duration * DAY_WIDTH - 4 }}
                  >
                    {status === "completed" && "✓ "}
                    {t.title}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-2 flex items-center gap-4 text-[11px] text-charcoal/50">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-orange-400" /> 진행중
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-stone-300" /> 완료
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm border-2 border-dashed border-stone-300 bg-white" /> 예정
        </span>
      </div>
    </div>
  );
}
