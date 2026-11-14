import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import type { AsRequest, Inquiry, Profile, Todo, WorkOrder } from "@/lib/types";
import { daysBetweenDateStrings, getKSTDateBounds, getKSTWeekBounds } from "@/lib/date";
import { getWorkOrderRisk, type RiskLevel } from "@/lib/risk";
import { getFinishTaskInfo, getTaskCompletionProgress } from "@/lib/schedulePeriod";
import { INFLOW_START_ISO, inquirySourceLabel, isOnlineInquiry } from "@/lib/trafficSource";
import ClockInCard from "@/components/admin/ClockInCard";

// 지각 기준: 9시 10분 이후 출근 (근태 페이지와 같은 기준)
const LATE_CHECK_IN_MINUTES = 9 * 60 + 10;

const RISK_LABEL: Record<RiskLevel, string> = { danger: "위험", caution: "주의", normal: "정상" };
const RISK_STYLE: Record<RiskLevel, string> = {
  danger: "bg-red-100 text-red-700",
  caution: "bg-amber-100 text-amber-700",
  normal: "bg-emerald-100 text-emerald-700",
};

const INQUIRY_STATUS_LABEL: Record<Inquiry["status"], string> = {
  lead: "문의",
  new: "신규",
  contacted: "상담",
  quoted: "견적",
  closed: "마감",
  simple_inquiry: "단순문의",
};
const INQUIRY_STATUS_STYLE: Record<Inquiry["status"], string> = {
  lead: "bg-sky-50 text-sky-700",
  new: "bg-sky-50 text-sky-700",
  contacted: "bg-violet-50 text-violet-700",
  quoted: "bg-orange-50 text-orange-700",
  closed: "bg-stone-100 text-charcoal/50",
  simple_inquiry: "bg-stone-100 text-charcoal/60",
};

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric" });
}

async function ManagerDashboard({
  supabase,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
}) {
  const { todayDateString } = getKSTDateBounds();
  const { weekStartDate, weekEndDate } = getKSTWeekBounds();

  const [
    { data: inquiries },
    { count: contractCount },
    { count: openAsCount },
    { data: inProgressOrders },
    { data: weekOrders },
    { data: weekAsRequests },
    { data: weekTodos },
  ] = await Promise.all([
    // 2026-11-01 이후 문의만 (리셋 기준일)
    supabase
      .from("inquiries")
      .select("id, name, size_py, address, status, auto_source, referral_source, created_at")
      .gte("created_at", INFLOW_START_ISO)
      .order("created_at", { ascending: false })
      .returns<
        Pick<Inquiry, "id" | "name" | "size_py" | "address" | "status" | "auto_source" | "referral_source" | "created_at">[]
      >(),
    supabase
      .from("work_orders")
      .select("*", { count: "exact", head: true })
      .gte("created_at", INFLOW_START_ISO)
      .neq("status", "cancelled"),
    supabase.from("as_requests").select("*", { count: "exact", head: true }).neq("status", "completed"),
    supabase.from("work_orders").select("*").eq("status", "in_progress").returns<WorkOrder[]>(),
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
  ]);

  const allInquiries = inquiries ?? [];
  const onlineCount = allInquiries.filter(isOnlineInquiry).length;
  const inConsultCount = allInquiries.filter((i) => i.status === "new" || i.status === "lead" || i.status === "contacted").length;
  const quotedCount = allInquiries.filter((i) => i.status === "quoted").length;

  // 문의가 들어온 곳별 건수
  const sourceCounts = new Map<string, number>();
  for (const inquiry of allInquiries) {
    const label = inquirySourceLabel(inquiry);
    sourceCounts.set(label, (sourceCounts.get(label) ?? 0) + 1);
  }
  const sourceRows = [...sourceCounts.entries()].sort((a, b) => b[1] - a[1]);
  const maxSource = Math.max(1, ...sourceRows.map(([, n]) => n));

  const cards = [
    { label: "11월부터 문의", value: allInquiries.length, caption: `홈페이지 ${onlineCount} · 직접 접수 ${allInquiries.length - onlineCount}`, href: "/admin/inquiries" },
    { label: "상담 중", value: inConsultCount, caption: "신규·상담 단계", href: "/admin/inquiries" },
    { label: "견적 단계", value: quotedCount, caption: "견적 보낸 문의", href: "/admin/inquiries" },
    { label: "계약", value: contractCount ?? 0, caption: "11월부터 등록된 현장", href: "/admin/sites" },
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
    ...(weekAsRequests ?? []).map((a) => ({ id: a.id, title: a.title, date: a.request_date, type: "AS" as const, href: "/admin/as-requests" })),
    ...(weekTodos ?? []).map((t) => ({ id: t.id, title: t.title, date: t.due_date ?? "", type: "할일" as const, href: "/admin/todos" })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Link key={card.label} href={card.href} className="rounded-xl border border-nude/60 bg-white p-5 hover:border-orange-300">
            <p className="text-xs font-medium text-charcoal/55">{card.label}</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums text-charcoal">
              {card.value}
              <span className="ml-0.5 text-base font-normal text-charcoal/50">건</span>
            </p>
            <p className="mt-1 text-xs text-charcoal/40">{card.caption}</p>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <section className="rounded-xl border border-nude/60 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-charcoal">문의는 어디서 왔나</h2>
            <Link href="/admin/analytics" className="text-xs text-taupe hover:text-orange-600">
              유입분석 →
            </Link>
          </div>
          <p className="mt-1 text-xs text-charcoal/40">11월 1일부터 · 홈페이지 문의는 자동 감지, 직접 접수는 고른 경로</p>
          <div className="mt-4 flex flex-col gap-2.5">
            {sourceRows.map(([label, count]) => (
              <div key={label} className="flex items-center gap-3 text-sm">
                <span className="w-32 shrink-0 truncate text-charcoal/70">{label}</span>
                <div className="h-5 flex-1 rounded bg-stone-100">
                  <div className="h-5 rounded bg-orange-400" style={{ width: `${(count / maxSource) * 100}%` }} />
                </div>
                <span className="w-8 shrink-0 text-right font-medium tabular-nums text-charcoal">{count}</span>
              </div>
            ))}
            {sourceRows.length === 0 && <p className="text-sm text-charcoal/45">11월 들어 아직 문의가 없습니다.</p>}
          </div>
        </section>

        <section className="rounded-xl border border-nude/60 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-charcoal">최근 문의</h2>
            <Link href="/admin/inquiries" className="text-xs text-taupe hover:text-orange-600">
              상담접수 →
            </Link>
          </div>
          <ul className="mt-3 flex flex-col">
            {allInquiries.slice(0, 7).map((inquiry) => (
              <li key={inquiry.id} className="flex items-center gap-3 border-b border-nude/30 py-2.5 text-sm last:border-0">
                <span className="w-10 shrink-0 text-xs tabular-nums text-charcoal/45">{shortDate(inquiry.created_at)}</span>
                <span className="min-w-0 flex-1 truncate">
                  <span className="font-medium text-charcoal">{inquiry.name}</span>
                  {(inquiry.size_py || inquiry.address) && (
                    <span className="ml-2 text-xs text-charcoal/45">
                      {[inquiry.size_py && `${inquiry.size_py}평`, inquiry.address].filter(Boolean).join(" · ")}
                    </span>
                  )}
                </span>
                <span className="hidden shrink-0 text-xs text-charcoal/50 sm:inline">{inquirySourceLabel(inquiry)}</span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${INQUIRY_STATUS_STYLE[inquiry.status]}`}>
                  {INQUIRY_STATUS_LABEL[inquiry.status]}
                </span>
              </li>
            ))}
            {allInquiries.length === 0 && <li className="py-2 text-sm text-charcoal/45">11월 들어 아직 문의가 없습니다.</li>}
          </ul>
        </section>
      </div>

      <div className="mt-6 rounded-xl border border-nude/60 bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-charcoal">진행 현장 · {siteItems.length}</h2>
          <Link href="/admin/sites" className="text-xs text-taupe hover:text-orange-600">
            현장관리 →
          </Link>
        </div>
        <div className="mt-4 flex gap-3">
          <span className="flex-1 rounded-full bg-red-50 py-2 text-center text-xs text-red-700">위험 {riskCounts.danger}</span>
          <span className="flex-1 rounded-full bg-amber-50 py-2 text-center text-xs text-amber-700">주의 {riskCounts.caution}</span>
          <span className="flex-1 rounded-full bg-emerald-50 py-2 text-center text-xs text-emerald-700">정상 {riskCounts.normal}</span>
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
                  <span className={`rounded-sm px-1.5 py-0.5 text-xs ${RISK_STYLE[risk]}`}>{RISK_LABEL[risk]}</span>
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
          {siteItems.length === 0 && <p className="text-sm text-charcoal/50">진행중인 현장이 없습니다.</p>}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-nude/60 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-charcoal">이번 주 시공 · {(weekOrders ?? []).length}</h2>
            <Link href="/admin/calendar?team=시공팀" className="text-xs text-taupe hover:text-orange-600">
              시공팀 캘린더
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
            {(!weekOrders || weekOrders.length === 0) && <li className="text-charcoal/50">이번 주로 예정된 시공이 없습니다.</li>}
          </ul>
        </div>

        <div className="rounded-xl border border-nude/60 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-charcoal">
              이번 주 일정 · {scheduleItems.length}
              {!!openAsCount && <span className="ml-2 text-xs font-normal text-red-600">미완료 AS {openAsCount}</span>}
            </h2>
            <Link href="/admin/calendar" className="text-xs text-taupe hover:text-orange-600">
              통합 캘린더
            </Link>
          </div>
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            {scheduleItems.map((item) => (
              <li key={`${item.type}-${item.id}`} className="flex items-center justify-between border-b border-nude/30 pb-2 last:border-0">
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
            {scheduleItems.length === 0 && <li className="text-charcoal/50">이번 주로 예정된 일정이 없습니다.</li>}
          </ul>
        </div>
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

  // 출근도장 카드: 오늘 출근 기록(퇴근 전 기록 우선)
  const { startOfDay, endOfDay } = getKSTDateBounds();
  const { data: todayRecords } = await supabase
    .from("attendance_records")
    .select("check_in_at, check_out_at, work_sites(name)")
    .eq("user_id", user!.id)
    .gte("check_in_at", startOfDay)
    .lt("check_in_at", endOfDay)
    .order("check_in_at", { ascending: false })
    .returns<{ check_in_at: string; check_out_at: string | null; work_sites: { name: string } | null }[]>();
  const todayRecord = todayRecords?.find((r) => !r.check_out_at) ?? todayRecords?.[0] ?? null;
  const checkInMinutes = todayRecord
    ? (() => {
        const [h, m] = new Date(todayRecord.check_in_at)
          .toLocaleTimeString("en-GB", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit" })
          .split(":")
          .map(Number);
        return h * 60 + m;
      })()
    : 0;
  const todayLabel = new Date().toLocaleDateString("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  return (
    <div>
      <ClockInCard
        userName={me?.full_name ?? ""}
        todayLabel={todayLabel}
        checkInAt={todayRecord?.check_in_at ?? null}
        checkOutAt={todayRecord?.check_out_at ?? null}
        siteName={todayRecord?.work_sites?.name ?? null}
        isLate={!!todayRecord && checkInMinutes > LATE_CHECK_IN_MINUTES}
      />
      <h1 className="mt-8 font-serif text-2xl font-semibold text-charcoal">대시보드</h1>
      {canManage ? (
        <ManagerDashboard supabase={supabase} />
      ) : (
        <EmployeeDashboard supabase={supabase} userId={user!.id} />
      )}
    </div>
  );
}
