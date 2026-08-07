import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import type { Inquiry, Profile } from "@/lib/types";

function monthKey(year: number, monthIndex0: number) {
  return `${year}-${String(monthIndex0 + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [, m] = key.split("-");
  return `${Number(m)}월`;
}

const STATUS_LABEL: Record<Inquiry["status"], string> = {
  new: "신규",
  contacted: "연락완료",
  closed: "종결",
};

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single<Profile>();

  if (me?.role !== "owner" && me?.role !== "manager") {
    redirect("/admin");
  }

  const { data: inquiries } = await supabase
    .from("inquiries")
    .select("*")
    .order("created_at", { ascending: true })
    .returns<Inquiry[]>();

  const { data: quotes } = await supabase
    .from("quotes")
    .select("status")
    .returns<{ status: string }[]>();

  const now = new Date();
  const months: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(monthKey(d.getFullYear(), d.getMonth()));
  }

  const countsByMonth = new Map<string, number>(months.map((m) => [m, 0]));
  (inquiries ?? []).forEach((inquiry) => {
    const key = inquiry.created_at.slice(0, 7);
    if (countsByMonth.has(key)) {
      countsByMonth.set(key, (countsByMonth.get(key) ?? 0) + 1);
    }
  });
  const maxMonthCount = Math.max(1, ...Array.from(countsByMonth.values()));

  const statusCounts = { new: 0, contacted: 0, closed: 0 } as Record<Inquiry["status"], number>;
  (inquiries ?? []).forEach((inquiry) => {
    statusCounts[inquiry.status] += 1;
  });
  const totalInquiries = inquiries?.length ?? 0;

  const totalQuotes = quotes?.length ?? 0;
  const acceptedQuotes = quotes?.filter((q) => q.status === "accepted").length ?? 0;

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-charcoal">유입분석</h1>
      <p className="mt-2 text-sm text-charcoal/60">상담문의 유입 추이와 전환 현황입니다.</p>

      <div className="mt-6 rounded-sm border border-nude/60 bg-white p-5">
        <h2 className="font-serif text-lg font-semibold text-charcoal">최근 6개월 문의 추이</h2>
        <div className="mt-6 flex h-40 items-end gap-4">
          {months.map((m) => {
            const count = countsByMonth.get(m) ?? 0;
            const heightPct = (count / maxMonthCount) * 100;
            return (
              <div key={m} className="flex flex-1 flex-col items-center gap-2">
                <span className="text-xs text-charcoal/60">{count}</span>
                <div className="flex h-28 w-full items-end rounded-sm bg-beige">
                  <div
                    className="w-full rounded-sm bg-gold"
                    style={{ height: `${Math.max(count > 0 ? 6 : 0, heightPct)}%` }}
                  />
                </div>
                <span className="text-xs text-charcoal/50">{monthLabel(m)}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div className="rounded-sm border border-nude/60 bg-white p-5">
          <h2 className="font-serif text-lg font-semibold text-charcoal">문의 상태별 분포</h2>
          <div className="mt-4 flex flex-col gap-3">
            {(Object.keys(STATUS_LABEL) as Inquiry["status"][]).map((status) => {
              const count = statusCounts[status];
              const pct = totalInquiries > 0 ? Math.round((count / totalInquiries) * 100) : 0;
              return (
                <div key={status} className="flex items-center gap-3">
                  <span className="w-16 shrink-0 text-xs text-charcoal/60">{STATUS_LABEL[status]}</span>
                  <div className="h-4 flex-1 rounded-sm bg-beige">
                    <div className="h-4 rounded-sm bg-taupe" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-16 shrink-0 text-right text-xs text-charcoal/60">
                    {count}건 ({pct}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-sm border border-nude/60 bg-white p-5">
          <h2 className="font-serif text-lg font-semibold text-charcoal">전체 전환율</h2>
          <div className="mt-4 flex flex-col gap-4">
            <div>
              <p className="text-xs text-charcoal/60">누적 상담문의</p>
              <p className="font-serif text-2xl text-charcoal">{totalInquiries}건</p>
            </div>
            <div>
              <p className="text-xs text-charcoal/60">누적 견적서</p>
              <p className="font-serif text-2xl text-charcoal">{totalQuotes}건</p>
            </div>
            <div>
              <p className="text-xs text-charcoal/60">계약 전환율 (견적 → 계약)</p>
              <p className="font-serif text-2xl text-gold">
                {totalQuotes > 0 ? Math.round((acceptedQuotes / totalQuotes) * 100) : 0}%
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
