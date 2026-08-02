import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import type { Profile, WorkOrder } from "@/lib/types";
import { createWorkOrder } from "./actions";

const STATUS_LABEL: Record<WorkOrder["status"], string> = {
  pending: "대기",
  in_progress: "진행중",
  completed: "완료",
};

type WorkOrderRow = WorkOrder & { profiles: Pick<Profile, "full_name"> | null };

export default async function WorkOrdersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: me } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single<Profile>();

  const canCreate = me?.role === "owner" || me?.role === "manager";

  const { data: orders } = await supabase
    .from("work_orders")
    .select("*, profiles!work_orders_assignee_id_fkey(full_name)")
    .order("work_date", { ascending: false, nullsFirst: false })
    .returns<WorkOrderRow[]>();

  const { data: employees } = canCreate
    ? await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("status", "approved")
        .order("full_name")
        .returns<Pick<Profile, "id" | "full_name">[]>()
    : { data: null };

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-charcoal">작업지시서</h1>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="overflow-x-auto rounded-sm border border-nude/60 bg-white">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-nude/60 text-xs tracking-wide text-charcoal/60">
              <tr>
                <th className="px-4 py-3">제목</th>
                <th className="px-4 py-3">고객/현장</th>
                <th className="px-4 py-3">작업일</th>
                <th className="px-4 py-3">담당자</th>
                <th className="px-4 py-3">상태</th>
              </tr>
            </thead>
            <tbody>
              {orders?.map((order) => (
                <tr key={order.id} className="border-b border-nude/30 last:border-0">
                  <td className="px-4 py-3">
                    <Link href={`/admin/work-orders/${order.id}`} className="hover:text-gold">
                      {order.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-charcoal/70">
                    {order.client_name ?? "-"}
                    {order.site_address ? ` · ${order.site_address}` : ""}
                  </td>
                  <td className="px-4 py-3 text-charcoal/70">{order.work_date ?? "-"}</td>
                  <td className="px-4 py-3 text-charcoal/70">{order.profiles?.full_name ?? "-"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        order.status === "completed"
                          ? "text-emerald-700"
                          : order.status === "in_progress"
                            ? "text-gold"
                            : "text-charcoal/60"
                      }
                    >
                      {STATUS_LABEL[order.status]}
                    </span>
                  </td>
                </tr>
              ))}
              {(!orders || orders.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-charcoal/50">
                    등록된 작업지시서가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {canCreate && (
          <form
            action={createWorkOrder}
            className="flex h-fit flex-col gap-4 rounded-sm border border-nude/60 bg-white p-6"
          >
            <div className="flex flex-col gap-2">
              <label htmlFor="title" className="text-xs tracking-wide text-charcoal/70">
                제목
              </label>
              <input
                id="title"
                name="title"
                type="text"
                required
                className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-gold"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="client_name" className="text-xs tracking-wide text-charcoal/70">
                고객명
              </label>
              <input
                id="client_name"
                name="client_name"
                type="text"
                className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-gold"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="site_address" className="text-xs tracking-wide text-charcoal/70">
                현장 주소
              </label>
              <input
                id="site_address"
                name="site_address"
                type="text"
                className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-gold"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="work_date" className="text-xs tracking-wide text-charcoal/70">
                작업일
              </label>
              <input
                id="work_date"
                name="work_date"
                type="date"
                className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-gold"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="assignee_id" className="text-xs tracking-wide text-charcoal/70">
                담당자
              </label>
              <select
                id="assignee_id"
                name="assignee_id"
                className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-gold"
              >
                <option value="">선택 안 함</option>
                {employees?.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="description" className="text-xs tracking-wide text-charcoal/70">
                작업 내용
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                className="resize-none border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-gold"
              />
            </div>

            <button
              type="submit"
              className="mt-2 self-start rounded-full bg-charcoal px-6 py-2 text-sm tracking-wide text-cream hover:bg-gold"
            >
              작업지시서 등록
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
