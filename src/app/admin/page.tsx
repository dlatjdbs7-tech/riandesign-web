import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import type { Inquiry, WorkOrder } from "@/lib/types";
import { getKSTDateBounds } from "@/lib/date";

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const { startOfDay, endOfDay, startOfMonth } = getKSTDateBounds();

  const [
    { count: employeeCount },
    { count: todayAttendanceCount },
    { count: activeWorkOrderCount },
    { count: newInquiryCount },
    { data: monthTransactions },
    { data: recentInquiries },
    { data: recentWorkOrders },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("status", "approved"),
    supabase
      .from("attendance_records")
      .select("*", { count: "exact", head: true })
      .gte("check_in_at", startOfDay)
      .lt("check_in_at", endOfDay),
    supabase
      .from("work_orders")
      .select("*", { count: "exact", head: true })
      .neq("status", "completed"),
    supabase.from("inquiries").select("*", { count: "exact", head: true }).eq("status", "new"),
    supabase
      .from("transactions")
      .select("amount")
      .eq("status", "paid")
      .gte("transaction_date", startOfMonth.slice(0, 10)),
    supabase
      .from("inquiries")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5)
      .returns<Inquiry[]>(),
    supabase
      .from("work_orders")
      .select("*")
      .in("status", ["pending", "in_progress"])
      .order("work_date", { ascending: true, nullsFirst: false })
      .limit(5)
      .returns<WorkOrder[]>(),
  ]);

  const monthRevenue = (monthTransactions ?? []).reduce((sum, t) => sum + (t.amount ?? 0), 0);

  const stats = [
    { label: "승인된 직원", value: `${employeeCount ?? 0}명` },
    { label: "오늘 출근", value: `${todayAttendanceCount ?? 0}명` },
    { label: "진행중인 작업지시서", value: `${activeWorkOrderCount ?? 0}건` },
    { label: "신규 문의", value: `${newInquiryCount ?? 0}건` },
    { label: "이번 달 매출", value: `${monthRevenue.toLocaleString()}원` },
  ];

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-charcoal">대시보드</h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-sm border border-nude/60 bg-white p-5">
            <p className="text-xs tracking-wide text-charcoal/60">{stat.label}</p>
            <p className="mt-2 font-serif text-2xl text-charcoal">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-sm border border-nude/60 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg font-semibold text-charcoal">최근 문의</h2>
            <Link href="/admin/inquiries" className="text-xs text-taupe hover:text-gold">
              전체 보기
            </Link>
          </div>
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            {recentInquiries?.map((inquiry) => (
              <li key={inquiry.id} className="border-b border-nude/30 pb-2 last:border-0">
                <span className="font-medium text-charcoal">{inquiry.name}</span>
                <span className="ml-2 text-charcoal/60">{inquiry.phone}</span>
              </li>
            ))}
            {(!recentInquiries || recentInquiries.length === 0) && (
              <li className="text-charcoal/50">접수된 문의가 없습니다.</li>
            )}
          </ul>
        </section>

        <section className="rounded-sm border border-nude/60 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg font-semibold text-charcoal">진행중인 작업</h2>
            <Link href="/admin/work-orders" className="text-xs text-taupe hover:text-gold">
              전체 보기
            </Link>
          </div>
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            {recentWorkOrders?.map((order) => (
              <li key={order.id} className="border-b border-nude/30 pb-2 last:border-0">
                <Link href={`/admin/work-orders/${order.id}`} className="font-medium text-charcoal hover:text-gold">
                  {order.title}
                </Link>
                <span className="ml-2 text-charcoal/60">{order.work_date ?? "일정 미정"}</span>
              </li>
            ))}
            {(!recentWorkOrders || recentWorkOrders.length === 0) && (
              <li className="text-charcoal/50">진행중인 작업지시서가 없습니다.</li>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
