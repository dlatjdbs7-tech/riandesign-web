import { getTaskDisplayStatus } from "@/lib/taskStatus";
import type { WorkOrderTask } from "@/lib/types";

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

function addDays(dateStr: string, days: number) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function weekdayOf(dateStr: string) {
  return new Date(`${dateStr}T00:00:00Z`).getUTCDay();
}

export default function ScheduleCalendarGrid({
  tasks,
  todayDateString,
  title,
}: {
  tasks: WorkOrderTask[];
  todayDateString: string;
  title?: string;
}) {
  const dated = tasks
    .filter((t) => t.start_date || t.end_date)
    .map((t) => ({
      ...t,
      effectiveStart: t.start_date ?? t.end_date!,
      effectiveEnd: t.end_date ?? t.start_date!,
    }));

  if (dated.length === 0) return null;

  const minDate = dated.reduce((min, t) => (t.effectiveStart < min ? t.effectiveStart : min), dated[0].effectiveStart);
  const maxDate = dated.reduce((max, t) => (t.effectiveEnd > max ? t.effectiveEnd : max), dated[0].effectiveEnd);

  const gridStart = addDays(minDate, -weekdayOf(minDate));
  const gridEnd = addDays(maxDate, 6 - weekdayOf(maxDate));

  const weeks: string[][] = [];
  let cursor = gridStart;
  while (cursor <= gridEnd) {
    const week = Array.from({ length: 7 }, (_, i) => addDays(cursor, i));
    weeks.push(week);
    cursor = addDays(cursor, 7);
  }

  const tasksByDate = new Map<string, typeof dated>();
  for (const t of dated) {
    let d = t.effectiveStart;
    while (d <= t.effectiveEnd) {
      const list = tasksByDate.get(d) ?? [];
      list.push(t);
      tasksByDate.set(d, list);
      d = addDays(d, 1);
    }
  }

  return (
    <div className="overflow-hidden rounded-sm border-2 border-nude/70">
      {title && (
        <div className="border-b-2 border-nude/70 bg-cream px-4 py-3 text-center font-serif text-base font-semibold text-charcoal">
          {title}
        </div>
      )}

      <div className="grid grid-cols-7 border-b-2 border-double border-nude/70">
        {WEEKDAY_LABELS.map((label, i) => (
          <div
            key={label}
            className={`border-l border-nude/40 py-1.5 text-center text-sm font-semibold first:border-l-0 ${
              i === 0 ? "text-red-500" : i === 6 ? "text-sky-600" : "text-charcoal"
            }`}
          >
            {label}
          </div>
        ))}
      </div>

      {weeks.map((week, weekIndex) => (
        <div key={weekIndex} className="grid grid-cols-7 border-b border-nude/30 last:border-b-0">
          {week.map((dateStr, i) => {
            const dayOfMonth = Number(dateStr.slice(8, 10));
            const isToday = dateStr === todayDateString;
            const dayTasks = tasksByDate.get(dateStr) ?? [];

            return (
              <div
                key={dateStr}
                className={`min-h-[6rem] border-l border-nude/30 first:border-l-0 ${
                  i === 0 ? "bg-red-50/30" : i === 6 ? "bg-sky-50/30" : ""
                }`}
              >
                <div
                  className={`flex items-center justify-center border-b border-nude/30 bg-nude/35 py-1 text-sm font-medium ${
                    i === 0 ? "text-red-500" : i === 6 ? "text-sky-600" : "text-charcoal/70"
                  } ${isToday ? "relative" : ""}`}
                >
                  {isToday ? (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gold text-white">
                      {dayOfMonth}
                    </span>
                  ) : (
                    dayOfMonth
                  )}
                </div>
                <div className="flex flex-col gap-1 p-1">
                  {dayTasks.map((t) => {
                    const status = getTaskDisplayStatus(t, todayDateString);
                    const chipStyle =
                      status === "in_progress"
                        ? "bg-orange-100 text-orange-700 border border-orange-300 font-medium"
                        : status === "completed"
                          ? "bg-stone-100 text-charcoal/40 border border-stone-200 line-through"
                          : "bg-white text-charcoal/70 border border-nude/40";
                    return (
                      <div
                        key={`${t.id}-${dateStr}`}
                        title={t.title}
                        className={`truncate rounded-sm px-1.5 py-0.5 text-[11px] ${chipStyle}`}
                      >
                        {t.title}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
