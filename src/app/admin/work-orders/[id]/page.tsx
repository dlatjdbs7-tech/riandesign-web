import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import type { Profile, WorkLog, WorkOrder } from "@/lib/types";
import { formatKST } from "@/lib/date";
import AssigneeSelect from "@/components/admin/AssigneeSelect";
import {
  addWorkLog,
  deleteWorkOrder,
  updateWorkOrderProgress,
  updateWorkOrderStatus,
} from "../actions";

const STATUS_OPTIONS: { value: WorkOrder["status"]; label: string }[] = [
  { value: "pending", label: "대기" },
  { value: "in_progress", label: "진행중" },
  { value: "completed", label: "완료" },
];

type WorkOrderDetail = WorkOrder & { profiles: Pick<Profile, "full_name"> | null };
type WorkLogRow = WorkLog & { profiles: Pick<Profile, "full_name"> | null };

export default async function WorkOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: me } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single<Profile>();

  const { data: order } = await supabase
    .from("work_orders")
    .select("*, profiles!work_orders_assignee_id_fkey(full_name)")
    .eq("id", id)
    .single<WorkOrderDetail>();

  if (!order) notFound();

  const { data: logs } = await supabase
    .from("work_logs")
    .select("*, profiles(full_name)")
    .eq("work_order_id", id)
    .order("log_date", { ascending: false })
    .returns<WorkLogRow[]>();

  const canManage = me?.role === "owner" || me?.role === "manager";
  const canUpdate = canManage || order.assignee_id === user!.id;

  const { data: employees } = canManage
    ? await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("status", "approved")
        .order("full_name")
        .returns<Pick<Profile, "id" | "full_name">[]>()
    : { data: null };

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-charcoal">{order.title}</h1>
          <p className="mt-2 text-sm text-charcoal/60">
            {order.client_name ?? "-"} {order.site_address ? `· ${order.site_address}` : ""}
          </p>
          <div className="mt-1 flex items-center gap-1 text-sm text-charcoal/60">
            <span>작업일 {order.work_date ?? "-"} · 담당자</span>
            {canManage ? (
              <AssigneeSelect
                workOrderId={order.id}
                assigneeId={order.assignee_id}
                employees={employees ?? []}
              />
            ) : (
              <span>{order.profiles?.full_name ?? "-"}</span>
            )}
          </div>
        </div>
        {canManage && (
          <form action={deleteWorkOrder.bind(null, order.id)}>
            <button type="submit" className="text-xs text-red-700 underline hover:no-underline">
              삭제
            </button>
          </form>
        )}
      </div>

      {order.description && (
        <p className="mt-4 whitespace-pre-line rounded-sm border border-nude/60 bg-white p-4 text-sm text-charcoal/80">
          {order.description}
        </p>
      )}

      {canUpdate && (
        <div className="mt-4 flex gap-2">
          {STATUS_OPTIONS.map((option) => (
            <form key={option.value} action={updateWorkOrderStatus.bind(null, order.id, option.value)}>
              <button
                type="submit"
                className={`rounded-full border px-4 py-1.5 text-xs ${
                  order.status === option.value
                    ? "border-charcoal bg-charcoal text-cream"
                    : "border-charcoal/30 text-charcoal hover:border-charcoal"
                }`}
              >
                {option.label}
              </button>
            </form>
          ))}
        </div>
      )}

      {canUpdate && (
        <form
          action={updateWorkOrderProgress.bind(null, order.id)}
          className="mt-4 flex items-center gap-3"
        >
          <label htmlFor="progress_percent" className="text-xs tracking-wide text-charcoal/60">
            공정률
          </label>
          <input
            id="progress_percent"
            name="progress_percent"
            type="number"
            min={0}
            max={100}
            defaultValue={order.progress_percent}
            className="w-20 border-b border-nude bg-transparent py-1 text-sm outline-none focus:border-gold"
          />
          <span className="text-xs text-charcoal/60">%</span>
          <button
            type="submit"
            className="rounded-full border border-charcoal/30 px-4 py-1 text-xs text-charcoal hover:border-charcoal"
          >
            저장
          </button>
        </form>
      )}

      <div className="mt-10">
        <h2 className="font-serif text-lg font-semibold text-charcoal">진행 일지</h2>

        <form
          action={addWorkLog.bind(null, order.id)}
          className="mt-4 flex flex-col gap-3 rounded-sm border border-nude/60 bg-white p-4"
        >
          <input
            name="log_date"
            type="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="w-40 border-b border-nude bg-transparent py-1 text-sm outline-none focus:border-gold"
          />
          <textarea
            name="content"
            rows={3}
            required
            placeholder="오늘 진행한 작업 내용을 기록하세요."
            className="resize-none border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-gold"
          />
          <button
            type="submit"
            className="self-start rounded-full bg-charcoal px-5 py-2 text-xs tracking-wide text-cream hover:bg-gold"
          >
            일지 추가
          </button>
        </form>

        <div className="mt-4 flex flex-col gap-3">
          {logs?.map((log) => (
            <div key={log.id} className="rounded-sm border border-nude/60 bg-white p-4 text-sm">
              <div className="flex justify-between text-xs text-charcoal/50">
                <span>{log.profiles?.full_name ?? "-"}</span>
                <span>{formatKST(log.created_at)}</span>
              </div>
              <p className="mt-2 whitespace-pre-line text-charcoal/80">{log.content}</p>
            </div>
          ))}
          {(!logs || logs.length === 0) && (
            <p className="text-sm text-charcoal/50">아직 등록된 일지가 없습니다.</p>
          )}
        </div>
      </div>
    </div>
  );
}
