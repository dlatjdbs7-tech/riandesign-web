import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import type { AsRequest, Profile, Todo, WorkOrder } from "@/lib/types";
import { daysBetweenDateStrings, getKSTDateBounds, getKSTWeekBounds } from "@/lib/date";
import { getWorkOrderRisk, type RiskLevel } from "@/lib/risk";
import { getFinishTaskInfo, getTaskCompletionProgress } from "@/lib/schedulePeriod";
import { getNotificationCount } from "@/lib/notifications";

const RISK_LABEL: Record<RiskLevel, string> = { danger: "위험", caution: "주의", normal: "정상" };
const RISK_STYLE: Record<RiskLevel, string> = {
  danger: "bg-red-100 text-red-700",
  caution: "bg-amber-100 text-amber-700",
  normal: "bg-emerald-100 text-emerald-700",
};

function FunnelBar({
  label,
  count,
  percentOfPrevious,
}: {
  label: string;
  count: number;
  percentOfPrevious: number | null;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-12 shrink-0 text-xs text-charcoal/60">{label}</span>
      <div className="h-6 flex-1 rounded-sm bg-stone-100">
        <div
          className="flex h-6 items-center rounded-sm bg-orange-300 px-2 text-xs font-medium text-orange-900"
          style={{ width: `${Math.max(count > 0 ? 8 : 0, Math.min(100, percentOfPrevious ?? 100))}%` }}
        >
          {count}
        </div>
      </div>
      {percentOfPrevious !== null && (
        <span className="w-12 shrink-0 text-right text-xs text-charcoal/60">
          {Math.round(percentOfPrevious)}%
        </span>
      )}
    </div>
  );
}

async function ManagerDashboard({
  supabase,
  profile,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  profile: { id: string; role: string };
}) {
  const { todayDateString } = getKSTDateBounds();
  const { weekStartDate, weekEndDate } = getKSTWeekBounds();

  const [
    { count: newInquiryCount },
    { count: activeWorkOrderCount },
    { count: openAsCount },
    { count: totalInquiryCount },
    { count: contactedInquiryCount },
    { count: sentQuoteCount },
    { count: totalQuoteCount },
    { count: acceptedQuoteCount },
    { data: inProgressOrders },
    { data: weekOrders },
    { data: weekAsRequests },
    { data: weekTodos },
    { data: recentCompletedOrders },
    pendingAlertCount,
  ] = await Promise.all([
    supabase.from("inquiries").select("*", { count: "exact", head: true }).eq("status", "new"),
    supabase.from("work_orders").select("*", { count: "exact", head: true }).eq("status", "in_progress"),
    supabase
      .from("as_requests")
      .select("*", { count: "exact", head: true })
      .neq("status", "completed"),
    supabase.from("inquiries").select("*", { count: "exact", head: true }),
    supabase.from("inquiries").select("*", { count: "exact", head: true }).neq("status", "new"),
    supabase.from("quotes").select("*", { count: "exact", head: true }).eq("status", "sent"),
    supabase.from("quotes").select("*", { count: "exact", head: true }),
    supabase.from("quotes").select("*", { count: "exact", head: true }).eq("status", "accepted"),
    supabase
      .from("work_orders")
      .select("*")
      .eq("status", "in_progress")
      .returns<WorkOrder[]>(),
    supabase
      .from("work_orders")
      .select("*")
      .gte("work_date", weekStartDate)
      .lte("work_date", weekEndDate)
      .order("work_date", { ascending: true })
      .returns<WorkOrder[]>(),
    supabase
      .from("as_requests")
      .select("*")
      .gte("request_date", weekStartDate)
      .lte("request_date", weekEndDate)
      .order("request_date", { ascending: true })
      .returns<AsRequest[]>(),
    supabase
      .from("todos")
      .select("*")
      .gte("due_date", weekStartDate)
      .lte("due_date", weekEndDate)
      .order("due_date", { ascending: true })
      .returns<Todo[]>(),
    supabase
      .from("work_orders")
      .select("*")
      .eq("status", "completed")
      .order("work_end_date", { ascending: false, nullsFirst: false })
      .limit(5)
      .returns<WorkOrder[]>(),
    getNotificationCount(supabase, profile),
  ]);

  const cards = [
    {
      label: "신규 상담문의",
      value: `${newInquiryCount ?? 0}건`,
      caption: `견적 진행 ${sentQuoteCount ?? 0} · 전체 ${totalInquiryCount ?? 0}건`,
    },
    { label: "진행중 현장", value: `${activeWorkOrderCount ?? 0}건`, caption: "계약·시공중" },
    { label: "AS 현황", value: `${openAsCount ?? 0}건`, caption: "미완료" },
    { label: "발송 대기 알림", value: `${pendingAlertCount}건`, caption: "알림센터" },
  ];

  const funnelSteps = [
    { label: "문의", count: totalInquiryCount ?? 0, base: totalInquiryCount ?? 0 },
    { label: "상담", count: contactedInquiryCount ?? 0, base: totalInquiryCount ?? 0 },
    { label: "견적", count: totalQuoteCount ?? 0, base: totalInquiryCount ?? 0 },
    { label: "계약", count: acceptedQuoteCount ?? 0, base: totalInquiryCount ?? 0 },
  ];

  const inProgressIds = (inProgressOrders ?? []).map((o) => o.id);
  const finishTaskByOrder = await getFinishTaskInfo(supabase, inProgressIds);
  const progressByOrder = await getTaskCompletionProgress(supabase, inProgressIds, todayDateString);

  const siteItems: { order: WorkOrder; risk: RiskLevel; progress: number }[] = [];
  const riskCounts = { danger: 0, caution: 0, normal: 0 };
  for (const order of inProgressOrders ?? []) {
    const risk = getWorkOrderRisk(order, todayDateString, finishTaskByOrder.get(order.id)?.endDate);
    riskCounts[risk] += 1;
    siteItems.push({ order, risk, progress: progressByOrder.get(order.id) ?? order.progress_percent });
  }
  const riskOrder: Record<RiskLevel, number> = { danger: 0, caution: 1, normal: 2 };
  siteItems.sort((a, b) => riskOrder[a.risk] - riskOrder[b.risk]);

  const scheduleItems = [
    ...(weekAsRequests ?? []).map((a) => ({
      id: a.id,
      title: a.title,
      date: a.request_date,
      type: "AS" as const,
      href: "/admin/as-requests",
    })),
    ...(weekTodos ?? []).map((t) => ({
      id: t.id,
      title: t.title,
      date: t.due_date ?? "",
      type: "할일" as const,
      href: "/admin/todos",
    })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-sm border border-nude/60 bg-white p-5">
            <p className="text-xs tracking-wide text-charcoal/60">{card.label}</p>
            <p className="mt-2 font-serif text-2xl text-charcoal">{card.value}</p>
            <p className="mt-1 text-xs text-charcoal/40">{card.caption}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-sm border border-nude/60 bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg font-semibold text-charcoal">전환 퍼널</h2>
          <span className="text-xs text-charcoal/60">
            계약 전환율{" "}
            <span className="font-semibold text-orange-600">
              {funnelSteps[0].base > 0
                ? Math.round((funnelSteps[3].count / funnelSteps[0].base) * 100)
                : 0}
              %
            </span>
          </span>
        </div>
        <div className="mt-4 flex flex-col gap-2">
          {funnelSteps.map((step, index) => (
            <FunnelBar
              key={step.label}
              label={step.label}
              count={step.count}
              percentOfPrevious={
                index === 0
                  ? funnelSteps[0].base > 0
                    ? 100
                    : 0
                  : funnelSteps[0].base > 0
                    ? (step.count / funnelSteps[0].base) * 100
                    : 0
              }
            />
          ))}
        </div>
      </div>

      <div className="mt-8 rounded-sm border border-nude/60 bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg font-semibold text-charcoal">
            진행 현장 · 신호등 · {siteItems.length}
          </h2>
          <Link href="/admin/sites" className="text-xs text-taupe hover:text-orange-600">
            현장관리 →
          </Link>
        </div>
        <div className="mt-4 flex gap-3">
          <span className="flex-1 rounded-full bg-red-50 py-2 text-center text-xs text-red-700">
            위험 {riskCounts.danger}
          </span>
          <span className="flex-1 rounded-full bg-amber-50 py-2 text-center text-xs text-amber-700">
            주의 {riskCounts.caution}
          </span>
          <span className="flex-1 rounded-full bg-emerald-50 py-2 text-center text-xs text-emerald-700">
            정상 {riskCounts.normal}
          </span>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          {siteItems.map(({ order, risk, progress }) => {
            const materialDday = order.material_order_date
              ? daysBetweenDateStrings(todayDateString, order.material_order_date)
              : null;
            return (
              <div key={order.id}>
                <div className="flex items-center justify-between text-sm">
                  <Link href={`/admin/work-orders/${order.id}`} className="hover:text-orange-600">
                    {order.title}
                  </Link>
                  <span
                    className={`rounded-sm px-1.5 py-0.5 text-xs ${RISK_STYLE[risk]}`}
                  >
                    {RISK_LABEL[risk]}
                  </span>
                </div>
                {materialDday !== null && (
                  <p className={`mt-0.5 text-xs ${materialDday < 0 ? "text-red-600" : "text-charcoal/40"}`}>
                    자재 발주 {materialDday >= 0 ? `예정 D-${materialDday}` : `지연 D+${Math.abs(materialDday)}`}
                  </p>
                )}
                <div className="mt-1 flex items-center gap-2">
                  <div className="h-2 flex-1 rounded-full bg-stone-100">
                    <div className="h-2 rounded-full bg-emerald-600" style={{ width: `${progress}%` }} />
                  </div>
                  <span className="w-9 shrink-0 text-right text-xs text-charcoal/50">{progress}%</span>
                </div>
              </div>
            );
          })}
          {siteItems.length === 0 && (
            <p className="text-sm text-charcoal/50">진행중인 현장이 없습니다.</p>
          )}
        </div>
        <p className="mt-3 text-[11px] text-charcoal/40">공정률 = 완료 공정 ÷ 전체 공정.</p>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-sm border border-nude/60 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg font-semibold text-charcoal">
              이번 주 시공 · {(weekOrders ?? []).length}
            </h2>
            <Link href="/admin/work-orders" className="text-xs text-taupe hover:text-orange-600">
              전체 보기
            </Link>
          </div>
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            {weekOrders?.map((order) => (
              <li key={order.id} className="flex justify-between border-b border-nude/30 pb-2 last:border-0">
                <Link href={`/admin/work-orders/${order.id}`} className="hover:text-orange-600">
                  {order.title}
                </Link>
                <span className="text-charcoal/60">{order.work_date}</span>
              </li>
            ))}
            {(!weekOrders || weekOrders.length === 0) && (
              <li className="text-charcoal/50">이번 주로 예정된 시공이 없습니다.</li>
            )}
          </ul>
        </div>

        <div className="rounded-sm border border-nude/60 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg font-semibold text-charcoal">
              이번 주 일정 · {scheduleItems.length}
            </h2>
            <Link href="/admin/calendar" className="text-xs text-taupe hover:text-orange-600">
              캘린더 보기
            </Link>
          </div>
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            {scheduleItems.map((item) => (
              <li
                key={`${item.type}-${item.id}`}
                className="flex items-center justify-between border-b border-nude/30 pb-2 last:border-0"
              >
                <Link href={item.href} className="flex items-center gap-2 hover:text-orange-600">
                  <span
                    className={`rounded-sm px-1.5 py-0.5 text-[10px] ${
                      item.type === "AS" ? "bg-red-50 text-red-700" : "bg-orange-100 text-orange-700"
                    }`}
                  >
                    {item.type}
                  </span>
                  {item.title}
                </Link>
                <span className="text-charcoal/60">{item.date}</span>
              </li>
            ))}
            {scheduleItems.length === 0 && (
              <li className="text-charcoal/50">이번 주로 예정된 일정이 없습니다.</li>
            )}
          </ul>
        </div>
      </div>

      <div className="mt-8 rounded-sm border border-nude/60 bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 font-serif text-lg font-semibold text-charcoal">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            완료된 현장 · {(recentCompletedOrders ?? []).length}
          </h2>
          <Link href="/admin/sites" className="text-xs text-taupe hover:text-orange-600">
            현장관리 →
          </Link>
        </div>
        <ul className="mt-3 flex flex-col gap-2 text-sm">
          {recentCompletedOrders?.map((order) => (
            <li key={order.id} className="flex justify-between border-b border-nude/30 pb-2 last:border-0">
              <Link href={`/admin/work-orders/${order.id}`} className="hover:text-orange-600">
                {order.title}
              </Link>
              <span className="text-charcoal/60">{order.work_end_date ?? "-"}</span>
            </li>
          ))}
          {(!recentCompletedOrders || recentCompletedOrders.length === 0) && (
            <li className="text-charcoal/50">마감된 현장이 없습니다.</li>
          )}
        </ul>
      </div>
    </>
  );
}

async function EmployeeDashboard({
  supabase,
  userId,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
}) {
  const { startOfDay, endOfDay } = getKSTDateBounds();

  const [{ data: todayAttendance }, { data: myOrders }] = await Promise.all([
    supabase
      .from("attendance_records")
      .select("check_in_at, check_out_at")
      .eq("user_id", userId)
      .gte("check_in_at", startOfDay)
      .lt("check_in_at", endOfDay)
      .maybeSingle(),
    supabase
      .from("work_orders")
      .select("*")
      .eq("assignee_id", userId)
      .neq("status", "completed")
      .order("work_date", { ascending: true })
      .returns<WorkOrder[]>(),
  ]);

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <section className="rounded-sm border border-nude/60 bg-white p-5">
        <h2 className="font-serif text-lg font-semibold text-charcoal">오늘 근태</h2>
        {todayAttendance ? (
          <p className="mt-3 text-sm text-charcoal/70">
            출근 {new Date(todayAttendance.check_in_at).toLocaleTimeString("ko-KR", { timeZone: "Asia/Seoul" })}
            {todayAttendance.check_out_at &&
              ` · 퇴근 ${new Date(todayAttendance.check_out_at).toLocaleTimeString("ko-KR", { timeZone: "Asia/Seoul" })}`}
          </p>
        ) : (
          <p className="mt-3 text-sm text-charcoal/50">아직 출근 기록이 없습니다.</p>
        )}
        <Link href="/admin/attendance" className="mt-3 inline-block text-xs text-orange-600 hover:underline">
          근태관리로 이동 →
        </Link>
      </section>

      <section className="rounded-sm border border-nude/60 bg-white p-5">
        <h2 className="font-serif text-lg font-semibold text-charcoal">나의 진행중 작업</h2>
        <ul className="mt-3 flex flex-col gap-2 text-sm">
          {myOrders?.map((order) => (
            <li key={order.id} className="border-b border-nude/30 pb-2 last:border-0">
              <Link href={`/admin/work-orders/${order.id}`} className="hover:text-orange-600">
                {order.title}
              </Link>
              <span className="ml-2 text-charcoal/60">{order.work_date ?? "일정 미정"}</span>
            </li>
          ))}
          {(!myOrders || myOrders.length === 0) && (
            <li className="text-charcoal/50">배정된 작업지시서가 없습니다.</li>
          )}
        </ul>
      </section>
    </div>
  );
}

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: me } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single<Profile>();

  const canManage = me?.role === "owner" || me?.role === "manager";

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-charcoal">대시보드</h1>
      {canManage ? (
        <ManagerDashboard supabase={supabase} profile={{ id: user!.id, role: me!.role }} />
      ) : (
        <EmployeeDashboard supabase={supabase} userId={user!.id} />
      )}
    </div>
  );
}
