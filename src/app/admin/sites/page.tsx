import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import type { AsRequest, Customer, Inquiry, Profile, Quote, WorkOrder, WorkOrderTask } from "@/lib/types";
import { daysBetweenDateStrings, getKSTDateBounds } from "@/lib/date";
import { getWorkOrderRisk, type RiskLevel } from "@/lib/risk";
import { getTaskCompletionProgress, wasScheduleRecentlyUpdated } from "@/lib/schedulePeriod";
import { createWorkOrder, updateWorkOrderStatus } from "../work-orders/actions";
import { createInquiry, promoteQuoteToWorkOrder } from "./actions";
import SiteStatusSelect from "@/components/admin/SiteStatusSelect";
import ClientNameInput from "@/components/admin/ClientNameInput";
import AssigneeSelect from "@/components/admin/AssigneeSelect";
import InlineFieldInput from "@/components/admin/InlineFieldInput";
import FormattedNumberInput from "@/components/admin/FormattedNumberInput";

type QuoteRow = Quote & { customers: Pick<Customer, "name" | "phone"> | null };
type SiteRow = WorkOrder & {
  customers: Pick<Customer, "name" | "phone"> | null;
  profiles: Pick<Profile, "full_name"> | null;
};

const REFERRAL_SOURCES = ["블로그", "인스타그램", "유튜브", "인터넷 검색", "지인 소개", "기타"];

const RISK_LABEL: Record<RiskLevel, string> = { danger: "위험", caution: "주의", normal: "정상" };
const RISK_STYLE: Record<RiskLevel, string> = {
  danger: "bg-red-100 text-red-700",
  caution: "bg-amber-100 text-amber-700",
  normal: "bg-emerald-100 text-emerald-700",
};

function formatWon(amount: number | null) {
  if (amount === null) return "-";
  return `${amount.toLocaleString()}원`;
}

function formatPeriod(start: string | null, end: string | null) {
  if (!start && !end) return "-";
  if (!end) return start!;
  if (!start) return `~ ${end}`;
  return `${start} ~ ${end}`;
}

function formatInquiryDate(createdAt: string) {
  const d = new Date(createdAt);
  return d.toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", month: "2-digit", day: "2-digit" });
}

export default async function SitesPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; sort?: string; new?: string; newInquiry?: string }>;
}) {
  const params = await searchParams;
  const showCancelled = params.view === "cancelled";
  const sortOldest = params.sort === "oldest";
  const showCreateForm = params.new === "1";
  const showInquiryForm = params.newInquiry === "1";

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
  const { todayDateString } = getKSTDateBounds();

  const [
    { data: newInquiries },
    { data: contactedInquiries },
    { data: sentQuotes },
    { data: inProgressOrders },
    { data: completedOrders },
    { data: cancelledOrders },
    { data: openAsRequests },
    { data: employees },
    { data: customers },
  ] = await Promise.all([
    supabase
      .from("inquiries")
      .select("*")
      .eq("status", "new")
      .order("created_at", { ascending: false })
      .returns<Inquiry[]>(),
    supabase
      .from("inquiries")
      .select("*")
      .eq("status", "contacted")
      .order("created_at", { ascending: false })
      .returns<Inquiry[]>(),
    supabase
      .from("quotes")
      .select("*, customers(name, phone)")
      .eq("status", "sent")
      .order("quote_date", { ascending: false })
      .returns<QuoteRow[]>(),
    supabase
      .from("work_orders")
      .select("*, customers(name, phone), profiles!work_orders_assignee_id_fkey(full_name)")
      .eq("status", "in_progress")
      .returns<SiteRow[]>(),
    supabase
      .from("work_orders")
      .select("*, customers(name, phone), profiles!work_orders_assignee_id_fkey(full_name)")
      .eq("status", "completed")
      .order("work_date", { ascending: sortOldest })
      .returns<SiteRow[]>(),
    supabase
      .from("work_orders")
      .select("*, customers(name, phone), profiles!work_orders_assignee_id_fkey(full_name)")
      .in("status", ["cancelled", "on_hold"])
      .order("created_at", { ascending: false })
      .returns<SiteRow[]>(),
    supabase.from("as_requests").select("*").neq("status", "completed").returns<AsRequest[]>(),
    canManage
      ? supabase
          .from("profiles")
          .select("id, full_name")
          .eq("status", "approved")
          .order("full_name")
          .returns<Pick<Profile, "id" | "full_name">[]>()
      : { data: null },
    canManage
      ? supabase.from("customers").select("id, name").order("name").returns<Pick<Customer, "id" | "name">[]>()
      : { data: null },
  ]);

  const asCountByCustomer = new Map<string, number>();
  for (const req of openAsRequests ?? []) {
    if (!req.customer_id) continue;
    asCountByCustomer.set(req.customer_id, (asCountByCustomer.get(req.customer_id) ?? 0) + 1);
  }

  const inProgressIds = (inProgressOrders ?? []).map((o) => o.id);
  const { data: tasks } = inProgressIds.length
    ? await supabase
        .from("work_order_tasks")
        .select("work_order_id, title, start_date, end_date, updated_at, created_at")
        .in("work_order_id", inProgressIds)
        .returns<
          Pick<WorkOrderTask, "work_order_id" | "title" | "start_date" | "end_date" | "updated_at" | "created_at">[]
        >()
    : { data: null };

  // 공사기간은 "철거" 작업의 시작일 ~ "마감" 작업의 마지막 종료일로 잡는다.
  // 둘 중 하나라도 없는 현장은 예전처럼 전체 공정 중 가장 이른/늦은 날짜로 대체한다.
  const fallbackByOrder = new Map<string, { start: string | null; end: string | null }>();
  const demolitionStartByOrder = new Map<string, string>();
  const finishEndByOrder = new Map<string, string>();
  const finishTaskMetaByOrder = new Map<string, { updatedAt: string; createdAt: string }>();
  for (const task of tasks ?? []) {
    const fallback = fallbackByOrder.get(task.work_order_id) ?? { start: null, end: null };
    if (task.start_date && (!fallback.start || task.start_date < fallback.start)) {
      fallback.start = task.start_date;
    }
    if (task.end_date && (!fallback.end || task.end_date > fallback.end)) {
      fallback.end = task.end_date;
    }
    fallbackByOrder.set(task.work_order_id, fallback);

    if (task.title === "철거" && task.start_date) {
      const current = demolitionStartByOrder.get(task.work_order_id);
      if (!current || task.start_date < current) demolitionStartByOrder.set(task.work_order_id, task.start_date);
    }
    if (task.title === "마감" && task.end_date) {
      const current = finishEndByOrder.get(task.work_order_id);
      if (!current || task.end_date > current) {
        finishEndByOrder.set(task.work_order_id, task.end_date);
        finishTaskMetaByOrder.set(task.work_order_id, {
          updatedAt: task.updated_at,
          createdAt: task.created_at,
        });
      }
    }
  }

  const recentlyUpdatedOrders = new Set<string>();
  for (const [id, meta] of finishTaskMetaByOrder) {
    if (
      wasScheduleRecentlyUpdated(
        { endDate: finishEndByOrder.get(id)!, updatedAt: meta.updatedAt, createdAt: meta.createdAt },
        todayDateString
      )
    ) {
      recentlyUpdatedOrders.add(id);
    }
  }

  const periodByOrder = new Map<string, { start: string | null; end: string | null }>();
  for (const id of fallbackByOrder.keys()) {
    const fallback = fallbackByOrder.get(id)!;
    periodByOrder.set(id, {
      start: demolitionStartByOrder.get(id) ?? fallback.start,
      end: finishEndByOrder.get(id) ?? fallback.end,
    });
  }

  const progressByOrder = await getTaskCompletionProgress(supabase, inProgressIds, todayDateString);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-charcoal">현장관리</h1>
          <p className="mt-2 text-sm text-charcoal/60">
            상담문의가 곧 현장입니다. 신규 → 상담 → 견적 → 계약 → 진행 순으로 흐릅니다.
          </p>
        </div>
        {canManage && (
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href={showInquiryForm ? "/admin/sites" : "/admin/sites?newInquiry=1"}
              className="rounded-full bg-sky-500 px-4 py-2 text-xs font-medium text-white hover:bg-sky-600"
            >
              + 전화문의 등록
            </Link>
            <Link
              href={showCreateForm ? "/admin/sites" : "/admin/sites?new=1"}
              className="rounded-full bg-charcoal px-4 py-2 text-xs font-medium text-cream hover:bg-charcoal/80"
            >
              + 현장 직접 등록
            </Link>
            <Link
              href={showCancelled ? "/admin/sites" : "/admin/sites?view=cancelled"}
              className={`rounded-full border px-4 py-2 text-xs font-medium ${
                showCancelled
                  ? "border-orange-400 bg-orange-100 text-orange-700"
                  : "border-nude text-charcoal hover:border-charcoal"
              }`}
            >
              {showCancelled ? "진행 현황 보기" : "취소/보류 보기"}
            </Link>
          </div>
        )}
      </div>

      {showInquiryForm && canManage && (
        <form
          action={createInquiry}
          className="mt-6 grid gap-3 rounded-sm border border-sky-200 bg-sky-50/40 p-5 sm:grid-cols-2 lg:grid-cols-4"
        >
          <input
            name="name"
            required
            placeholder="이름"
            className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-sky-500"
          />
          <input
            name="phone"
            required
            placeholder="연락처"
            className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-sky-500"
          />
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-charcoal/50">문의날짜</label>
            <input
              type="date"
              name="inquiry_date"
              defaultValue={todayDateString}
              className="border-b border-nude bg-transparent py-1 text-sm outline-none focus:border-sky-500"
            />
          </div>
          <input
            name="address"
            placeholder="아파트명 (선택)"
            className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-sky-500"
          />
          <input
            name="size_py"
            placeholder="평형 (선택)"
            className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-sky-500"
          />
          <input
            name="budget"
            placeholder="예산 (선택)"
            className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-sky-500"
          />
          <select
            name="referral_source"
            className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-sky-500"
          >
            <option value="">유입경로 선택 안 함</option>
            {REFERRAL_SOURCES.map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </select>
          <input
            name="message"
            placeholder="문의 내용 (선택)"
            className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-sky-500 lg:col-span-2"
          />
          <button
            type="submit"
            className="self-start rounded-full bg-sky-500 px-6 py-2 text-sm font-medium text-white hover:bg-sky-600 lg:col-span-4"
          >
            전화문의 등록
          </button>
        </form>
      )}

      {showCreateForm && canManage && (
        <form
          action={createWorkOrder}
          className="mt-6 grid gap-3 rounded-sm border border-nude/60 bg-white p-5 sm:grid-cols-2 lg:grid-cols-4"
        >
          <input type="hidden" name="status" value="in_progress" />
          <input
            name="title"
            required
            placeholder="현장명"
            className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-orange-400"
          />
          <select
            name="customer_id"
            className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-orange-400"
          >
            <option value="">고객관리에 등록된 고객 아님</option>
            {customers?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            name="client_name"
            placeholder="고객명 (등록 고객이 없을 때만 입력)"
            className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-orange-400"
          />
          <input
            name="site_address"
            placeholder="현장 주소"
            className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-orange-400"
          />
          <FormattedNumberInput name="contract_amount" placeholder="계약금액" />
          <select
            name="assignee_id"
            className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-orange-400"
          >
            <option value="">담당자 선택 안 함</option>
            {employees?.map((e) => (
              <option key={e.id} value={e.id}>
                {e.full_name}
              </option>
            ))}
          </select>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-charcoal/50">공사 시작일</label>
            <input
              type="date"
              name="work_date"
              className="border-b border-nude bg-transparent py-1 text-sm outline-none focus:border-orange-400"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-charcoal/50">공사 종료일</label>
            <input
              type="date"
              name="work_end_date"
              className="border-b border-nude bg-transparent py-1 text-sm outline-none focus:border-orange-400"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-charcoal/50">자재 발주일</label>
            <input
              type="date"
              name="material_order_date"
              className="border-b border-nude bg-transparent py-1 text-sm outline-none focus:border-orange-400"
            />
          </div>
          <button
            type="submit"
            className="self-start rounded-full bg-orange-300 px-6 py-2 text-sm font-medium text-orange-900 hover:bg-orange-400 lg:col-span-4"
          >
            현장 등록
          </button>
        </form>
      )}

      {showCancelled ? (
        <div className="mt-6 overflow-x-auto rounded-sm border border-nude/60 bg-white">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-nude/60 text-xs tracking-wide text-charcoal/60">
              <tr>
                <th className="px-4 py-3">현장</th>
                <th className="px-4 py-3">고객</th>
                <th className="px-4 py-3">상태</th>
                <th className="px-4 py-3">계약금액</th>
                <th className="px-4 py-3">담당</th>
              </tr>
            </thead>
            <tbody>
              {cancelledOrders?.map((order) => (
                <tr key={order.id} className="border-b border-nude/30 last:border-0">
                  <td className="px-4 py-3">
                    <Link href={`/admin/work-orders/${order.id}`} className="hover:text-orange-600">
                      {order.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-charcoal/70">
                    {order.customers?.name ?? order.client_name ?? "-"}
                  </td>
                  <td className="px-4 py-3">
                    {canManage ? (
                      <SiteStatusSelect id={order.id} status={order.status} />
                    ) : (
                      <span
                        className={`rounded-sm px-2 py-0.5 text-xs ${
                          order.status === "cancelled" ? "bg-red-100 text-red-700" : "bg-stone-200 text-charcoal/70"
                        }`}
                      >
                        {order.status === "cancelled" ? "취소" : "보류"}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-charcoal/70">{formatWon(order.contract_amount)}</td>
                  <td className="px-4 py-3 text-charcoal/70">{order.profiles?.full_name ?? "-"}</td>
                </tr>
              ))}
              {(!cancelledOrders || cancelledOrders.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-charcoal/50">
                    취소/보류된 현장이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <div className="flex min-h-[280px] flex-col rounded-sm border border-nude/60 bg-white p-4">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-sm font-semibold text-charcoal">
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                  신규
                </span>
                <span className="text-xs text-charcoal/50">{newInquiries?.length ?? 0}</span>
              </div>
              <div className="mt-3 flex flex-1 flex-col gap-2">
                {newInquiries?.map((inquiry) => (
                  <Link
                    key={inquiry.id}
                    href="/admin/inquiries"
                    className="block rounded-sm border border-nude/40 p-3 text-sm hover:border-rose-400"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-charcoal">{inquiry.name}</p>
                      <span className="shrink-0 text-[11px] text-charcoal/40">
                        {formatInquiryDate(inquiry.created_at)}
                      </span>
                    </div>
                    {(inquiry.address || inquiry.size_py) && (
                      <p className="mt-1 text-xs text-charcoal/60">
                        {[inquiry.address, inquiry.size_py].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    {inquiry.message && (
                      <p className="mt-1 truncate text-xs text-charcoal/50">{inquiry.message}</p>
                    )}
                  </Link>
                ))}
                {(!newInquiries || newInquiries.length === 0) && (
                  <p className="flex flex-1 items-center justify-center rounded-sm border border-dashed border-nude text-center text-xs text-charcoal/40">
                    새 상담문의
                  </p>
                )}
              </div>
            </div>

            <div className="flex min-h-[280px] flex-col rounded-sm border border-nude/60 bg-white p-4">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-sm font-semibold text-charcoal">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  상담
                </span>
                <span className="text-xs text-charcoal/50">{contactedInquiries?.length ?? 0}</span>
              </div>
              <div className="mt-3 flex flex-1 flex-col gap-2">
                {contactedInquiries?.map((inquiry) => (
                  <Link
                    key={inquiry.id}
                    href="/admin/inquiries"
                    className="block rounded-sm border border-nude/40 p-3 text-sm hover:border-amber-400"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-charcoal">{inquiry.name}</p>
                      <span className="shrink-0 text-[11px] text-charcoal/40">
                        {formatInquiryDate(inquiry.created_at)}
                      </span>
                    </div>
                    {(inquiry.address || inquiry.size_py) && (
                      <p className="mt-1 text-xs text-charcoal/60">
                        {[inquiry.address, inquiry.size_py].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    {inquiry.message && (
                      <p className="mt-1 truncate text-xs text-charcoal/50">{inquiry.message}</p>
                    )}
                  </Link>
                ))}
                {(!contactedInquiries || contactedInquiries.length === 0) && (
                  <p className="flex flex-1 items-center justify-center rounded-sm border border-dashed border-nude text-center text-xs text-charcoal/40">
                    연락·상담 진행
                  </p>
                )}
              </div>
            </div>

            <div className="flex min-h-[280px] flex-col rounded-sm border border-nude/60 bg-white p-4">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-sm font-semibold text-charcoal">
                  <span className="h-2 w-2 rounded-full bg-sky-500" />
                  견적
                </span>
                <span className="text-xs text-charcoal/50">{sentQuotes?.length ?? 0}</span>
              </div>
              <div className="mt-3 flex flex-1 flex-col gap-2">
                {sentQuotes?.map((quote) => (
                  <div key={quote.id} className="rounded-sm border border-nude/40 p-3 text-sm">
                    <p className="font-medium text-charcoal">{quote.customers?.name ?? quote.title}</p>
                    <p className="mt-1 text-xs text-charcoal/50">
                      {quote.customers?.phone ?? "-"} · {formatWon(quote.amount)}
                    </p>
                    {canManage && (
                      <form action={promoteQuoteToWorkOrder.bind(null, quote.id)} className="mt-2">
                        <button
                          type="submit"
                          className="w-full rounded-sm bg-sky-100 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-200"
                        >
                          계약 진행 →
                        </button>
                      </form>
                    )}
                  </div>
                ))}
                {(!sentQuotes || sentQuotes.length === 0) && (
                  <p className="flex flex-1 items-center justify-center rounded-sm border border-dashed border-nude text-center text-xs text-charcoal/40">
                    발송된 견적 없음
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-8">
            <h2 className="flex items-center gap-1.5 font-serif text-lg font-semibold text-charcoal">
              <span className="h-2.5 w-2.5 rounded-full bg-orange-400" />
              진행중인 현장 · {inProgressOrders?.length ?? 0}
            </h2>

            <div className="mt-3 grid gap-4 lg:grid-cols-2">
              {inProgressOrders?.map((order) => {
                const risk = getWorkOrderRisk(order, todayDateString, finishEndByOrder.get(order.id));
                const totalPaid =
                  (order.payment_contract ?? 0) +
                  (order.payment_start ?? 0) +
                  (order.payment_interim1 ?? 0) +
                  (order.payment_interim2 ?? 0) +
                  (order.payment_balance ?? 0);
                const collectionRate =
                  order.contract_amount && order.contract_amount > 0
                    ? Math.min(100, Math.round((totalPaid / order.contract_amount) * 100))
                    : 0;
                const unpaid = order.contract_amount !== null ? order.contract_amount - totalPaid : null;
                const materialDday = order.material_order_date
                  ? daysBetweenDateStrings(todayDateString, order.material_order_date)
                  : null;
                const computedPeriod = periodByOrder.get(order.id);
                const periodStart = computedPeriod?.start ?? order.work_date;
                const periodEnd = computedPeriod?.end ?? order.work_end_date;
                const progressPercent = progressByOrder.get(order.id) ?? order.progress_percent;
                const isRecentlyUpdated = recentlyUpdatedOrders.has(order.id);
                const updatedAtLabel = finishTaskMetaByOrder.get(order.id)?.updatedAt.slice(5, 10).replace("-", "/");

                return (
                  <div key={order.id} className="rounded-sm border border-nude/60 bg-white p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        {canManage ? (
                          <InlineFieldInput
                            workOrderId={order.id}
                            field="title"
                            value={order.title}
                            className="w-full border-b border-transparent bg-transparent font-serif text-base font-semibold text-charcoal outline-none hover:border-nude focus:border-orange-400"
                          />
                        ) : (
                          <p className="font-serif text-base font-semibold text-charcoal">{order.title}</p>
                        )}
                        <div className="mt-1 flex items-center gap-1 text-xs text-charcoal/60">
                          {canManage ? (
                            <ClientNameInput
                              workOrderId={order.id}
                              clientName={order.client_name ?? order.customers?.name ?? ""}
                            />
                          ) : (
                            <span>{order.customers?.name ?? order.client_name ?? "고객 미지정"}</span>
                          )}
                          <span>· {order.customers?.phone ?? "-"}</span>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${RISK_STYLE[risk]}`}>
                          {RISK_LABEL[risk]}
                        </span>
                        {isRecentlyUpdated && (
                          <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-medium text-sky-700">
                            일정 업데이트됨 · {updatedAtLabel}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs text-charcoal/60">
                      <span>공정률</span>
                      <span className="font-medium text-charcoal">{progressPercent}%</span>
                    </div>
                    <div className="mt-1 h-2 w-full rounded-full bg-stone-100">
                      <div
                        className="h-2 rounded-full bg-sky-300"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    {progressByOrder.has(order.id) && (
                      <p className="mt-0.5 text-right text-[10px] text-charcoal/40">
                        완료 공정 ÷ 전체 공정 기준 자동 계산
                      </p>
                    )}

                    <div className="mt-3 flex items-center justify-between text-xs text-charcoal/60">
                      <span>수금률</span>
                      <span className="font-medium text-charcoal">{collectionRate}%</span>
                    </div>
                    <div className="mt-1 h-2 w-full rounded-full bg-stone-100">
                      <div className="h-2 rounded-full bg-red-300" style={{ width: `${collectionRate}%` }} />
                    </div>

                    <div className="mt-3 grid grid-cols-2 items-center gap-y-1 tracking-tight text-xs text-charcoal/60">
                      <span>계약금액</span>
                      {canManage ? (
                        <InlineFieldInput
                          workOrderId={order.id}
                          field="contract_amount"
                          type="number"
                          value={order.contract_amount?.toString() ?? ""}
                          placeholder="미입력"
                        />
                      ) : (
                        <span className="text-right text-charcoal">{formatWon(order.contract_amount)}</span>
                      )}

                      <span
                        className={
                          order.payment_contract_date
                            ? "flex items-center gap-1 font-medium text-red-500"
                            : undefined
                        }
                      >
                        1차 계약금{order.payment_contract_date && " ✓"}
                      </span>
                      <div className="flex items-center justify-end gap-6">
                        {canManage ? (
                          <InlineFieldInput
                            workOrderId={order.id}
                            field="payment_contract"
                            type="number"
                            value={order.payment_contract?.toString() ?? ""}
                            placeholder="미입력"
                            className={
                              order.payment_contract_date
                                ? "min-w-0 flex-1 border-b border-transparent bg-transparent text-right font-medium text-red-500 outline-none hover:border-nude focus:border-orange-400"
                                : "min-w-0 flex-1 border-b border-transparent bg-transparent text-right outline-none hover:border-nude focus:border-orange-400"
                            }
                          />
                        ) : (
                          <span
                            className={
                              order.payment_contract_date
                                ? "flex-1 text-right font-medium text-red-500"
                                : "flex-1 text-right text-charcoal"
                            }
                          >
                            {formatWon(order.payment_contract)}
                          </span>
                        )}
                        {canManage ? (
                          <InlineFieldInput
                            workOrderId={order.id}
                            field="payment_contract_date"
                            type="date"
                            value={order.payment_contract_date ?? ""}
                            className="w-[5.5rem] shrink-0 border-b border-transparent bg-transparent text-right text-[10px] text-charcoal/50 outline-none hover:border-nude focus:border-orange-400"
                          />
                        ) : (
                          <span className="w-[5.5rem] shrink-0 text-right text-[10px] text-charcoal/50">
                            {order.payment_contract_date ?? "-"}
                          </span>
                        )}
                      </div>

                      <span
                        className={
                          order.payment_start_date
                            ? "flex items-center gap-1 font-medium text-red-500"
                            : undefined
                        }
                      >
                        2차 착수금{order.payment_start_date && " ✓"}
                      </span>
                      <div className="flex items-center justify-end gap-6">
                        {canManage ? (
                          <InlineFieldInput
                            workOrderId={order.id}
                            field="payment_start"
                            type="number"
                            value={order.payment_start?.toString() ?? ""}
                            placeholder="미입력"
                            className={
                              order.payment_start_date
                                ? "min-w-0 flex-1 border-b border-transparent bg-transparent text-right font-medium text-red-500 outline-none hover:border-nude focus:border-orange-400"
                                : "min-w-0 flex-1 border-b border-transparent bg-transparent text-right outline-none hover:border-nude focus:border-orange-400"
                            }
                          />
                        ) : (
                          <span
                            className={
                              order.payment_start_date
                                ? "flex-1 text-right font-medium text-red-500"
                                : "flex-1 text-right text-charcoal"
                            }
                          >
                            {formatWon(order.payment_start)}
                          </span>
                        )}
                        {canManage ? (
                          <InlineFieldInput
                            workOrderId={order.id}
                            field="payment_start_date"
                            type="date"
                            value={order.payment_start_date ?? ""}
                            className="w-[5.5rem] shrink-0 border-b border-transparent bg-transparent text-right text-[10px] text-charcoal/50 outline-none hover:border-nude focus:border-orange-400"
                          />
                        ) : (
                          <span className="w-[5.5rem] shrink-0 text-right text-[10px] text-charcoal/50">
                            {order.payment_start_date ?? "-"}
                          </span>
                        )}
                      </div>

                      <span
                        className={
                          order.payment_interim1_date
                            ? "flex items-center gap-1 font-medium text-red-500"
                            : undefined
                        }
                      >
                        3차 중도금1차{order.payment_interim1_date && " ✓"}
                      </span>
                      <div className="flex items-center justify-end gap-6">
                        {canManage ? (
                          <InlineFieldInput
                            workOrderId={order.id}
                            field="payment_interim1"
                            type="number"
                            value={order.payment_interim1?.toString() ?? ""}
                            placeholder="미입력"
                            className={
                              order.payment_interim1_date
                                ? "min-w-0 flex-1 border-b border-transparent bg-transparent text-right font-medium text-red-500 outline-none hover:border-nude focus:border-orange-400"
                                : "min-w-0 flex-1 border-b border-transparent bg-transparent text-right outline-none hover:border-nude focus:border-orange-400"
                            }
                          />
                        ) : (
                          <span
                            className={
                              order.payment_interim1_date
                                ? "flex-1 text-right font-medium text-red-500"
                                : "flex-1 text-right text-charcoal"
                            }
                          >
                            {formatWon(order.payment_interim1)}
                          </span>
                        )}
                        {canManage ? (
                          <InlineFieldInput
                            workOrderId={order.id}
                            field="payment_interim1_date"
                            type="date"
                            value={order.payment_interim1_date ?? ""}
                            className="w-[5.5rem] shrink-0 border-b border-transparent bg-transparent text-right text-[10px] text-charcoal/50 outline-none hover:border-nude focus:border-orange-400"
                          />
                        ) : (
                          <span className="w-[5.5rem] shrink-0 text-right text-[10px] text-charcoal/50">
                            {order.payment_interim1_date ?? "-"}
                          </span>
                        )}
                      </div>

                      <span
                        className={
                          order.payment_interim2_date
                            ? "flex items-center gap-1 font-medium text-red-500"
                            : undefined
                        }
                      >
                        4차 중도금2차{order.payment_interim2_date && " ✓"}
                      </span>
                      <div className="flex items-center justify-end gap-6">
                        {canManage ? (
                          <InlineFieldInput
                            workOrderId={order.id}
                            field="payment_interim2"
                            type="number"
                            value={order.payment_interim2?.toString() ?? ""}
                            placeholder="미입력"
                            className={
                              order.payment_interim2_date
                                ? "min-w-0 flex-1 border-b border-transparent bg-transparent text-right font-medium text-red-500 outline-none hover:border-nude focus:border-orange-400"
                                : "min-w-0 flex-1 border-b border-transparent bg-transparent text-right outline-none hover:border-nude focus:border-orange-400"
                            }
                          />
                        ) : (
                          <span
                            className={
                              order.payment_interim2_date
                                ? "flex-1 text-right font-medium text-red-500"
                                : "flex-1 text-right text-charcoal"
                            }
                          >
                            {formatWon(order.payment_interim2)}
                          </span>
                        )}
                        {canManage ? (
                          <InlineFieldInput
                            workOrderId={order.id}
                            field="payment_interim2_date"
                            type="date"
                            value={order.payment_interim2_date ?? ""}
                            className="w-[5.5rem] shrink-0 border-b border-transparent bg-transparent text-right text-[10px] text-charcoal/50 outline-none hover:border-nude focus:border-orange-400"
                          />
                        ) : (
                          <span className="w-[5.5rem] shrink-0 text-right text-[10px] text-charcoal/50">
                            {order.payment_interim2_date ?? "-"}
                          </span>
                        )}
                      </div>

                      <span
                        className={
                          order.payment_balance_date
                            ? "flex items-center gap-1 font-medium text-red-500"
                            : undefined
                        }
                      >
                        5차 잔금{order.payment_balance_date && " ✓"}
                      </span>
                      <div className="flex items-center justify-end gap-6">
                        {canManage ? (
                          <InlineFieldInput
                            workOrderId={order.id}
                            field="payment_balance"
                            type="number"
                            value={order.payment_balance?.toString() ?? ""}
                            placeholder="미입력"
                            className={
                              order.payment_balance_date
                                ? "min-w-0 flex-1 border-b border-transparent bg-transparent text-right font-medium text-red-500 outline-none hover:border-nude focus:border-orange-400"
                                : "min-w-0 flex-1 border-b border-transparent bg-transparent text-right outline-none hover:border-nude focus:border-orange-400"
                            }
                          />
                        ) : (
                          <span
                            className={
                              order.payment_balance_date
                                ? "flex-1 text-right font-medium text-red-500"
                                : "flex-1 text-right text-charcoal"
                            }
                          >
                            {formatWon(order.payment_balance)}
                          </span>
                        )}
                        {canManage ? (
                          <InlineFieldInput
                            workOrderId={order.id}
                            field="payment_balance_date"
                            type="date"
                            value={order.payment_balance_date ?? ""}
                            className="w-[5.5rem] shrink-0 border-b border-transparent bg-transparent text-right text-[10px] text-charcoal/50 outline-none hover:border-nude focus:border-orange-400"
                          />
                        ) : (
                          <span className="w-[5.5rem] shrink-0 text-right text-[10px] text-charcoal/50">
                            {order.payment_balance_date ?? "-"}
                          </span>
                        )}
                      </div>

                      <span className="font-medium text-charcoal/70">수금액 합계</span>
                      <span className="text-right font-medium text-charcoal">{formatWon(totalPaid)}</span>

                      <span>미수금</span>
                      <span className="text-right text-charcoal">{formatWon(unpaid)}</span>

                      <span>자재 발주</span>
                      {canManage ? (
                        <InlineFieldInput
                          workOrderId={order.id}
                          field="material_order_date"
                          type="date"
                          value={order.material_order_date ?? ""}
                        />
                      ) : (
                        <span className="text-right text-charcoal">
                          {order.material_order_date ?? "-"}
                          {materialDday !== null && (
                            <span className={materialDday < 0 ? "ml-1 text-red-600" : "ml-1 text-charcoal/50"}>
                              (D{materialDday >= 0 ? "-" : "+"}
                              {Math.abs(materialDday)})
                            </span>
                          )}
                        </span>
                      )}

                      <span>담당</span>
                      {canManage ? (
                        <div className="text-right">
                          <AssigneeSelect
                            workOrderId={order.id}
                            assigneeId={order.assignee_id}
                            employees={employees ?? []}
                          />
                        </div>
                      ) : (
                        <span className="text-right text-charcoal">{order.profiles?.full_name ?? "-"}</span>
                      )}

                      <span>공사기간</span>
                      {canManage ? (
                        <div className="flex items-center justify-end gap-1">
                          <InlineFieldInput
                            workOrderId={order.id}
                            field="work_date"
                            type="date"
                            value={periodStart ?? ""}
                            className="w-24 border-b border-transparent bg-transparent text-right text-[11px] outline-none hover:border-nude focus:border-orange-400"
                          />
                          <span>~</span>
                          <InlineFieldInput
                            workOrderId={order.id}
                            field="work_end_date"
                            type="date"
                            value={periodEnd ?? ""}
                            className="w-24 border-b border-transparent bg-transparent text-right text-[11px] outline-none hover:border-nude focus:border-orange-400"
                          />
                        </div>
                      ) : (
                        <span className="text-right text-charcoal">{formatPeriod(periodStart, periodEnd)}</span>
                      )}
                      {computedPeriod && (
                        <>
                          <span />
                          <span className="text-right text-[10px] text-charcoal/40">공정표 기준 자동 반영</span>
                        </>
                      )}
                    </div>

                    <div className="mt-3 flex gap-2">
                      <Link
                        href={`/admin/field-management/schedule?workOrderId=${order.id}`}
                        className="flex-1 rounded-sm border border-nude/60 py-1.5 text-center text-xs text-charcoal hover:border-orange-400"
                      >
                        공정표
                      </Link>
                      {canManage && (
                        <form action={updateWorkOrderStatus.bind(null, order.id, "completed")} className="flex-1">
                          <button
                            type="submit"
                            className="w-full rounded-sm border border-nude/60 py-1.5 text-xs text-charcoal hover:border-orange-400"
                          >
                            마감 처리
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                );
              })}
              {(!inProgressOrders || inProgressOrders.length === 0) && (
                <p className="rounded-sm border border-dashed border-nude p-8 text-center text-sm text-charcoal/40 lg:col-span-2">
                  진행중인 현장이 없습니다.
                </p>
              )}
            </div>
          </div>

          <div className="mt-8">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-lg font-semibold text-charcoal">
                마감된 현장 · {completedOrders?.length ?? 0}
              </h2>
              <div className="flex gap-1 text-xs">
                <Link
                  href="/admin/sites"
                  className={`rounded-full px-3 py-1 ${!sortOldest ? "bg-charcoal text-cream" : "border border-nude text-charcoal"}`}
                >
                  최신순
                </Link>
                <Link
                  href="/admin/sites?sort=oldest"
                  className={`rounded-full px-3 py-1 ${sortOldest ? "bg-charcoal text-cream" : "border border-nude text-charcoal"}`}
                >
                  오래된순
                </Link>
              </div>
            </div>

            <div className="mt-3 overflow-x-auto rounded-sm border border-nude/60 bg-white">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-nude/60 text-xs tracking-wide text-charcoal/60">
                  <tr>
                    <th className="px-4 py-3">현장</th>
                    <th className="px-4 py-3">고객</th>
                    <th className="px-4 py-3">연락처</th>
                    <th className="px-4 py-3">계약금액</th>
                    <th className="px-4 py-3">공사기간</th>
                    <th className="px-4 py-3">담당</th>
                    <th className="px-4 py-3">A/S</th>
                    {canManage && <th className="px-4 py-3">상태</th>}
                  </tr>
                </thead>
                <tbody>
                  {completedOrders?.map((order) => (
                    <tr key={order.id} className="border-b border-nude/30 last:border-0">
                      <td className="px-4 py-3">
                        <Link href={`/admin/work-orders/${order.id}`} className="hover:text-orange-600">
                          {order.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-charcoal/70">
                        {order.customers?.name ?? order.client_name ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-charcoal/70">{order.customers?.phone ?? "-"}</td>
                      <td className="px-4 py-3 text-charcoal/70">{formatWon(order.contract_amount)}</td>
                      <td className="px-4 py-3 text-charcoal/70">
                        {formatPeriod(order.work_date, order.work_end_date)}
                      </td>
                      <td className="px-4 py-3 text-charcoal/70">{order.profiles?.full_name ?? "-"}</td>
                      <td className="px-4 py-3 text-charcoal/70">
                        {order.customer_id ? (asCountByCustomer.get(order.customer_id) ?? 0) : 0}건
                      </td>
                      {canManage && (
                        <td className="px-4 py-3">
                          <SiteStatusSelect id={order.id} status={order.status} />
                        </td>
                      )}
                    </tr>
                  ))}
                  {(!completedOrders || completedOrders.length === 0) && (
                    <tr>
                      <td colSpan={canManage ? 8 : 7} className="px-4 py-6 text-center text-charcoal/50">
                        마감된 현장이 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
