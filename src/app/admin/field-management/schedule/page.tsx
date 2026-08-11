import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import type { Customer, WorkOrder, WorkOrderTask } from "@/lib/types";
import { getKSTDateBounds } from "@/lib/date";
import { getTaskDisplayStatus } from "@/lib/taskStatus";
import WorkOrderTaskRow from "@/components/admin/WorkOrderTaskRow";
import ClientNameInput from "@/components/admin/ClientNameInput";
import ScheduleGantt from "@/components/admin/ScheduleGantt";
import { createWorkOrderTask } from "./actions";

type WorkOrderRow = Pick<WorkOrder, "id" | "title" | "status" | "work_date" | "client_name"> & {
  customers: Pick<Customer, "name"> | null;
};

export default async function WorkOrderSchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ workOrderId?: string; all?: string }>;
}) {
  const params = await searchParams;
  const showAll = params.all === "1";
  const { todayDateString } = getKSTDateBounds();

  const supabase = await createClient();

  let query = supabase
    .from("work_orders")
    .select("id, title, status, work_date, client_name, customers(name)")
    .order("work_date", { ascending: true, nullsFirst: false });

  if (!showAll) {
    query = query.neq("status", "completed");
  }

  const { data: workOrders } = await query.returns<WorkOrderRow[]>();

  const selectedId = params.workOrderId ?? workOrders?.[0]?.id ?? null;
  const selectedOrder = workOrders?.find((o) => o.id === selectedId) ?? null;

  const { data: tasks } = selectedId
    ? await supabase
        .from("work_order_tasks")
        .select("*")
        .eq("work_order_id", selectedId)
        .order("display_order", { ascending: true })
        .returns<WorkOrderTask[]>()
    : { data: null };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-charcoal">공정표</h1>
          <p className="mt-2 text-sm text-charcoal/60">
            현장별 공정을 등록하고 진행 상태를 관리합니다. 아래 탭을 눌러 현장을 전환하세요.
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <Link href="/admin/field-management" className="text-taupe hover:text-orange-600">
            ← 시공관리
          </Link>
          <Link
            href={showAll ? "/admin/field-management/schedule" : "/admin/field-management/schedule?all=1"}
            className="text-taupe hover:text-orange-600"
          >
            {showAll ? "진행중 현장만 보기" : "완료 현장 포함 보기"}
          </Link>
        </div>
      </div>

      {!selectedOrder ? (
        <p className="mt-8 rounded-sm border border-dashed border-nude p-8 text-center text-sm text-charcoal/40">
          등록된 현장이 없습니다.
        </p>
      ) : (
        <>
          <div className="mt-6 rounded-t-sm border border-b-0 border-nude/60 bg-white p-5">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center font-serif text-lg font-semibold text-charcoal">
                {selectedOrder.title}
                <span className="ml-2 flex items-center gap-1 text-xs font-normal text-charcoal/50">
                  <ClientNameInput
                    workOrderId={selectedOrder.id}
                    clientName={selectedOrder.client_name ?? selectedOrder.customers?.name ?? ""}
                  />
                  · {selectedOrder.work_date ?? "일정 미정"}
                </span>
              </h2>
              <Link
                href={`/admin/work-orders/${selectedOrder.id}`}
                className="text-xs text-taupe hover:text-orange-600"
              >
                작업지시서 상세 →
              </Link>
            </div>

            <div className="mt-4">
              <ScheduleGantt tasks={tasks ?? []} todayDateString={todayDateString} />
            </div>

            <table className="mt-4 w-full text-left">
              <thead>
                <tr className="border-b border-nude/60 text-[10px] tracking-wide text-charcoal/50">
                  <th className="w-8 pb-2 font-normal"></th>
                  <th className="pb-2 font-normal">공정</th>
                  <th className="pb-2 font-normal">시작일</th>
                  <th className="pb-2 font-normal">종료일</th>
                  <th className="pb-2 font-normal">상태</th>
                  <th className="pb-2 font-normal"></th>
                </tr>
              </thead>
              <tbody>
                {tasks?.map((task, index) => (
                  <WorkOrderTaskRow
                    key={task.id}
                    id={task.id}
                    workOrderId={selectedOrder.id}
                    title={task.title}
                    startDate={task.start_date}
                    endDate={task.end_date}
                    status={getTaskDisplayStatus(task, todayDateString)}
                    autoStatus={task.auto_status}
                    isFirst={index === 0}
                    isLast={index === (tasks?.length ?? 1) - 1}
                  />
                ))}
              </tbody>
            </table>
            {(!tasks || tasks.length === 0) && (
              <p className="mt-4 text-sm text-charcoal/40">등록된 공정이 없습니다.</p>
            )}

            <form
              action={createWorkOrderTask}
              className="mt-5 flex flex-wrap items-end gap-2 border-t border-nude/40 pt-4"
            >
              <input type="hidden" name="work_order_id" value={selectedOrder.id} />
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-charcoal/50">공정명</label>
                <input
                  name="title"
                  required
                  placeholder="예: 철거"
                  className="w-40 border-b border-nude bg-transparent py-1 text-sm outline-none focus:border-orange-400"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-charcoal/50">시작일</label>
                <input
                  type="date"
                  name="start_date"
                  className="border-b border-nude bg-transparent py-1 text-sm outline-none focus:border-orange-400"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-charcoal/50">종료일</label>
                <input
                  type="date"
                  name="end_date"
                  className="border-b border-nude bg-transparent py-1 text-sm outline-none focus:border-orange-400"
                />
              </div>
              <button
                type="submit"
                className="rounded-sm bg-orange-300 px-4 py-1.5 text-xs font-medium text-orange-900 hover:bg-orange-400"
              >
                공정 추가
              </button>
            </form>
          </div>

          <div className="flex gap-1 overflow-x-auto rounded-b-sm border border-t-0 border-nude/60 bg-stone-100 px-2 py-1.5">
            {workOrders?.map((order) => (
              <Link
                key={order.id}
                href={`/admin/field-management/schedule?workOrderId=${order.id}${showAll ? "&all=1" : ""}`}
                className={`shrink-0 rounded-t-sm border-t-2 px-3 py-1.5 text-xs whitespace-nowrap transition-colors ${
                  order.id === selectedOrder.id
                    ? "border-orange-400 bg-white font-medium text-orange-700 shadow-sm"
                    : "border-transparent text-charcoal/50 hover:bg-orange-100 hover:text-orange-700"
                }`}
              >
                {order.title}
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
