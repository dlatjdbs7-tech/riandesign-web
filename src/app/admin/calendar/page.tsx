import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import type { AsRequest, Profile, ScheduleEvent, Todo, WorkOrder, WorkOrderTask } from "@/lib/types";
import { getKSTCurrentYearMonth, getKSTDateBounds, getMonthGridWeeks } from "@/lib/date";
import { deleteScheduleEvent } from "./actions";
import { createQuickTodo } from "../todos/actions";
import AddEventModal from "@/components/admin/AddEventModal";
import ClaimTodoCheckbox from "@/components/admin/ClaimTodoCheckbox";
import CompleteTodoCheckbox from "@/components/admin/CompleteTodoCheckbox";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

type CalendarEvent = {
  id: string;
  title: string;
  type: "work_order" | "as_request" | "todo" | "미팅" | "수금" | "행사" | "촬영" | "site_task";
  href: string | null;
  createdBy?: string | null;
  time?: string | null;
  siteName?: string | null;
  team?: string | null;
  meetingType?: string | null;
  colorClass?: string;
};

const CALENDAR_EVENT_TYPES = ["미팅", "수금", "행사", "촬영"] as const;

const TYPE_STYLE: Record<CalendarEvent["type"], string> = {
  work_order: "bg-charcoal text-cream",
  as_request: "bg-red-100 text-red-700",
  todo: "bg-orange-100 text-orange-800",
  "미팅": "bg-rose-100 text-rose-700",
  "수금": "bg-amber-100 text-amber-700",
  "행사": "bg-sky-100 text-sky-700",
  "촬영": "bg-violet-100 text-violet-700",
  site_task: "bg-stone-200 text-charcoal",
};

const TYPE_LEGEND: { type: CalendarEvent["type"]; label: string }[] = [
  { type: "work_order", label: "작업지시서" },
  { type: "as_request", label: "AS" },
  { type: "todo", label: "할일" },
  { type: "미팅", label: "미팅" },
  { type: "수금", label: "수금" },
  { type: "행사", label: "행사" },
  { type: "촬영", label: "촬영" },
];

// 진행중인 현장마다 고정 색을 배정해 공정표 일정을 현장별로 구분한다 (카테고리색과는 별개).
const SITE_PALETTE = [
  { bg: "bg-rose-100", text: "text-rose-700", dot: "bg-rose-400" },
  { bg: "bg-sky-100", text: "text-sky-700", dot: "bg-sky-400" },
  { bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-400" },
  { bg: "bg-amber-100", text: "text-amber-700", dot: "bg-amber-400" },
  { bg: "bg-violet-100", text: "text-violet-700", dot: "bg-violet-400" },
  { bg: "bg-cyan-100", text: "text-cyan-700", dot: "bg-cyan-400" },
  { bg: "bg-fuchsia-100", text: "text-fuchsia-700", dot: "bg-fuchsia-400" },
  { bg: "bg-lime-100", text: "text-lime-700", dot: "bg-lime-400" },
];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function lastDayOfMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

// start~end를 [lo, hi] 범위로 잘라 그 사이의 날짜 문자열 배열을 반환한다 (UTC 고정으로 시간대 밀림 방지).
function eachDateClamped(start: string, end: string, lo: string, hi: string) {
  const s = start < lo ? lo : start;
  const e = end > hi ? hi : end;
  const dates: string[] = [];
  let cursor = new Date(`${s}T00:00:00Z`);
  const endDate = new Date(`${e}T00:00:00Z`);
  while (cursor.getTime() <= endDate.getTime()) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
  }
  return dates;
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single<Profile>();
  const canManageAnyEvent = me?.role === "owner" || me?.role === "manager";

  const [
    { data: workOrders },
    { data: asRequests },
    { data: todos },
    { data: events },
    { data: tasks },
    { data: activeOrders },
    { data: teamTodos },
    { data: myTodos },
  ] = await Promise.all([
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
    supabase
      .from("calendar_events")
      .select("*")
      .gte("event_date", monthStart)
      .lte("event_date", monthEnd)
      .returns<ScheduleEvent[]>(),
    // 공정표(work_order_tasks)가 이번 달과 겹치는 것만 — 캘린더에 현장별 색으로 표시하기 위함.
    supabase
      .from("work_order_tasks")
      .select("*, work_orders(id, title)")
      .lte("start_date", monthEnd)
      .gte("end_date", monthStart)
      .returns<(WorkOrderTask & { work_orders: Pick<WorkOrder, "id" | "title"> | null })[]>(),
    // 진행중인 현장 전체 — 좌측 색상 범례 및 방문 참고용 주소 목록.
    supabase
      .from("work_orders")
      .select("id, title, site_address, status")
      .eq("status", "in_progress")
      .order("title")
      .returns<Pick<WorkOrder, "id" | "title" | "site_address" | "status">[]>(),
    // 담당자 없는 팀 할일 — 체크하면 내가 가져간다.
    supabase
      .from("todos")
      .select("id, title, status, due_date")
      .is("assignee_id", null)
      .neq("status", "done")
      .order("created_at", { ascending: false })
      .limit(10)
      .returns<Pick<Todo, "id" | "title" | "status" | "due_date">[]>(),
    // 내 할일 (개인 할일 + 내가 가져간/배정받은 할일).
    supabase
      .from("todos")
      .select("id, title, status, due_date")
      .eq("assignee_id", user!.id)
      .neq("status", "done")
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(10)
      .returns<Pick<Todo, "id" | "title" | "status" | "due_date">[]>(),
  ]);

  const siteColorMap = new Map((activeOrders ?? []).map((o, i) => [o.id, SITE_PALETTE[i % SITE_PALETTE.length]]));

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
  events?.forEach((e) =>
    addEvent(e.event_date, {
      id: e.id,
      title: e.title,
      type: e.category,
      href: null,
      createdBy: e.created_by,
      time: e.event_time,
      siteName: e.site_name,
      team: e.team,
      meetingType: e.meeting_type,
    })
  );
  tasks?.forEach((t) => {
    if (!t.start_date || !t.end_date || !t.work_orders) return;
    const color = siteColorMap.get(t.work_order_id);
    eachDateClamped(t.start_date, t.end_date, monthStart, monthEnd).forEach((d) =>
      addEvent(d, {
        id: `${t.id}-${d}`,
        title: `${t.work_orders!.title} ${t.title}`,
        type: "site_task",
        href: `/admin/work-orders/${t.work_order_id}`,
        colorClass: color ? `${color.bg} ${color.text}` : undefined,
      })
    );
  });

  const weeks = getMonthGridWeeks(year, month);
  const selectedEvents = selectedDate ? (eventsByDate.get(selectedDate) ?? []) : [];

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-semibold text-charcoal">캘린더</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-4">
            {TYPE_LEGEND.map((legend) => (
              <span key={legend.type} className="flex items-center gap-1.5 text-xs text-charcoal/60">
                <span className={`h-2.5 w-2.5 rounded-full ${TYPE_STYLE[legend.type].split(" ")[0]}`} />
                {legend.label}
              </span>
            ))}
          </div>
          <AddEventModal defaultDate={selectedDate ?? todayDateString} />
        </div>
      </div>
      <p className="mt-1.5 text-xs text-charcoal/40">
        현장 공정은 현장별 색상(왼쪽 진행 현장 참고) · 날짜를 클릭해 추가 · 팀 할일은 오른쪽에서
      </p>

      <div className="mt-6 grid gap-6 xl:grid-cols-[220px_1fr_300px]">
        <div className="flex flex-col gap-4 xl:order-1">
          <div className="rounded-sm border border-nude/60 bg-white p-4">
            <h3 className="text-sm font-semibold text-charcoal">진행 현장</h3>
            <p className="mt-1 text-xs text-charcoal/40">현장 방문 시 주소를 참고하세요</p>
            <div className="mt-3 flex flex-col gap-3">
              {activeOrders?.map((o) => {
                const color = siteColorMap.get(o.id)!;
                return (
                  <Link key={o.id} href={`/admin/work-orders/${o.id}`} className="block hover:opacity-80">
                    <p className="flex items-center gap-1.5 text-sm font-medium text-charcoal">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${color.dot}`} />
                      <span className="truncate">{o.title}</span>
                    </p>
                    {o.site_address && (
                      <p className="mt-0.5 truncate pl-3.5 text-xs text-charcoal/50">{o.site_address}</p>
                    )}
                  </Link>
                );
              })}
              {(!activeOrders || activeOrders.length === 0) && (
                <p className="text-xs text-charcoal/40">진행중인 현장이 없습니다.</p>
              )}
            </div>
          </div>
        </div>

        <div className="xl:order-2">
          <div className="flex items-center justify-between">
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
                <div key={day} className={`py-2 ${i === 0 ? "text-red-600" : i === 6 ? "text-blue-600" : ""}`}>
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
                            className={`truncate rounded-sm px-1.5 py-0.5 text-[10px] leading-tight ${
                              event.colorClass ?? TYPE_STYLE[event.type]
                            }`}
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
                {selectedEvents.map((event) => {
                  const badge = (
                    <span
                      className={`rounded-sm px-2 py-0.5 text-[10px] ${event.colorClass ?? TYPE_STYLE[event.type]}`}
                    >
                      {event.type === "site_task" ? "공정표" : TYPE_LEGEND.find((l) => l.type === event.type)?.label}
                    </span>
                  );
                  const isCalendarEvent = (CALENDAR_EVENT_TYPES as readonly string[]).includes(event.type);
                  const canDelete = isCalendarEvent && (canManageAnyEvent || event.createdBy === user!.id);
                  const detail = [event.time, event.meetingType, event.siteName, event.team]
                    .filter(Boolean)
                    .join(" · ");

                  if (isCalendarEvent) {
                    return (
                      <div
                        key={`${event.type}-${event.id}`}
                        className="flex items-center justify-between rounded-sm border border-nude/40 p-3 text-sm"
                      >
                        <div>
                          <span>{event.title}</span>
                          {detail && <p className="mt-0.5 text-xs text-charcoal/50">{detail}</p>}
                        </div>
                        <span className="flex items-center gap-2">
                          {badge}
                          {canDelete && (
                            <form action={deleteScheduleEvent.bind(null, event.id)}>
                              <button type="submit" className="text-xs text-charcoal/40 hover:text-red-600">
                                삭제
                              </button>
                            </form>
                          )}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={`${event.type}-${event.id}`}
                      href={event.href!}
                      className="flex items-center justify-between rounded-sm border border-nude/40 p-3 text-sm hover:border-orange-400"
                    >
                      <span>{event.title}</span>
                      {badge}
                    </Link>
                  );
                })}
                {selectedEvents.length === 0 && (
                  <p className="text-sm text-charcoal/50">이 날짜에 등록된 일정이 없습니다.</p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4 xl:order-3">
          <div className="rounded-sm border border-nude/60 bg-white p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-charcoal">전체 팀 할일</h3>
              <Link href="/admin/todos" className="text-xs text-taupe hover:text-gold">
                할일 페이지
              </Link>
            </div>
            <p className="mt-1 text-xs text-charcoal/40">체크하면 내가 가져가요 (내 담당·진행중으로 전환)</p>
            <div className="mt-3 flex flex-col gap-2">
              {teamTodos?.map((t) => (
                <label key={t.id} className="flex items-center gap-2 text-sm text-charcoal/80">
                  <ClaimTodoCheckbox id={t.id} />
                  <span className="truncate">{t.title}</span>
                </label>
              ))}
              {(!teamTodos || teamTodos.length === 0) && (
                <p className="text-xs text-charcoal/40">담당자 없는 할일이 없습니다.</p>
              )}
            </div>
          </div>

          <div className="rounded-sm border border-nude/60 bg-white p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-charcoal">내 할일</h3>
              <Link href="/admin/todos" className="text-xs text-taupe hover:text-gold">
                할일 페이지
              </Link>
            </div>
            <p className="mt-1 text-xs text-charcoal/40">개인 할일 + 내가 가져간/배정받은 팀 할일. (할일 페이지 연동)</p>
            <form action={createQuickTodo} className="mt-3 flex gap-2">
              <input
                name="title"
                required
                placeholder="빠른 할일 추가 후 Enter"
                className="flex-1 rounded-sm border border-nude px-2 py-1.5 text-sm outline-none focus:border-orange-400"
              />
              <button
                type="submit"
                className="rounded-sm bg-orange-300 px-3 py-1.5 text-xs font-medium text-orange-900 hover:bg-orange-400"
              >
                추가
              </button>
            </form>
            <div className="mt-3 flex flex-col gap-2">
              {myTodos?.map((t) => (
                <label key={t.id} className="flex items-center gap-2 text-sm text-charcoal/80">
                  <CompleteTodoCheckbox id={t.id} status={t.status} />
                  <span className="truncate">{t.title}</span>
                </label>
              ))}
              {(!myTodos || myTodos.length === 0) && (
                <p className="text-xs text-charcoal/40">내 할일이 없습니다.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
