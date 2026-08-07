import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import type { AsRequest, Todo, WorkOrder } from "@/lib/types";
import { getKSTCurrentYearMonth, getKSTDateBounds, getMonthGridWeeks } from "@/lib/date";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

type CalendarEvent = {
  id: string;
  title: string;
  type: "work_order" | "as_request" | "todo";
  href: string;
};

const TYPE_STYLE: Record<CalendarEvent["type"], string> = {
  work_order: "bg-charcoal text-cream",
  as_request: "bg-red-100 text-red-700",
  todo: "bg-gold/30 text-charcoal",
};

const TYPE_LEGEND: { type: CalendarEvent["type"]; label: string }[] = [
  { type: "work_order", label: "작업지시서" },
  { type: "as_request", label: "AS" },
  { type: "todo", label: "할일" },
];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function lastDayOfMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string; date?: string }>;
}) {
  const params = await searchParams;
  const current = getKSTCurrentYearMonth();
  const { todayDateString } = getKSTDateBounds();

  const year = Number(params.year) || current.year;
  const month = Number(params.month) || current.month;
  const selectedDate = params.date ?? null;

  const monthStart = `${year}-${pad(month)}-01`;
  const monthEnd = `${year}-${pad(month)}-${pad(lastDayOfMonth(year, month))}`;

  let prevYear = year;
  let prevMonth = month - 1;
  if (prevMonth === 0) {
    prevMonth = 12;
    prevYear -= 1;
  }
  let nextYear = year;
  let nextMonth = month + 1;
  if (nextMonth === 13) {
    nextMonth = 1;
    nextYear += 1;
  }

  const supabase = await createClient();
  const [{ data: workOrders }, { data: asRequests }, { data: todos }] = await Promise.all([
    supabase
      .from("work_orders")
      .select("id, title, work_date, status")
      .gte("work_date", monthStart)
      .lte("work_date", monthEnd)
      .returns<Pick<WorkOrder, "id" | "title" | "work_date" | "status">[]>(),
    supabase
      .from("as_requests")
      .select("id, title, request_date, status")
      .gte("request_date", monthStart)
      .lte("request_date", monthEnd)
      .returns<Pick<AsRequest, "id" | "title" | "request_date" | "status">[]>(),
    supabase
      .from("todos")
      .select("id, title, due_date, status")
      .gte("due_date", monthStart)
      .lte("due_date", monthEnd)
      .returns<Pick<Todo, "id" | "title" | "due_date" | "status">[]>(),
  ]);

  const eventsByDate = new Map<string, CalendarEvent[]>();
  const addEvent = (date: string | null, event: CalendarEvent) => {
    if (!date) return;
    const list = eventsByDate.get(date) ?? [];
    list.push(event);
    eventsByDate.set(date, list);
  };

  workOrders?.forEach((o) =>
    addEvent(o.work_date, {
      id: o.id,
      title: o.title,
      type: "work_order",
      href: `/admin/work-orders/${o.id}`,
    })
  );
  asRequests?.forEach((a) =>
    addEvent(a.request_date, { id: a.id, title: a.title, type: "as_request", href: "/admin/as-requests" })
  );
  todos?.forEach((t) =>
    addEvent(t.due_date, { id: t.id, title: t.title, type: "todo", href: "/admin/todos" })
  );

  const weeks = getMonthGridWeeks(year, month);
  const selectedEvents = selectedDate ? (eventsByDate.get(selectedDate) ?? []) : [];

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-semibold text-charcoal">캘린더</h1>
        <div className="flex items-center gap-4">
          {TYPE_LEGEND.map((legend) => (
            <span key={legend.type} className="flex items-center gap-1.5 text-xs text-charcoal/60">
              <span className={`h-2.5 w-2.5 rounded-full ${TYPE_STYLE[legend.type].split(" ")[0]}`} />
              {legend.label}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <Link
          href={`/admin/calendar?year=${prevYear}&month=${prevMonth}`}
          className="rounded-full border border-nude px-4 py-1.5 text-sm text-charcoal hover:border-charcoal"
        >
          ← 이전
        </Link>
        <div className="flex items-center gap-3">
          <h2 className="font-serif text-xl text-charcoal">
            {year}년 {month}월
          </h2>
          <Link href="/admin/calendar" className="text-xs text-taupe hover:text-gold">
            오늘
          </Link>
        </div>
        <Link
          href={`/admin/calendar?year=${nextYear}&month=${nextMonth}`}
          className="rounded-full border border-nude px-4 py-1.5 text-sm text-charcoal hover:border-charcoal"
        >
          다음 →
        </Link>
      </div>

      <div className="mt-6 overflow-hidden rounded-sm border border-nude/60 bg-white">
        <div className="grid grid-cols-7 border-b border-nude/60 bg-beige/40 text-center text-xs tracking-wide text-charcoal/60">
          {WEEKDAYS.map((day, i) => (
            <div
              key={day}
              className={`py-2 ${i === 0 ? "text-red-600" : i === 6 ? "text-blue-600" : ""}`}
            >
              {day}
            </div>
          ))}
        </div>

        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 border-b border-nude/30 last:border-0">
            {week.map((cell, dayIndex) => {
              const events = eventsByDate.get(cell.dateString) ?? [];
              const isToday = cell.dateString === todayDateString;
              const isSelected = cell.dateString === selectedDate;
              const visibleEvents = events.slice(0, 3);
              const extraCount = events.length - visibleEvents.length;

              return (
                <Link
                  key={cell.dateString}
                  href={`/admin/calendar?year=${year}&month=${month}&date=${cell.dateString}`}
                  className={`flex min-h-[92px] flex-col gap-1 border-r border-nude/20 p-1.5 text-left last:border-r-0 hover:bg-beige/30 ${
                    !cell.isCurrentMonth ? "bg-cream/40" : ""
                  } ${isSelected ? "ring-2 ring-inset ring-gold" : ""}`}
                >
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                      isToday
                        ? "bg-charcoal text-cream"
                        : !cell.isCurrentMonth
                          ? "text-charcoal/30"
                          : dayIndex === 0
                            ? "text-red-600"
                            : dayIndex === 6
                              ? "text-blue-600"
                              : "text-charcoal"
                    }`}
                  >
                    {cell.day}
                  </span>
                  <div className="flex flex-col gap-0.5">
                    {visibleEvents.map((event) => (
                      <span
                        key={`${event.type}-${event.id}`}
                        className={`truncate rounded-sm px-1.5 py-0.5 text-[10px] leading-tight ${TYPE_STYLE[event.type]}`}
                      >
                        {event.title}
                      </span>
                    ))}
                    {extraCount > 0 && (
                      <span className="px-1.5 text-[10px] text-charcoal/50">+{extraCount}건 더</span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {selectedDate && (
        <div className="mt-6 rounded-sm border border-nude/60 bg-white p-5">
          <h2 className="font-serif text-lg font-semibold text-charcoal">{selectedDate} 일정</h2>
          <div className="mt-3 flex flex-col gap-2">
            {selectedEvents.map((event) => (
              <Link
                key={`${event.type}-${event.id}`}
                href={event.href}
                className="flex items-center justify-between rounded-sm border border-nude/40 p-3 text-sm hover:border-gold"
              >
                <span>{event.title}</span>
                <span className={`rounded-sm px-2 py-0.5 text-[10px] ${TYPE_STYLE[event.type]}`}>
                  {TYPE_LEGEND.find((l) => l.type === event.type)?.label}
                </span>
              </Link>
            ))}
            {selectedEvents.length === 0 && (
              <p className="text-sm text-charcoal/50">이 날짜에 등록된 일정이 없습니다.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
