import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import type { Inquiry, Profile, Quote } from "@/lib/types";
import TrendLineChart from "@/components/admin/TrendLineChart";

type Period = "1m" | "6m" | "1y";
const PERIOD_LABEL: Record<Period, string> = { "1m": "1개월", "6m": "6개월", "1y": "1년" };

// 단계(퍼널/상태)는 순서가 곧 의미인 ordinal 데이터라 한 색상의 명도 단계로 표현한다.
// scripts/validate_palette.js "...5색..." --mode light --ordinal 로 검증 통과.
const ORDINAL_RAMP = ["#fb923c", "#f97316", "#ea580c", "#c2410c", "#9a3412", "#7c2d12"];

function monthKey(year: number, monthIndex0: number) {
  return `${year}-${String(monthIndex0 + 1).padStart(2, "0")}`;
}
function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function shortDayLabel(key: string) {
  const [, m, d] = key.split("-");
  return `${Number(m)}/${Number(d)}`;
}
function shortMonthLabel(key: string) {
  const [, m] = key.split("-");
  return `${Number(m)}월`;
}

const STATUS_LABEL: Record<Inquiry["status"], string> = {
  lead: "문의",
  new: "신규",
  contacted: "연락완료",
  quoted: "견적발송",
  closed: "종결",
};

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const params = await searchParams;
  const period: Period = params.period === "1m" || params.period === "1y" ? params.period : "6m";

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

  const now = new Date();
  const periodStart = new Date(now);
  if (period === "1m") periodStart.setDate(periodStart.getDate() - 29);
  else if (period === "6m") periodStart.setMonth(periodStart.getMonth() - 5, 1);
  else periodStart.setMonth(0, 1); // 1년 보기는 롤링 12개월이 아니라 올해 1월~12월 달력 기준
  periodStart.setHours(0, 0, 0, 0);

  const [{ data: inquiries }, { data: quotes }] = await Promise.all([
    supabase
      .from("inquiries")
      .select("*")
      .gte("created_at", periodStart.toISOString())
      .order("created_at", { ascending: true })
      .returns<Inquiry[]>(),
    supabase
      .from("quotes")
      .select("*")
      .gte("quote_date", periodStart.toISOString().slice(0, 10))
      .returns<Quote[]>(),
  ]);

  // 트렌드: 1개월은 일 단위, 6개월·1년은 월 단위로 묶는다.
  const isDaily = period === "1m";
  const buckets: string[] = [];
  if (isDaily) {
    for (let i = 0; i < 30; i++) {
      const d = new Date(periodStart);
      d.setDate(d.getDate() + i);
      buckets.push(dayKey(d));
    }
  } else {
    const monthCount = period === "6m" ? 6 : 12;
    for (let i = 0; i < monthCount; i++) {
      const d = new Date(periodStart.getFullYear(), periodStart.getMonth() + i, 1);
      buckets.push(monthKey(d.getFullYear(), d.getMonth()));
    }
  }

  const countsByBucket = new Map<string, number>(buckets.map((b) => [b, 0]));
  (inquiries ?? []).forEach((inquiry) => {
    const key = isDaily ? inquiry.created_at.slice(0, 10) : inquiry.created_at.slice(0, 7);
    if (countsByBucket.has(key)) countsByBucket.set(key, (countsByBucket.get(key) ?? 0) + 1);
  });

  const trendPoints = buckets.map((b) => ({
    key: b,
    label: isDaily ? shortDayLabel(b) : shortMonthLabel(b),
    value: countsByBucket.get(b) ?? 0,
  }));

  // 전화문의 → 방문상담 → 계약 퍼널 (선택한 기간 기준)
  const totalInquiries = inquiries?.length ?? 0;
  const consultedInquiries = (inquiries ?? []).filter(
    (i) => i.status === "contacted" || i.status === "quoted" || i.status === "closed"
  ).length;
  const acceptedQuotes = (quotes ?? []).filter((q) => q.status === "accepted").length;

  const funnel = [
    { key: "call", label: "전화문의", count: totalInquiries, color: ORDINAL_RAMP[0] },
    { key: "visit", label: "방문상담", count: consultedInquiries, color: ORDINAL_RAMP[2] },
    { key: "contract", label: "계약", count: acceptedQuotes, color: ORDINAL_RAMP[4] },
  ];

  const statusOrder: Inquiry["status"][] = ["lead", "new", "contacted", "quoted", "closed"];
  const statusCounts = { lead: 0, new: 0, contacted: 0, quoted: 0, closed: 0 } as Record<
    Inquiry["status"],
    number
  >;
  (inquiries ?? []).forEach((inquiry) => {
    statusCounts[inquiry.status] += 1;
  });

  // 유입경로 분포
  const referralCounts = new Map<string, number>();
  (inquiries ?? []).forEach((inquiry) => {
    const key = inquiry.referral_source?.trim() || "미기재";
    referralCounts.set(key, (referralCounts.get(key) ?? 0) + 1);
  });
  const referralList = Array.from(referralCounts.entries()).sort((a, b) => b[1] - a[1]);
  const maxReferralCount = Math.max(1, ...referralList.map(([, c]) => c));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-charcoal">유입분석</h1>
          <p className="mt-2 text-sm text-charcoal/60">전화문의부터 방문상담, 계약까지의 유입 추이입니다.</p>
        </div>
        <div className="flex gap-1 rounded-full border border-nude/60 bg-white p-1">
          {(["1m", "6m", "1y"] as Period[]).map((p) => (
            <Link
              key={p}
              href={`/admin/analytics?period=${p}`}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                p === period ? "bg-charcoal text-cream" : "text-charcoal/60 hover:bg-beige/60"
              }`}
            >
              {PERIOD_LABEL[p]}
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-sm border border-nude/60 bg-white p-5">
        <h2 className="font-serif text-lg font-semibold text-charcoal">
          {PERIOD_LABEL[period]} 문의 추이 · {totalInquiries}건
        </h2>
        <div className="mt-4">
          <TrendLineChart points={trendPoints} labelEvery={isDaily ? 5 : 1} />
        </div>
      </div>

      <div className="mt-6 rounded-sm border border-nude/60 bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg font-semibold text-charcoal">전화문의 → 방문상담 → 계약</h2>
          <span className="text-xs text-charcoal/60">
            {PERIOD_LABEL[period]} 전환율{" "}
            <span className="font-semibold text-orange-600">
              {funnel[0].count > 0 ? Math.round((funnel[2].count / funnel[0].count) * 100) : 0}%
            </span>
          </span>
        </div>
        <div className="mt-5 flex flex-col gap-2">
          {funnel.map((stage, index) => {
            const prev = index > 0 ? funnel[index - 1].count : null;
            const pctOfFirst = funnel[0].count > 0 ? Math.round((stage.count / funnel[0].count) * 100) : 0;
            const pctOfPrev = prev !== null && prev > 0 ? Math.round((stage.count / prev) * 100) : null;
            const widthPct = funnel[0].count > 0 ? Math.max(stage.count > 0 ? 6 : 0, pctOfFirst) : 0;
            return (
              <div key={stage.key} className="flex items-center gap-3">
                <span className="w-16 shrink-0 text-xs text-charcoal/70">{stage.label}</span>
                <div className="h-5 flex-1 rounded-sm bg-stone-100">
                  <div
                    className="flex h-5 items-center rounded-sm px-2 text-[11px] font-semibold text-white"
                    style={{ width: `${widthPct}%`, backgroundColor: stage.color }}
                  >
                    {stage.count}
                  </div>
                </div>
                <span className="w-24 shrink-0 text-right text-xs text-charcoal/50">
                  {pctOfPrev !== null ? `이전 대비 ${pctOfPrev}%` : `전체 ${pctOfFirst}%`}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div className="rounded-sm border border-nude/60 bg-white p-5">
          <h2 className="font-serif text-lg font-semibold text-charcoal">문의 상태별 분포</h2>
          <div className="mt-4 flex flex-col gap-2">
            {statusOrder.map((status, index) => {
              const count = statusCounts[status];
              const pct = totalInquiries > 0 ? Math.round((count / totalInquiries) * 100) : 0;
              return (
                <div key={status} className="flex items-center gap-3">
                  <span className="w-16 shrink-0 text-xs text-charcoal/60">{STATUS_LABEL[status]}</span>
                  <div className="h-3 flex-1 rounded-sm bg-stone-100">
                    <div
                      className="h-3 rounded-sm"
                      style={{ width: `${pct}%`, backgroundColor: ORDINAL_RAMP[index] }}
                    />
                  </div>
                  <span className="w-16 shrink-0 text-right text-xs text-charcoal/60">
                    {count}건 ({pct}%)
                  </span>
                </div>
              );
            })}
            {totalInquiries === 0 && (
              <p className="text-sm text-charcoal/40">이 기간에 등록된 상담문의가 없습니다.</p>
            )}
          </div>
        </div>

        <div className="rounded-sm border border-nude/60 bg-white p-5">
          <h2 className="font-serif text-lg font-semibold text-charcoal">유입경로</h2>
          <div className="mt-4 flex flex-col gap-2">
            {referralList.slice(0, 6).map(([source, count]) => {
              const pct = Math.round((count / maxReferralCount) * 100);
              return (
                <div key={source} className="flex items-center gap-3">
                  <span className="w-20 shrink-0 truncate text-xs text-charcoal/60">{source}</span>
                  <div className="h-3 flex-1 rounded-sm bg-stone-100">
                    <div className="h-3 rounded-sm bg-sky-600" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-10 shrink-0 text-right text-xs text-charcoal/60">{count}건</span>
                </div>
              );
            })}
            {referralList.length === 0 && (
              <p className="text-sm text-charcoal/40">이 기간에 등록된 상담문의가 없습니다.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
