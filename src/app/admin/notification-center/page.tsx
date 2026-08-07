import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import type { AsRequest, Inquiry, Profile, Todo, WorkOrder } from "@/lib/types";
import { getKSTDateBounds } from "@/lib/date";
import { getWorkOrderRisk } from "@/lib/risk";

function ActionCard({
  title,
  href,
  children,
}: {
  title: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-sm border border-nude/60 bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-lg font-semibold text-charcoal">{title}</h2>
        <Link href={href} className="text-xs text-taupe hover:text-gold">
          이동 →
        </Link>
      </div>
      <div className="mt-3 flex flex-col gap-2 text-sm">{children}</div>
    </section>
  );
}

export default async function NotificationCenterPage() {
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
    { data: pendingEmployees },
    { data: inProgressOrders },
    { data: openAsRequests },
    { data: myTodos },
  ] = await Promise.all([
    canManage
      ? supabase
          .from("inquiries")
          .select("*")
          .eq("status", "new")
          .order("created_at", { ascending: false })
          .returns<Inquiry[]>()
      : Promise.resolve({ data: null }),
    me?.role === "owner"
      ? supabase
          .from("profiles")
          .select("*")
          .eq("status", "pending")
          .returns<Profile[]>()
      : Promise.resolve({ data: null }),
    supabase.from("work_orders").select("*").eq("status", "in_progress").returns<WorkOrder[]>(),
    supabase.from("as_requests").select("*").neq("status", "completed").returns<AsRequest[]>(),
    supabase
      .from("todos")
      .select("*")
      .neq("status", "done")
      .or(`assignee_id.eq.${user!.id},created_by.eq.${user!.id}`)
      .order("due_date", { ascending: true, nullsFirst: false })
      .returns<Todo[]>(),
  ]);

  const riskOrders = (inProgressOrders ?? []).filter(
    (order) => getWorkOrderRisk(order, todayDateString) === "danger"
  );

  const overdueTodos = (myTodos ?? []).filter(
    (todo) => todo.due_date && todo.due_date < todayDateString
  );

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-charcoal">알림센터</h1>
      <p className="mt-2 text-sm text-charcoal/60">지금 확인하거나 처리하면 좋은 항목들을 모았습니다.</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {canManage && (
          <ActionCard title={`신규 상담문의 · ${newInquiries?.length ?? 0}`} href="/admin/inquiries">
            {newInquiries?.slice(0, 5).map((inquiry) => (
              <div key={inquiry.id} className="flex justify-between border-b border-nude/30 pb-2 last:border-0">
                <span>{inquiry.name}</span>
                <span className="text-charcoal/60">{inquiry.phone}</span>
              </div>
            ))}
            {(!newInquiries || newInquiries.length === 0) && (
              <p className="text-charcoal/50">신규 문의가 없습니다.</p>
            )}
          </ActionCard>
        )}

        {me?.role === "owner" && (
          <ActionCard title={`승인 대기 직원 · ${pendingEmployees?.length ?? 0}`} href="/admin/employees">
            {pendingEmployees?.slice(0, 5).map((employee) => (
              <div key={employee.id} className="flex justify-between border-b border-nude/30 pb-2 last:border-0">
                <span>{employee.full_name}</span>
                <span className="text-charcoal/60">{employee.department ?? "-"}</span>
              </div>
            ))}
            {(!pendingEmployees || pendingEmployees.length === 0) && (
              <p className="text-charcoal/50">승인 대기 중인 직원이 없습니다.</p>
            )}
          </ActionCard>
        )}

        <ActionCard title={`위험 단계 작업지시서 · ${riskOrders.length}`} href="/admin/work-orders">
          {riskOrders.slice(0, 5).map((order) => (
            <div key={order.id} className="flex justify-between border-b border-nude/30 pb-2 last:border-0">
              <Link href={`/admin/work-orders/${order.id}`} className="hover:text-gold">
                {order.title}
              </Link>
              <span className="text-red-700">작업일 초과</span>
            </div>
          ))}
          {riskOrders.length === 0 && <p className="text-charcoal/50">위험 단계인 작업지시서가 없습니다.</p>}
        </ActionCard>

        <ActionCard title={`미완료 AS · ${openAsRequests?.length ?? 0}`} href="/admin/as-requests">
          {openAsRequests?.slice(0, 5).map((request) => (
            <div key={request.id} className="flex justify-between border-b border-nude/30 pb-2 last:border-0">
              <span>{request.title}</span>
              <span className="text-charcoal/60">{request.request_date}</span>
            </div>
          ))}
          {(!openAsRequests || openAsRequests.length === 0) && (
            <p className="text-charcoal/50">미완료 AS 건이 없습니다.</p>
          )}
        </ActionCard>

        <ActionCard title={`기한 지난 내 할일 · ${overdueTodos.length}`} href="/admin/todos">
          {overdueTodos.slice(0, 5).map((todo) => (
            <div key={todo.id} className="flex justify-between border-b border-nude/30 pb-2 last:border-0">
              <span>{todo.title}</span>
              <span className="text-red-700">{todo.due_date}</span>
            </div>
          ))}
          {overdueTodos.length === 0 && <p className="text-charcoal/50">기한이 지난 할일이 없습니다.</p>}
        </ActionCard>
      </div>
    </div>
  );
}
