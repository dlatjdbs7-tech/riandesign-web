import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import type { Customer, Profile, WorkOrder } from "@/lib/types";

type WorkOrderRow = WorkOrder & {
  customers: Pick<Customer, "name"> | null;
  profiles: Pick<Profile, "full_name"> | null;
};

const COLUMNS: { status: WorkOrder["status"]; label: string; accent: string }[] = [
  { status: "pending", label: "대기", accent: "border-charcoal/20" },
  { status: "in_progress", label: "진행중", accent: "border-orange-400" },
  { status: "completed", label: "완료", accent: "border-emerald-600" },
];

const CELLS = [
  { href: "/admin/field-management/schedule", label: "공정표" },
  { href: "/admin/work-directives", label: "작업지시서" },
  { href: "/admin/quotes", label: "견적서" },
  { href: "/admin/transactions", label: "거래명세서" },
  { href: "/admin/field-management/purchase-orders", label: "발주서" },
  { href: "/admin/field-management/vendors", label: "협력업체" },
  { href: "/admin/field-management/quick-links", label: "자주쓰는URL" },
];

export default async function FieldManagementPage() {
  const supabase = await createClient();
  const { data: orders } = await supabase
    .from("work_orders")
    .select("*, customers(name), profiles!work_orders_assignee_id_fkey(full_name)")
    .order("work_date", { ascending: true, nullsFirst: false })
    .returns<WorkOrderRow[]>();

  const { count: pendingDirectiveCount } = await supabase
    .from("work_directives")
    .select("id", { count: "exact", head: true })
    .neq("status", "completed");

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-charcoal">시공관리</h1>
      <p className="mt-2 text-sm text-charcoal/60">
        진행 단계별로 모든 현장을 한눈에 봅니다. 카드를 누르면 상세로 이동합니다.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {CELLS.map((cell) => {
          const badge = cell.label === "작업지시서" ? (pendingDirectiveCount ?? 0) : 0;
          return (
            <Link
              key={cell.href}
              href={cell.href}
              className="relative flex items-center justify-center rounded-sm border border-nude/60 bg-white p-4 text-center transition-colors hover:border-orange-400 hover:bg-orange-50"
            >
              <p className="font-serif text-sm font-semibold text-charcoal">{cell.label}</p>
              {badge > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-orange-500 px-1 text-[11px] font-bold text-white">
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        {COLUMNS.map((column) => {
          const items = orders?.filter((o) => o.status === column.status) ?? [];
          return (
            <div key={column.status} className={`rounded-sm border-t-4 ${column.accent} bg-stone-100 p-3`}>
              <div className="flex items-center justify-between px-1">
                <h2 className="font-serif text-sm font-semibold text-charcoal">{column.label}</h2>
                <span className="text-xs text-charcoal/50">{items.length}</span>
              </div>

              <div className="mt-3 flex flex-col gap-2">
                {items.map((order) => (
                  <Link
                    key={order.id}
                    href={`/admin/work-orders/${order.id}`}
                    className="block rounded-sm border border-nude/60 bg-white p-3 text-sm hover:border-orange-400"
                  >
                    <p className="font-medium text-charcoal">{order.title}</p>
                    <p className="mt-1 text-xs text-charcoal/60">
                      {order.customers?.name ?? order.client_name ?? "고객 미지정"}
                    </p>
                    <div className="mt-2 flex items-center justify-between text-xs text-charcoal/50">
                      <span>{order.work_date ?? "일정 미정"}</span>
                      <span>{order.profiles?.full_name ?? "담당자 미지정"}</span>
                    </div>
                    {column.status === "in_progress" && (
                      <div className="mt-2 h-1.5 w-full rounded-full bg-stone-100">
                        <div
                          className="h-1.5 rounded-full bg-orange-400"
                          style={{ width: `${order.progress_percent}%` }}
                        />
                      </div>
                    )}
                  </Link>
                ))}
                {items.length === 0 && (
                  <p className="rounded-sm border border-dashed border-nude p-4 text-center text-xs text-charcoal/40">
                    없음
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
