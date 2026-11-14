import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import type { Inquiry, PageView, Profile } from "@/lib/types";
import { getKSTCurrentYearMonth } from "@/lib/date";
import CopyLinkButton from "@/components/admin/CopyLinkButton";
import {
  CHANNELS,
  INFLOW_START_DATE,
  SOURCE_ORDER,
  channelLink,
  classifyTrafficSource,
  inquirySourceLabel,
  isOnlineInquiry,
} from "@/lib/trafficSource";

// 유입분석 (2026-11-01 리셋): 어디서 들어와서 얼마나 문의했는지만 간단하게.
// 예전 버전(퍼널·마감 단계 분석 등)은 git 기록에 남아 있다.

const PATH_LABEL: Record<string, string> = {
  "/": "홈",
  "/about": "소개",
  "/project": "포트폴리오",
  "/process": "시공프로세스",
  "/review": "고객후기",
  "/contact": "상담신청",
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

// 2026-11부터 이번 달까지의 월 목록
function monthOptions() {
  const { year, month } = getKSTCurrentYearMonth();
  const list: { key: string; label: string }[] = [];
  let y = 2026;
  let m = 11;
  while (y < year || (y === year && m <= month)) {
    list.push({ key: `${y}-${pad(m)}`, label: `${y === 2026 ? "" : `${y}년 `}${m}월` });
    m += 1;
    if (m === 13) {
      m = 1;
      y += 1;
    }
  }
  return list.reverse();
}

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const params = await searchParams;
  const months = monthOptions();
  const selected = params.month === "all" ? "all" : (months.find((m) => m.key === params.month)?.key ?? months[0].key);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = await supabase.from("profiles").select("*").eq("id", user!.id).single<Profile>();
  if (me?.role !== "owner" && me?.role !== "manager") redirect("/admin");

  // 기간: 선택한 달 또는 11월 1일부터 지금까지 (한국 시간)
  let fromIso = `${INFLOW_START_DATE}T00:00:00+09:00`;
  let toIso: string | null = null;
  if (selected !== "all") {
    const [y, m] = selected.split("-").map(Number);
    fromIso = `${y}-${pad(m)}-01T00:00:00+09:00`;
    toIso = m === 12 ? `${y + 1}-01-01T00:00:00+09:00` : `${y}-${pad(m + 1)}-01T00:00:00+09:00`;
  }
  const periodLabel = selected === "all" ? "11월 1일부터 지금까지" : months.find((m) => m.key === selected)!.label;

  let viewsQuery = supabase
    .from("page_views")
    .select("visitor_id, path, referrer_host, utm_source, created_at")
    .gte("created_at", fromIso)
    .order("created_at", { ascending: true });
  let inquiriesQuery = supabase
    .from("inquiries")
    .select("id, name, status, auto_source, referral_source, created_at")
    .gte("created_at", fromIso)
    .order("created_at", { ascending: false });
  let contractsQuery = supabase
    .from("work_orders")
    .select("*", { count: "exact", head: true })
    .gte("created_at", fromIso)
    .neq("status", "cancelled");
  if (toIso) {
    viewsQuery = viewsQuery.lt("created_at", toIso);
    inquiriesQuery = inquiriesQuery.lt("created_at", toIso);
    contractsQuery = contractsQuery.lt("created_at", toIso);
  }

  const [{ data: views }, { data: inquiries }, { count: contractCount }] = await Promise.all([
    viewsQuery.returns<Pick<PageView, "visitor_id" | "path" | "referrer_host" | "utm_source" | "created_at">[]>(),
    inquiriesQuery.returns<Pick<Inquiry, "id" | "name" | "status" | "auto_source" | "referral_source" | "created_at">[]>(),
    contractsQuery,
  ]);

  // 포트폴리오 카드 열람(path에 #)은 페이지 이동이 아니라 제외
  const pageViews = (views ?? []).filter((v) => !v.path.includes("#"));

  // 방문자마다 기간 안 "첫 방문"의 출처로 센다
  const visitorSource = new Map<string, string>();
  for (const v of pageViews) {
    if (!visitorSource.has(v.visitor_id)) visitorSource.set(v.visitor_id, classifyTrafficSource(v));
  }
  const visitorsBySource = new Map<string, number>();
  for (const label of visitorSource.values()) visitorsBySource.set(label, (visitorsBySource.get(label) ?? 0) + 1);

  const allInquiries = inquiries ?? [];
  const online = allInquiries.filter(isOnlineInquiry);
  const offline = allInquiries.filter((i) => !isOnlineInquiry(i));
  const inquiriesBySource = new Map<string, number>();
  for (const i of online) {
    const label = inquirySourceLabel(i);
    inquiriesBySource.set(label, (inquiriesBySource.get(label) ?? 0) + 1);
  }

  // 표에 나올 출처: 리안 채널은 0이어도 항상, 나머지는 기록이 있을 때만
  const channelLabels = new Set(CHANNELS.map((c) => c.label));
  const labels = [
    ...SOURCE_ORDER.filter((l) => channelLabels.has(l) || visitorsBySource.has(l) || inquiriesBySource.has(l)),
    ...[...new Set([...visitorsBySource.keys(), ...inquiriesBySource.keys()])].filter((l) => !SOURCE_ORDER.includes(l)),
  ];
  const rows = labels.map((label) => ({
    label,
    visitors: visitorsBySource.get(label) ?? 0,
    inquiries: inquiriesBySource.get(label) ?? 0,
    isChannel: channelLabels.has(label),
  }));
  const maxVisitors = Math.max(1, ...rows.map((r) => r.visitors));

  const totalVisitors = visitorSource.size;
  const inquiryRate = totalVisitors > 0 ? (online.length / totalVisitors) * 100 : 0;

  const pageCounts = new Map<string, number>();
  for (const v of pageViews) pageCounts.set(v.path, (pageCounts.get(v.path) ?? 0) + 1);
  const topPages = [...pageCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  const offlineBySource = new Map<string, number>();
  for (const i of offline) {
    const label = i.referral_source?.trim() || "경로 미기재";
    offlineBySource.set(label, (offlineBySource.get(label) ?? 0) + 1);
  }

  const summary = [
    { label: "홈페이지 방문자", value: totalVisitors, unit: "명" },
    { label: "홈페이지 문의", value: online.length, unit: "건", caption: `방문자 대비 ${inquiryRate.toFixed(1)}%` },
    { label: "직접 접수 문의", value: offline.length, unit: "건", caption: "전화·방문 등 직원이 등록" },
    { label: "계약", value: contractCount ?? 0, unit: "건", caption: "등록된 현장 기준" },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-charcoal">유입분석</h1>
          <p className="mt-1 text-sm text-charcoal/50">어디서 들어와서 얼마나 문의했는지 · {periodLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-1 rounded-full border border-nude/60 bg-white p-1">
          {months.map((m) => (
            <Link
              key={m.key}
              href={`/admin/analytics?month=${m.key}`}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${selected === m.key ? "bg-charcoal text-cream" : "text-charcoal/60 hover:bg-beige/60"}`}
            >
              {m.label}
            </Link>
          ))}
          <Link
            href="/admin/analytics?month=all"
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${selected === "all" ? "bg-charcoal text-cream" : "text-charcoal/60 hover:bg-beige/60"}`}
          >
            11월부터 전체
          </Link>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summary.map((s) => (
          <div key={s.label} className="rounded-xl border border-nude/60 bg-white p-5">
            <p className="text-xs font-medium text-charcoal/55">{s.label}</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums text-charcoal">
              {s.value}
              <span className="ml-0.5 text-base font-normal text-charcoal/50">{s.unit}</span>
            </p>
            {s.caption && <p className="mt-1 text-xs text-charcoal/40">{s.caption}</p>}
          </div>
        ))}
      </div>

      <section className="mt-6 rounded-xl border border-nude/60 bg-white p-5">
        <h2 className="text-lg font-semibold text-charcoal">어디서 들어왔나</h2>
        <p className="mt-1 text-xs text-charcoal/45">
          방문자는 기간 안 첫 방문 기준 · 블로그·인스타는 아래 추적 링크로 들어와야 메인/개인 계정이 구분됩니다
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-nude/60 text-left text-xs text-charcoal/50">
                <th className="py-2 pr-3 font-medium">들어온 곳</th>
                <th className="py-2 pr-3 font-medium">방문자</th>
                <th className="w-20 py-2 pr-3 text-right font-medium">문의</th>
                <th className="w-20 py-2 text-right font-medium">문의율</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label} className="border-b border-nude/30 last:border-0">
                  <td className={`py-2.5 pr-3 ${r.isChannel ? "font-medium text-charcoal" : "text-charcoal/65"}`}>{r.label}</td>
                  <td className="py-2.5 pr-3">
                    <div className="flex items-center gap-2">
                      <div className="h-4 flex-1 rounded bg-stone-100">
                        {r.visitors > 0 && (
                          <div className="h-4 rounded bg-orange-300" style={{ width: `${(r.visitors / maxVisitors) * 100}%` }} />
                        )}
                      </div>
                      <span className="w-10 text-right tabular-nums text-charcoal/80">{r.visitors}</span>
                    </div>
                  </td>
                  <td className="py-2.5 pr-3 text-right font-semibold tabular-nums text-charcoal">{r.inquiries || "-"}</td>
                  <td className="py-2.5 text-right tabular-nums text-charcoal/60">
                    {r.visitors > 0 && r.inquiries > 0 ? `${((r.inquiries / r.visitors) * 100).toFixed(1)}%` : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-nude/60 bg-white p-5">
          <h2 className="text-lg font-semibold text-charcoal">문의 목록</h2>
          <ul className="mt-3 flex flex-col">
            {allInquiries.slice(0, 12).map((i) => (
              <li key={i.id} className="flex items-center gap-3 border-b border-nude/30 py-2 text-sm last:border-0">
                <span className="w-12 shrink-0 text-xs tabular-nums text-charcoal/45">
                  {new Date(i.created_at).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric" })}
                </span>
                <span className="min-w-0 flex-1 truncate font-medium text-charcoal">{i.name}</span>
                <span className="shrink-0 text-xs text-charcoal/55">{inquirySourceLabel(i)}</span>
              </li>
            ))}
            {allInquiries.length === 0 && <li className="py-2 text-sm text-charcoal/45">이 기간에 문의가 없습니다.</li>}
          </ul>
          {offlineBySource.size > 0 && (
            <p className="mt-3 text-xs text-charcoal/50">
              직접 접수: {[...offlineBySource.entries()].map(([k, n]) => `${k} ${n}`).join(" · ")}
            </p>
          )}
        </section>

        <section className="rounded-xl border border-nude/60 bg-white p-5">
          <h2 className="text-lg font-semibold text-charcoal">많이 본 페이지</h2>
          <ul className="mt-3 flex flex-col">
            {topPages.map(([path, n]) => (
              <li key={path} className="flex items-center justify-between border-b border-nude/30 py-2 text-sm last:border-0">
                <span className="text-charcoal/80">{PATH_LABEL[path] ?? path}</span>
                <span className="tabular-nums text-charcoal/60">{n}회</span>
              </li>
            ))}
            {topPages.length === 0 && <li className="py-2 text-sm text-charcoal/45">이 기간에 방문 기록이 없습니다.</li>}
          </ul>
        </section>
      </div>

      <section className="mt-6 rounded-xl border border-orange-200 bg-orange-50/40 p-5">
        <h2 className="text-lg font-semibold text-charcoal">채널별 추적 링크</h2>
        <p className="mt-1 text-sm text-charcoal/60">
          각 채널 프로필 링크·게시물에 아래 주소를 넣으면 어느 계정에서 들어왔는지 정확히 구분됩니다.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          {CHANNELS.map((c) => (
            <div key={c.key} className="flex flex-wrap items-center gap-3 rounded-lg bg-white px-4 py-3">
              <span className="w-28 shrink-0 font-medium text-charcoal">{c.label}</span>
              <span className="w-36 shrink-0 text-xs text-charcoal/50">{c.account ?? ""}</span>
              <code className="min-w-0 flex-1 truncate text-xs text-charcoal/70">{channelLink(c.key)}</code>
              <CopyLinkButton url={channelLink(c.key)} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
