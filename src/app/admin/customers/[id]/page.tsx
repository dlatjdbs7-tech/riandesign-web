import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import type { AsRequest, Customer, Quote, Transaction, WorkOrder } from "@/lib/types";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: customer } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .single<Customer>();

  if (!customer) notFound();

  const [{ data: quotes }, { data: transactions }, { data: asRequests }, { data: workOrders }] =
    await Promise.all([
      supabase
        .from("quotes")
        .select("*")
        .eq("customer_id", id)
        .order("quote_date", { ascending: false })
        .returns<Quote[]>(),
      supabase
        .from("transactions")
        .select("*")
        .eq("customer_id", id)
        .order("transaction_date", { ascending: false })
        .returns<Transaction[]>(),
      supabase
        .from("as_requests")
        .select("*")
        .eq("customer_id", id)
        .order("request_date", { ascending: false })
        .returns<AsRequest[]>(),
      supabase
        .from("work_orders")
        .select("*")
        .eq("customer_id", id)
        .order("work_date", { ascending: false })
        .returns<WorkOrder[]>(),
    ]);

  return (
    <div>
      <Link href="/admin/customers" className="text-xs text-charcoal/50 hover:text-gold">
        ← 고객 목록
      </Link>

      <h1 className="mt-2 font-serif text-2xl font-semibold text-charcoal">{customer.name}</h1>
      <p className="mt-2 text-sm text-charcoal/60">
        {customer.phone ?? "-"} {customer.email ? `· ${customer.email}` : ""}
      </p>
      {customer.address && <p className="text-sm text-charcoal/60">{customer.address}</p>}
      {customer.memo && (
        <p className="mt-3 whitespace-pre-line rounded-sm border border-nude/60 bg-white p-4 text-sm text-charcoal/80">
          {customer.memo}
        </p>
      )}

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <section>
          <h2 className="font-serif text-lg font-semibold text-charcoal">작업지시서</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {workOrders?.map((w) => (
              <li key={w.id} className="rounded-sm border border-nude/60 bg-white p-3 text-sm">
                <Link href={`/admin/work-orders/${w.id}`} className="hover:text-gold">
                  {w.title}
                </Link>
                <span className="ml-2 text-xs text-charcoal/50">{w.work_date ?? "-"}</span>
              </li>
            ))}
            {(!workOrders || workOrders.length === 0) && (
              <li className="text-sm text-charcoal/50">없음</li>
            )}
          </ul>
        </section>

        <section>
          <h2 className="font-serif text-lg font-semibold text-charcoal">견적서</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {quotes?.map((q) => (
              <li key={q.id} className="rounded-sm border border-nude/60 bg-white p-3 text-sm">
                {q.title}
                <span className="ml-2 text-xs text-charcoal/50">
                  {q.amount ? `${q.amount.toLocaleString()}원` : ""} · {q.quote_date}
                </span>
              </li>
            ))}
            {(!quotes || quotes.length === 0) && <li className="text-sm text-charcoal/50">없음</li>}
          </ul>
        </section>

        <section>
          <h2 className="font-serif text-lg font-semibold text-charcoal">거래명세서</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {transactions?.map((t) => (
              <li key={t.id} className="rounded-sm border border-nude/60 bg-white p-3 text-sm">
                {t.title}
                <span className="ml-2 text-xs text-charcoal/50">
                  {t.amount.toLocaleString()}원 · {t.transaction_date}
                </span>
              </li>
            ))}
            {(!transactions || transactions.length === 0) && (
              <li className="text-sm text-charcoal/50">없음</li>
            )}
          </ul>
        </section>

        <section>
          <h2 className="font-serif text-lg font-semibold text-charcoal">AS 내역</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {asRequests?.map((a) => (
              <li key={a.id} className="rounded-sm border border-nude/60 bg-white p-3 text-sm">
                {a.title}
                <span className="ml-2 text-xs text-charcoal/50">{a.request_date}</span>
              </li>
            ))}
            {(!asRequests || asRequests.length === 0) && (
              <li className="text-sm text-charcoal/50">없음</li>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
