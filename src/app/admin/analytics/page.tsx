import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import type { Inquiry, PageView, Profile } from "@/lib/types";
import { getKSTCurrentYearMonth } from "@/lib/date";
import CopyLinkButton from "@/components/admin/CopyLinkButton";
import {
  CHANNELS,
  INFLOW_START_DATE,
  MAIN_HOMEPAGE,
  SOURCE_ORDER,
  channelLink,
  classifyTrafficSource,
  inquirySourceLabel,
  isOldSitePath,
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

// 많이 본 페이지 이름 (기존 홈페이지 기록은 "kr:/경로")
function pageLabel(path: string) {
  if (isOldSitePath(path)) {
    const p = path.slice(3);
    return `기존 홈페이지 · ${p === "/" ? "홈" : p}`;
  }
  return PATH_LABEL[path] ?? path;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

type View = "day" | "week" | "month" | "quarter" | "year" | "all";
type PeriodOption = { key: string; label: string; from: string; to: string };

const VIEW_LABEL: Record<View, string> = { day: "일간", week: "주간", month: "월별", quarter: "분기별", year: "연간", all: "전체" };
const START = { year: 2026, month: 11 }; // 집계 시작 (2026-11-01 리셋)

// ── 일간·주간: 한국 날짜를 "그날 0시(UTC 기준 숫자)"로 다룬다 ──
const DAY_MS = 86_400_000;
const START_DAY = Date.UTC(START.year, START.month - 1, 1);
const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"];
const DAY_BUTTONS = 14; // 일간 버튼: 최근 14일
const WEEK_BUTTONS = 8; // 주간 버튼: 최근 8주

function kstTodayMs() {
  const d = new Date(Date.now() + 9 * 3_600_000);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}
function dayKey(ms: number) {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}
function dayIso(ms: number) {
  return `${dayKey(ms)}T00:00:00+09:00`;
}
function shortDay(ms: number) {
  const d = new Date(ms);
  return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일 (${WEEKDAY[d.getUTCDay()]})`;
}
function dayOption(ms: number, today: number): PeriodOption {
  const label = ms === today ? "오늘" : ms === today - DAY_MS ? "어제" : shortDay(ms);
  return { key: dayKey(ms), label, from: dayIso(ms), to: dayIso(ms + DAY_MS) };
}
// 한 주 = 월요일 ~ 일요일
function weekOption(monday: number, today: number): PeriodOption {
  const thisMonday = today - ((new Date(today).getUTCDay() + 6) % 7) * DAY_MS;
  const sunday = monday + 6 * DAY_MS;
  const a = new Date(Math.max(monday, START_DAY));
  const b = new Date(sunday);
  const aText = `${a.getUTCMonth() + 1}/${a.getUTCDate()}`;
  const bText = `${b.getUTCMonth() + 1}/${b.getUTCDate()}`;
  const range = aText === bText ? aText : `${aText} ~ ${bText}`; // 집계 시작 주(11/1 하루)
  const label = monday === thisMonday ? `이번 주 (${range})` : monday === thisMonday - 7 * DAY_MS ? `지난주 (${range})` : range;
  return { key: dayKey(monday), label, from: dayIso(Math.max(monday, START_DAY)), to: dayIso(monday + 7 * DAY_MS) };
}
// ── 지난 기간과 비교 ──
const PREV_LABEL: Partial<Record<View, string>> = { day: "전날", week: "지난주", month: "지난달", quarter: "지난 분기", year: "작년" };
// "2026-11-09T00:00:00+09:00" 을 days일·months달 앞으로
function shiftIso(iso: string, days: number, months: number) {
  const d = new Date(Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1 - months, Number(iso.slice(8, 10)) - days));
  return dayIso(d.getTime());
}
// 비교할 앞 기간. 진행 중인 기간이면 앞 기간도 "같은 시점까지"만 센다. 집계 시작 전이면 비교 안 함
function previousPeriod(view: View, from: string, to: string) {
  const back: Partial<Record<View, [number, number]>> = { day: [1, 0], week: [7, 0], month: [0, 1], quarter: [0, 3], year: [0, 12] };
  const b = back[view];
  if (!b) return null;
  const prevFrom = shiftIso(from, b[0], b[1]);
  if (Date.parse(prevFrom) < START_DAY - 9 * 3_600_000) return null;
  const now = Date.now();
  const ongoing = Date.parse(to) > now;
  const prevTo = ongoing ? new Date(Date.parse(prevFrom) + (now - Date.parse(from))).toISOString() : from;
  return { from: prevFrom, to: prevTo, label: `${PREV_LABEL[view]}${ongoing ? " 같은 때" : ""}보다` };
}

// 주소에 적힌 날짜(YYYY-MM-DD) → 숫자. 집계 시작 전·미래는 받지 않음
function parseDayKey(key: string | undefined, today: number) {
  const m = key?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const ms = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return ms >= START_DAY - 6 * DAY_MS && ms <= today ? ms : null;
}

// m은 1~13 허용 (13 = 다음 해 1월)
function kst(y: number, m: number) {
  const yy = m > 12 ? y + 1 : y;
  const mm = m > 12 ? m - 12 : m;
  return `${yy}-${pad(mm)}-01T00:00:00+09:00`;
}

// 보기 방식별 고를 수 있는 기간 (최근 것이 먼저)
function periodOptions(view: View): PeriodOption[] {
  const now = getKSTCurrentYearMonth();
  const list: PeriodOption[] = [];
  if (view === "day" || view === "week") {
    // 최근 것이 먼저 (아래 reverse 안 함)
    const today = kstTodayMs();
    if (view === "day") {
      for (let i = 0; i < DAY_BUTTONS; i++) {
        const ms = today - i * DAY_MS;
        if (ms < START_DAY) break;
        list.push(dayOption(ms, today));
      }
    } else {
      const thisMonday = today - ((new Date(today).getUTCDay() + 6) % 7) * DAY_MS;
      for (let i = 0; i < WEEK_BUTTONS; i++) {
        const monday = thisMonday - i * 7 * DAY_MS;
        if (monday + 7 * DAY_MS <= START_DAY) break;
        list.push(weekOption(monday, today));
      }
    }
    return list;
  }
  if (view === "month") {
    let y = START.year;
    let m = START.month;
    while (y < now.year || (y === now.year && m <= now.month)) {
      list.push({ key: `${y}-${pad(m)}`, label: `${y}년 ${m}월`, from: kst(y, m), to: kst(y, m + 1) });
      if (m === 12) {
        m = 1;
        y += 1;
      } else m += 1;
    }
  } else if (view === "quarter") {
    for (let y = START.year; y <= now.year; y++) {
      for (let q = 1; q <= 4; q++) {
        const firstMonth = (q - 1) * 3 + 1;
        if (y === START.year && firstMonth + 2 < START.month) continue;
        if (y === now.year && firstMonth > now.month) continue;
        const fromMonth = y === START.year && firstMonth < START.month ? START.month : firstMonth;
        list.push({ key: `${y}-Q${q}`, label: `${y}년 ${q}분기`, from: kst(y, fromMonth), to: kst(y, firstMonth + 3) });
      }
    }
  } else if (view === "year") {
    for (let y = START.year; y <= now.year; y++) {
      list.push({ key: String(y), label: `${y}년`, from: y === START.year ? kst(y, START.month) : kst(y, 1), to: kst(y, 13) });
    }
  } else {
    list.push({ key: "all", label: "11월 1일부터 지금까지", from: `${INFLOW_START_DATE}T00:00:00+09:00`, to: kst(now.year, now.month + 1) });
  }
  return list.reverse();
}

// 분기·연간·전체를 볼 때 아래에 붙는 월별 표용
function monthsBetween(from: string, to: string) {
  const out: PeriodOption[] = [];
  let y = Number(from.slice(0, 4));
  let m = Number(from.slice(5, 7));
  while (kst(y, m) < to) {
    out.push({ key: `${y}-${pad(m)}`, label: `${y}년 ${m}월`, from: kst(y, m), to: kst(y, m + 1) });
    if (m === 12) {
      m = 1;
      y += 1;
    } else m += 1;
  }
  return out;
}

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ view?: string; period?: string }> }) {
  const params = await searchParams;
  const view: View = (Object.keys(VIEW_LABEL) as View[]).includes(params.view as View) ? (params.view as View) : "month";
  const options = periodOptions(view);
  // 일간·주간은 버튼에 없는 예전 날짜도 주소로 볼 수 있게 (주간 표에서 날짜를 누를 때)
  const today = kstTodayMs();
  const pickedDay = view === "day" || view === "week" ? parseDayKey(params.period, today) : null;
  const current =
    options.find((o) => o.key === params.period) ??
    (pickedDay !== null && view === "day" ? dayOption(pickedDay, today) : null) ??
    (pickedDay !== null && view === "week" ? weekOption(pickedDay - ((new Date(pickedDay).getUTCDay() + 6) % 7) * DAY_MS, today) : null) ??
    options[0];

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = await supabase.from("profiles").select("*").eq("id", user!.id).single<Profile>();
  if (me?.role !== "owner" && me?.role !== "manager") redirect("/admin");

  const fromIso = current.from;
  const toIso: string | null = current.to;
  const periodLabel = current.label;
  // 아래 정리 표: 주간이면 날짜별(오늘까지), 분기·연간·전체면 달별, 일간·월별은 없음
  const weekDays: PeriodOption[] = [];
  if (view === "week") {
    const monday = Date.UTC(Number(current.from.slice(0, 4)), Number(current.from.slice(5, 7)) - 1, Number(current.from.slice(8, 10)));
    for (let ms = monday; ms < monday + 7 * DAY_MS && ms <= today; ms += DAY_MS) {
      const o = dayOption(ms, today);
      weekDays.push({ ...o, label: o.label === "오늘" || o.label === "어제" ? `${shortDay(ms)} · ${o.label}` : o.label });
    }
  }
  const monthRows = view === "week" ? weekDays : view === "day" || view === "month" ? [] : monthsBetween(current.from, current.to);
  const rowView: View = view === "week" ? "day" : "month";

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
    .select("created_at")
    .gte("created_at", fromIso)
    .neq("status", "cancelled");
  if (toIso) {
    viewsQuery = viewsQuery.lt("created_at", toIso);
    inquiriesQuery = inquiriesQuery.lt("created_at", toIso);
    contractsQuery = contractsQuery.lt("created_at", toIso);
  }

  const [{ data: views }, { data: inquiries }, { data: contracts }] = await Promise.all([
    viewsQuery.returns<Pick<PageView, "visitor_id" | "path" | "referrer_host" | "utm_source" | "created_at">[]>(),
    inquiriesQuery.returns<Pick<Inquiry, "id" | "name" | "status" | "auto_source" | "referral_source" | "created_at">[]>(),
    contractsQuery.returns<{ created_at: string }[]>(),
  ]);
  const contractCount = contracts?.length ?? 0;

  // 지난 기간 숫자 (위 네 칸 비교용)
  const prev = previousPeriod(view, current.from, current.to);
  let prevStats: { visitors: number; online: number; offline: number; contracts: number } | null = null;
  if (prev) {
    const [{ data: pv }, { data: pi }, { data: pc }] = await Promise.all([
      supabase.from("page_views").select("visitor_id").gte("created_at", prev.from).lt("created_at", prev.to).not("path", "like", "%#%").returns<{ visitor_id: string }[]>(),
      supabase.from("inquiries").select("auto_source").gte("created_at", prev.from).lt("created_at", prev.to).returns<{ auto_source: string | null }[]>(),
      supabase.from("work_orders").select("id").gte("created_at", prev.from).lt("created_at", prev.to).neq("status", "cancelled").returns<{ id: string }[]>(),
    ]);
    prevStats = {
      visitors: new Set((pv ?? []).map((v) => v.visitor_id)).size,
      online: (pi ?? []).filter(isOnlineInquiry).length,
      offline: (pi ?? []).filter((i) => !isOnlineInquiry(i)).length,
      contracts: pc?.length ?? 0,
    };
  }

  // 포트폴리오 카드 열람(path에 #)은 페이지 이동이 아니라 제외
  const pageViews = (views ?? []).filter((v) => !v.path.includes("#"));

  // 분기·연간·전체: 달마다 방문자·문의·계약 (시각은 한국 시간 기준 달로 나눈다)
  const inMonth = (iso: string, m: PeriodOption) => new Date(iso) >= new Date(m.from) && new Date(iso) < new Date(m.to);
  const monthStats = monthRows.map((m) => {
    const monthViews = pageViews.filter((v) => inMonth(v.created_at, m));
    const monthInquiries = (inquiries ?? []).filter((i) => inMonth(i.created_at, m));
    return {
      ...m,
      visitors: new Set(monthViews.map((v) => v.visitor_id)).size,
      online: monthInquiries.filter(isOnlineInquiry).length,
      offline: monthInquiries.filter((i) => !isOnlineInquiry(i)).length,
      contracts: (contracts ?? []).filter((c) => inMonth(c.created_at, m)).length,
    };
  });

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
  // 기존 홈페이지(카페24) 방문자와 새 홈페이지 방문자 나눠 보기
  const oldSiteVisitors = new Set(pageViews.filter((v) => isOldSitePath(v.path)).map((v) => v.visitor_id)).size;
  const newSiteVisitors = new Set(pageViews.filter((v) => !isOldSitePath(v.path)).map((v) => v.visitor_id)).size;
  const inquiryRate = totalVisitors > 0 ? (online.length / totalVisitors) * 100 : 0;

  const pageCounts = new Map<string, number>();
  for (const v of pageViews) pageCounts.set(v.path, (pageCounts.get(v.path) ?? 0) + 1);
  const topPages = [...pageCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  const offlineBySource = new Map<string, number>();
  for (const i of offline) {
    const label = i.referral_source?.trim() || "경로 미기재";
    offlineBySource.set(label, (offlineBySource.get(label) ?? 0) + 1);
  }

  const summary: { label: string; value: number; unit: string; caption?: string; prev?: number }[] = [
    { label: "홈페이지 방문자", value: totalVisitors, unit: "명", caption: `기존 홈페이지 ${oldSiteVisitors} · 새 홈페이지 ${newSiteVisitors}`, prev: prevStats?.visitors },
    { label: "홈페이지 문의", value: online.length, unit: "건", caption: `방문자 대비 ${inquiryRate.toFixed(1)}%`, prev: prevStats?.online },
    { label: "직접 접수 문의", value: offline.length, unit: "건", caption: "전화·방문 등 직원이 등록", prev: prevStats?.offline },
    { label: "계약", value: contractCount, unit: "건", caption: "등록된 현장 기준", prev: prevStats?.contracts },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-charcoal">유입분석</h1>
          <p className="mt-1 text-sm text-charcoal/50">어디서 들어와서 얼마나 문의했는지 · {periodLabel}</p>
        </div>
        {/* 보기 방식: 일간 / 주간 / 월별 / 분기별 / 연간 / 전체 */}
        <div className="flex flex-wrap items-center gap-1 rounded-full border border-nude/60 bg-white p-1">
          {(Object.keys(VIEW_LABEL) as View[]).map((v) => (
            <Link
              key={v}
              href={`/admin/analytics?view=${v}`}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold ${view === v ? "bg-charcoal text-cream" : "text-charcoal/60 hover:bg-beige/60"}`}
            >
              {VIEW_LABEL[v]}
            </Link>
          ))}
        </div>
      </div>

      {/* 기간 고르기 */}
      {view !== "all" && (
        <div className="mt-3 flex flex-wrap gap-2">
          {options.map((o) => (
            <Link
              key={o.key}
              href={`/admin/analytics?view=${view}&period=${o.key}`}
              className={`rounded-lg border px-3.5 py-1.5 text-sm ${
                current.key === o.key
                  ? "border-orange-400 bg-orange-50 font-semibold text-orange-700"
                  : "border-nude/70 bg-white text-charcoal/60 hover:border-orange-300"
              }`}
            >
              {o.label}
            </Link>
          ))}
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summary.map((s) => (
          <div key={s.label} className="rounded-xl border border-nude/60 bg-white p-5">
            <p className="text-xs font-medium text-charcoal/55">{s.label}</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums text-charcoal">
              {s.value}
              <span className="ml-0.5 text-base font-normal text-charcoal/50">{s.unit}</span>
            </p>
            {s.caption && <p className="mt-1 text-xs text-charcoal/40">{s.caption}</p>}
            {prev && s.prev !== undefined && (
              <p
                className={`mt-1 text-xs font-medium ${
                  s.value > s.prev ? "text-emerald-600" : s.value < s.prev ? "text-rose-500" : "text-charcoal/45"
                }`}
              >
                {prev.label}{" "}
                {s.value === s.prev
                  ? "같음"
                  : `${s.value > s.prev ? "▲ +" : "▼ "}${s.value - s.prev}${s.unit}`}
                <span className="ml-1 font-normal text-charcoal/40">({PREV_LABEL[view]} {s.prev}{s.unit})</span>
              </p>
            )}
          </div>
        ))}
      </div>

      {monthStats.length > 0 && (
        <section className="mt-6 rounded-xl border border-nude/60 bg-white p-5">
          <h2 className="text-lg font-semibold text-charcoal">{view === "week" ? "날짜별 정리" : "월별 정리"}</h2>
          <p className="mt-1 text-xs text-charcoal/45">{view === "week" ? "날짜를 누르면 그날 자세히 보기" : "달 이름을 누르면 그 달 자세히 보기"}</p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-nude/60 text-left text-xs text-charcoal/50">
                  <th className="py-2 pr-3 font-medium">{view === "week" ? "날짜" : "달"}</th>
                  <th className="py-2 pr-3 text-right font-medium">방문자</th>
                  <th className="py-2 pr-3 text-right font-medium">홈페이지 문의</th>
                  <th className="py-2 pr-3 text-right font-medium">직접 접수</th>
                  <th className="py-2 text-right font-medium">계약</th>
                </tr>
              </thead>
              <tbody>
                {monthStats.map((m) => (
                  <tr key={m.key} className="border-b border-nude/30 last:border-0">
                    <td className="py-2.5 pr-3">
                      <Link href={`/admin/analytics?view=${rowView}&period=${m.key}`} className="font-medium text-charcoal hover:text-orange-600">
                        {m.label}
                      </Link>
                    </td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{m.visitors}</td>
                    <td className="py-2.5 pr-3 text-right font-semibold tabular-nums">{m.online}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{m.offline}</td>
                    <td className="py-2.5 text-right tabular-nums">{m.contracts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

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
                <span className="text-charcoal/80">{pageLabel(path)}</span>
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
        <p className="mt-2 rounded-lg bg-white/70 px-3 py-2 text-xs leading-relaxed text-charcoal/60">
          방문자는{" "}
          <a href={MAIN_HOMEPAGE} target="_blank" rel="noreferrer" className="underline hover:text-orange-600">
            기존 홈페이지(reandesign.kr, 카페24)
          </a>
          와 <b className="text-charcoal/80">새 홈페이지(reandesign.co.kr)</b>를 합쳐 셉니다. 기존 홈페이지는 카페24에 기록 코드를 넣은
          날부터 잡힙니다. 대표님·팀원 기기는 빠집니다 (새 홈페이지: 관리자 로그인한 기기 자동 · 기존 홈페이지: 그 기기로{" "}
          <code>reandesign.kr/?rean_staff=1</code> 한 번 열기).
        </p>
        <div className="mt-4 flex flex-col gap-2">
          {CHANNELS.map((c) => (
            <div key={c.key} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-white px-4 py-3">
              <span className="w-28 shrink-0 font-medium text-charcoal">{c.label}</span>
              <span className="w-44 shrink-0 text-xs">
                {c.profileUrl ? (
                  <a href={c.profileUrl} target="_blank" rel="noreferrer" className="text-charcoal/60 underline-offset-2 hover:text-orange-600 hover:underline">
                    {c.account ?? c.profileUrl} ↗
                  </a>
                ) : (
                  <span className="text-charcoal/50">{c.account ?? ""}</span>
                )}
                {c.where && <span className="block text-[11px] text-charcoal/40">넣을 곳: {c.where}</span>}
              </span>
              <code className="min-w-0 flex-1 truncate text-xs text-charcoal/70">{channelLink(c.key)}</code>
              <CopyLinkButton url={channelLink(c.key)} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
