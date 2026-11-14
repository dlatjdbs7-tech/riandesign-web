import { Fragment, type CSSProperties } from "react";
import {
  ESTIMATE_CATEGORIES,
  STATEMENT_RATES,
  calcEstimate,
  categoryLabel,
  categoryNo,
  lineAmounts,
  methodOf,
  toKoreanAmount,
  won,
} from "@/lib/estimate";

// 견적서 문서: 표지 → 갑지 → 공사원가계산서(상세 견적) → 집계표 → 내역서 (엑셀 견적서 양식과 같은 칸) (인쇄 화면과 고객 링크가 같이 쓴다)

export type DocEstimate = {
  kind: string;
  title: string;
  customer_name: string | null;
  site_address: string | null;
  area_py: number | null;
  area_m2: number | null;
  quote_date: string;
  expense_rate: number;
  misc_rate: number;
  profit_rate: number;
  vat_rate: number;
  vat_included: boolean;
  round_unit: number;
  notes: string | null;
};
export type DocLine = {
  category: string;
  subcategory: string | null;
  name: string;
  spec: string | null;
  unit: string | null;
  qty: number;
  material_price: number;
  labor_price: number;
  note: string | null;
};
export type DocCompany = {
  company_name: string | null;
  business_registration_number: string | null;
  representative_name: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
} | null;

// 가로 A4 한 장(표지·갑지): 화면 너비에 맞춰 글자도 같이 줄고 는다
const LAND =
  "estimate-page estimate-land @container relative mx-auto w-full max-w-[1123px] overflow-hidden bg-white";
// 가로 A4, 내용 길이만큼 (집계표)
const LAND_FLOW =
  "estimate-page estimate-land-flow mx-auto w-full max-w-[1123px] bg-white";
// 엑셀 견적서에 적힌 대표 휴대폰
const COMPANY_MOBILE = "010-6232-9714";

// 글자 크기: 최소 px ~ 화면 비례(cqw) ~ 최대 px
function fs(min: number, cqw: number, max: number): CSSProperties {
  return { fontSize: `clamp(${min}px, ${cqw}cqw, ${max}px)` };
}

// "임상혁" → "임 상 혁"
function spaced(text: string, sep = " ") {
  return [...text.replace(/\s+/g, "")].join(sep);
}

function pct(part: number, whole: number) {
  if (!whole || !part) return "-";
  return `${((part / whole) * 100).toFixed(1)}%`;
}
// 집계표·내역서 칸 (엑셀처럼 얇은 테두리)
const XTH =
  "border border-charcoal/25 px-1.5 py-[3px] text-center font-semibold leading-tight";
const XTD = "border border-charcoal/15 px-2 py-1.5 align-middle";
const XNUM = `${XTD} text-right tabular-nums whitespace-nowrap`;

// 간단 견적 내역 1~9번 공종 머리 색 (밝은 파스텔 그라데이션)
const PASTEL = [
  "linear-gradient(90deg, #F6E3DC 0%, #FBF3EF 100%)", // 1 가설 · 살구
  "linear-gradient(90deg, #EFE3D3 0%, #F9F4EC 100%)", // 2 철거 · 베이지
  "linear-gradient(90deg, #F3EBD0 0%, #FBF8EC 100%)", // 3 목공 · 크림
  "linear-gradient(90deg, #DCEBEA 0%, #F2F8F7 100%)", // 4 타일·욕실 · 민트
  "linear-gradient(90deg, #E6E2F2 0%, #F6F4FB 100%)", // 5 수장 · 라벤더
  "linear-gradient(90deg, #DDE7F3 0%, #F3F7FB 100%)", // 6 창호 · 하늘
  "linear-gradient(90deg, #DCEEE3 0%, #F2F9F4 100%)", // 7 공조 · 세이지
  "linear-gradient(90deg, #F3DFE4 0%, #FBF2F4 100%)", // 8 가구 · 로즈
  "linear-gradient(90deg, #F5EBD6 0%, #FCF8EE 100%)", // 9 전기 · 버터
  "linear-gradient(90deg, #E9E7E4 0%, #F7F6F4 100%)", // 10 기타 · 그레이
];

// 0이면 "-" (엑셀처럼)
function dash(n: number) {
  return n ? won(n) : "-";
}

function areaText(e: DocEstimate) {
  if (!e.area_py && !e.area_m2) return "-";
  return `${e.area_m2 ? `${e.area_m2}m2` : ""}${e.area_py ? ` [${e.area_py} py]` : ""}`.trim();
}

function dateText(d: string) {
  return d.replaceAll("-", ". ");
}

export default function EstimateDocument({
  estimate,
  lines,
  company,
  showCover = true,
  showDetail = true,
}: {
  estimate: DocEstimate;
  lines: DocLine[];
  company: DocCompany;
  showCover?: boolean;
  showDetail?: boolean;
}) {
  const numeric = lines.map((l) => ({
    ...l,
    qty: Number(l.qty),
    material_price: Number(l.material_price),
    labor_price: Number(l.labor_price),
  }));
  const s = calcEstimate(numeric, {
    expense: Number(estimate.expense_rate),
    misc: Number(estimate.misc_rate),
    profit: Number(estimate.profit_rate),
    vat: Number(estimate.vat_rate),
    vatIncluded: estimate.vat_included,
    roundUnit: estimate.round_unit,
    method: methodOf(estimate.kind),
  });
  const noteLines = (estimate.notes ?? "")
    .split("\n")
    .map((t) => t.trim())
    .filter(Boolean);
  const companyName = company?.company_name ?? "리안디자인";
  const st = s.statement; // 상세 견적일 때만 (공사원가계산서)
  // 집계표 "나. 간접공사비" 줄 (항목은 항상 보이고 %는 견적서 편집 화면에서 정함)
  type IndirectRow = {
    no: number;
    label: string;
    basis: string;
    rate: number | null;
    material: number;
    labor: number;
    total: number;
    note?: string;
  };
  const pr = Number(estimate.profit_rate);
  const indirectRows: IndirectRow[] = st
    ? [
        {
          no: 1,
          label: "간접노무비",
          basis: "직접노무비의",
          rate: STATEMENT_RATES.indirectLabor,
          material: 0,
          labor: st.indirectLabor,
          total: st.indirectLabor,
        },
        {
          no: 2,
          label: "경비 (보험료·안전관리비 등)",
          basis: "원가계산서 참조",
          rate: null,
          material: 0,
          labor: 0,
          total: st.expense,
          note: "법정·기타경비",
        },
        {
          no: 3,
          label: "일반관리비",
          basis: "재+노+경의",
          rate: Number(estimate.misc_rate),
          material: 0,
          labor: 0,
          total: st.overhead,
        },
        {
          no: 4,
          label: "기업이윤",
          basis: "노+경+일의",
          rate: pr,
          material: 0,
          labor: 0,
          total: st.profit,
        },
        {
          no: 5,
          label: "지급자재",
          basis: "",
          rate: null,
          material: 0,
          labor: 0,
          total: 0,
        },
      ]
    : [
        {
          no: 1,
          label: "경비",
          basis: "직접공사비의",
          rate: Number(estimate.expense_rate),
          material: s.expense,
          labor: 0,
          total: s.expense,
          note: "재료비 기준",
        },
        {
          no: 2,
          label: "공과잡비",
          basis: "직접공사비의",
          rate: Number(estimate.misc_rate),
          material: s.misc,
          labor: 0,
          total: s.misc,
          note: "재료비 기준",
        },
        {
          no: 3,
          label: "공사감리비",
          basis: "총공사비의",
          rate: null,
          material: 0,
          labor: 0,
          total: 0,
        },
        {
          no: 4,
          label: "기업이윤",
          basis: "총공사비의",
          rate: pr,
          material: (s.material * pr) / 100,
          labor: (s.labor * pr) / 100,
          total: s.profit,
        },
        {
          no: 5,
          label: "지급자재",
          basis: "",
          rate: null,
          material: 0,
          labor: 0,
          total: 0,
        },
      ];

  // 내역서: 공종 → 세부공종 → 품목
  const byCategory = new Map<string, Map<string, typeof numeric>>();
  for (const l of [...numeric].sort(
    (a, b) => categoryNo(a.category) - categoryNo(b.category),
  )) {
    const subs =
      byCategory.get(l.category) ?? new Map<string, typeof numeric>();
    const key = l.subcategory ?? "";
    subs.set(key, [...(subs.get(key) ?? []), l]);
    byCategory.set(l.category, subs);
  }

  return (
    <div className="estimate-doc flex flex-col gap-6 text-charcoal">
      {/* 표지: REAN 로고 + RE-ANALYZE / RE-DESIGN 두 줄 (가로 A4) */}
      {showCover && (
        <section
          className={`${LAND} flex min-h-[420px] flex-col py-[6%] sm:aspect-[297/210] sm:min-h-0`}
        >
          <div className="flex-[0.55]" />
          {/* 로고: 왼쪽에서 22% 지점 */}
          <div className="pl-[22%]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="REAN"
              className="block"
              style={{ width: "clamp(150px, 21cqw, 250px)" }}
            />
          </div>
          <div
            className="mt-[1.6%] flex flex-col gap-[0.9%]"
            style={fs(9, 1.18, 14)}
          >
            <div className="flex items-center">
              <span className="h-px w-[21%] bg-charcoal/35" />
              <span className="px-[1.1em] tracking-[0.12em] text-charcoal/85">
                <b className="font-bold text-charcoal">RE</b>-ANALYZE
              </span>
              <span className="h-px flex-1 bg-charcoal/35" />
            </div>
            <div className="flex items-center">
              <span className="h-px w-[34%] bg-charcoal/35" />
              <span className="px-[1.1em] tracking-[0.12em] text-charcoal/85">
                <b className="font-bold text-charcoal">RE</b>-DESIGN
              </span>
              <span className="h-px flex-1 bg-charcoal/35" />
            </div>
          </div>
          <div className="flex-[1.15]" />
          <dl
            className="ml-auto mr-[9%] grid w-[calc(100%-18%)] max-w-[330px] grid-cols-[auto_1fr] gap-x-[1.6em] gap-y-[0.9em] sm:w-[34%]"
            style={fs(10.5, 1.0, 13)}
          >
            <dt>CLIENT.</dt>
            <dd>{estimate.title}</dd>
            <dt>DATE.</dt>
            <dd>{dateText(estimate.quote_date)}</dd>
            <dd className="col-span-2 pt-[0.2em]" style={fs(9.5, 0.9, 12)}>
              단순한 숫자가 아닌, 공간 완성도를 위한 기준입니다.
            </dd>
          </dl>
          <div className="flex-[0.55]" />
        </section>
      )}

      {/* 갑지 (엑셀 갑지와 같은 모양: 가로 A4) */}
      <section
        className={`${LAND} flex flex-col pt-[6%] sm:aspect-[297/210]`}
        style={fs(11, 1.02, 13.5)}
      >
        {/* 위아래 두 줄: 종이 끝에서 끝까지 */}
        <div className="border-y-[1.5px] border-charcoal px-[13%] py-[3.1%] sm:px-[18.5%]">
          <h2 className="font-bold" style={fs(17, 1.75, 22)}>
            견 적 서 / ESTIMATE
          </h2>
        </div>
        <dl className="mt-[3.6%] grid grid-cols-[34%_1fr] gap-y-[0.95em] px-[13%] sm:grid-cols-[42%_1fr] sm:px-[18.5%]">
          {[
            [
              "고 객 명",
              estimate.customer_name
                ? `${spaced(estimate.customer_name)} 고객님`
                : "-",
            ],
            ["공 사 명", estimate.title],
            ["현 장 평 수", areaText(estimate)],
            ["제 출 일 자", estimate.quote_date],
          ].map(([k, v]) => (
            <Fragment key={k}>
              <dt className="whitespace-pre font-bold tracking-[0.2em]">{k}</dt>
              <dd>{v}</dd>
            </Fragment>
          ))}
          <dt className="font-bold tracking-[0.2em]">공 사 금 액</dt>
          <dd>
            <span className="flex flex-wrap items-baseline gap-x-[1em] gap-y-1">
              <span>₩</span>
              <span
                className="flex-1 text-right font-semibold tabular-nums"
                style={fs(12, 1.15, 15)}
              >
                {won(s.final)}
              </span>
              <span className="whitespace-nowrap text-charcoal/80">
                ( {estimate.round_unit > 1 ? "단위절사함, " : ""}
                {estimate.vat_included ? "부가세 포함" : "부가세 별도"} )
              </span>
            </span>
            <span className="mt-[0.6em] block text-center">
              일금{toKoreanAmount(s.final)}원정
            </span>
          </dd>
          <dt className="pt-[1.6em] font-bold tracking-[0.2em]">비 고</dt>
          <dd className="space-y-[0.75em] pt-[1.6em]">
            {noteLines.length > 0 ? (
              noteLines.map((n) => <p key={n}>{n}</p>)
            ) : (
              <p>-</p>
            )}
          </dd>
        </dl>
        <div className="mt-auto grid grid-cols-1 items-end gap-6 px-[13%] pt-[3%] sm:grid-cols-[42%_1fr] sm:gap-0 sm:px-[18.5%]">
          <div className="order-2 pb-[0.4em] sm:order-1">
            <ReanMark />
          </div>
          <div className="order-1 space-y-[0.55em] sm:order-2">
            <p className="font-bold text-charcoal/70">
              {spaced(companyName, " ")}
            </p>
            {company?.address && <p>{company.address}</p>}
            {company?.business_registration_number && (
              <p>
                {company.business_registration_number} (업태 : 건설, 종목 :
                인테리어)
              </p>
            )}
            <p>
              TEL : {company?.phone ?? ""}
              {company?.phone ? " / " : ""}
              {COMPANY_MOBILE}
            </p>
            {company?.representative_name && (
              <p>대표 : {spaced(company.representative_name)} (인)</p>
            )}
          </div>
        </div>
        <div
          className="mt-[2.6%] h-[clamp(6px,0.85cqw,10px)]" /* 아래 그라데이션: 종이 끝에서 끝까지 */
          style={{
            background:
              "linear-gradient(90deg, #E7DCCD 0%, #F2EBE2 45%, #FBF8F4 100%)",
          }}
        />
      </section>

      {/* 공사원가계산서 (상세 견적): 재료비 → 노무비 → 경비(법정 보험료 등) → 일반관리비 → 이윤 → 부가세 */}
      {st && (
        <section className={`${LAND_FLOW} px-5 py-8 sm:px-[5%]`}>
          <DocHeader title="공사원가계산서" estimate={estimate} />
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-[12px]">
              <colgroup>
                <col className="w-[92px]" />
                <col className="w-[190px]" />
                <col className="w-[130px]" />
                <col className="w-[64px]" />
                <col />
              </colgroup>
              <thead>
                <tr className="border-y-[1.5px] border-charcoal bg-[#F0EBE4] text-[11px]">
                  <th className="py-2 font-semibold tracking-[0.3em]">구 분</th>
                  <th className="py-2 text-left font-semibold tracking-[0.3em]">
                    비 목
                  </th>
                  <th className="py-2 pr-3 text-right font-semibold tracking-[0.3em]">
                    금 액
                  </th>
                  <th className="py-2 pr-2 text-right font-semibold">구성비</th>
                  <th className="py-2 pl-4 text-left font-semibold tracking-[0.2em]">
                    산 출 근 거
                  </th>
                </tr>
              </thead>
              <tbody>
                <StGroup
                  group="재료비"
                  rows={[
                    {
                      label: "직접재료비",
                      amount: st.material,
                      basis: "내역서 재료비 합계",
                    },
                    { label: "간접재료비", amount: 0, basis: "해당 없음" },
                  ]}
                  subtotal={st.material}
                  base={s.total}
                />
                <StGroup
                  group="노무비"
                  rows={[
                    {
                      label: "직접노무비",
                      amount: st.directLabor,
                      basis: "내역서 노무비 합계",
                    },
                    {
                      label: "간접노무비",
                      amount: st.indirectLabor,
                      basis: `직접노무비 × ${STATEMENT_RATES.indirectLabor}%`,
                    },
                  ]}
                  subtotal={st.labor}
                  base={s.total}
                />
                <StGroup
                  group="경비"
                  rows={st.expenseRows.map((r) => ({
                    label: r.label,
                    amount: r.amount,
                    basis: r.basis,
                  }))}
                  subtotal={st.expense}
                  base={s.total}
                />
                <StTotal
                  label="순 공 사 원 가"
                  amount={st.netCost}
                  base={s.total}
                  basis="재료비 + 노무비 + 경비"
                />
                <StSingle
                  group="일반관리비"
                  amount={st.overhead}
                  base={s.total}
                  basis={st.overheadBasis}
                />
                <StSingle
                  group="이 윤"
                  amount={st.profit}
                  base={s.total}
                  basis={st.profitBasis}
                />
                <StTotal
                  label="총 원 가 (공급가액)"
                  amount={st.supply}
                  base={s.total}
                  basis="순공사원가 + 일반관리비 + 이윤"
                />
                <StSingle
                  group="부가가치세"
                  amount={estimate.vat_included ? s.vat : 0}
                  base={s.total}
                  basis={
                    estimate.vat_included
                      ? `공급가액 × ${estimate.vat_rate}%`
                      : `부가세 별도 (${won(s.separateVat)}원)`
                  }
                />
                <tr className="border-t-[1.5px] border-charcoal font-bold">
                  <td className="py-2 text-center tracking-[0.2em]" colSpan={2}>
                    총 공 사 비
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums">
                    {won(s.total)}
                  </td>
                  <td className="py-2 pr-2 text-right tabular-nums">100%</td>
                  <td className="py-2 pl-4 text-charcoal/55 font-normal">
                    총원가 + 부가가치세
                  </td>
                </tr>
                {s.cut > 0 && (
                  <tr className="text-charcoal/60">
                    <td className="py-1.5 text-center" colSpan={2}>
                      단위 절사
                    </td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">
                      -{won(s.cut)}
                    </td>
                    <td />
                    <td className="py-1.5 pl-4">
                      {won(estimate.round_unit)}원 미만
                    </td>
                  </tr>
                )}
                <tr className="bg-charcoal font-bold text-white">
                  <td
                    className="py-2.5 text-center tracking-[0.3em]"
                    colSpan={2}
                  >
                    공 사 금 액
                  </td>
                  <td className="py-2.5 pr-3 text-right text-[14px] tabular-nums">
                    {won(s.final)}
                  </td>
                  <td />
                  <td className="py-2.5 pl-4 font-normal text-white/75">
                    일금 {toKoreanAmount(s.final)}원정
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-right text-[10px] text-charcoal/45">
            요율 근거 : {STATEMENT_RATES.basis} · 산재·고용·건강·연금 등
            고용노동부·보건복지부 2026년 고시 · 원 미만 버림
          </p>
        </section>
      )}

      {/* 집계표: 엑셀 집계표와 같은 칸 (품명·규격·단위·수량·재료비/노무비/합계 단가·금액·비고) — 상세·간단 모두 */}
      <section className={`${LAND_FLOW} px-4 py-8 sm:px-[4%]`}>
        <DocHeader title="집 계 표" estimate={estimate} />
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[900px] table-fixed border-collapse text-[11.5px]">
            <colgroup>
              {/* 엑셀 집계표 열 너비 비율: 8 · 25 · 15 · 7 · 7 · 14×6 · 20 */}
              <col style={{ width: "5%" }} />
              <col style={{ width: "16%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "4.5%" }} />
              <col style={{ width: "4.5%" }} />
              <col style={{ width: "8.8%" }} />
              <col style={{ width: "8.8%" }} />
              <col style={{ width: "8.8%" }} />
              <col style={{ width: "8.8%" }} />
              <col style={{ width: "8.8%" }} />
              <col style={{ width: "8.8%" }} />
              <col style={{ width: "7.2%" }} />
            </colgroup>
            <thead>
              <tr className="bg-[#F5F1EB] text-[10.5px]">
                <th rowSpan={2} className={XTH} />
                <th rowSpan={2} className={XTH}>
                  품&emsp;&emsp;명
                </th>
                <th rowSpan={2} className={XTH}>
                  규 격
                </th>
                <th rowSpan={2} className={XTH}>
                  단위
                </th>
                <th rowSpan={2} className={XTH}>
                  수량
                </th>
                <th colSpan={2} className={XTH}>
                  재 료 비
                </th>
                <th colSpan={2} className={XTH}>
                  노 무 비
                </th>
                <th colSpan={2} className={XTH}>
                  합 계
                </th>
                <th rowSpan={2} className={XTH}>
                  비고
                </th>
              </tr>
              <tr className="bg-[#F5F1EB] text-[10.5px]">
                {["단가", "금액", "단가", "금액", "단가", "금액"].map(
                  (t, i) => (
                    <th key={i} className={XTH}>
                      {t}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              <tr className="font-semibold">
                <td className={`${XTD} text-center`}>▣</td>
                <td className={XTD} colSpan={11}>
                  {estimate.title}
                </td>
              </tr>
              <tr className="font-semibold">
                <td className={`${XTD} text-center`}>가</td>
                <td className={XTD} colSpan={11}>
                  직접공사비
                </td>
              </tr>
              {ESTIMATE_CATEGORIES.map((c) => {
                const row = s.categories.find((x) => x.key === c.key);
                if (!row && c.key === "기타") return null;
                const m = row?.material ?? 0;
                const l = row?.labor ?? 0;
                return (
                  <tr key={c.key}>
                    <td className={`${XTD} text-center`}>{c.no}</td>
                    <td className={XTD}>{c.label}</td>
                    <td className={XTD} />
                    <td className={`${XTD} text-center`}>식</td>
                    <td className={`${XTD} text-center`}>1</td>
                    <td className={XNUM}>{dash(m)}</td>
                    <td className={XNUM}>{dash(m)}</td>
                    <td className={XNUM}>{dash(l)}</td>
                    <td className={XNUM}>{dash(l)}</td>
                    <td className={XNUM} />
                    <td className={`${XNUM} font-medium`}>{dash(m + l)}</td>
                    <td className={`${XTD} text-right`}>
                      {pct(m + l, s.direct)}
                    </td>
                  </tr>
                );
              })}
              <BlankRows count={3} />
              <SumBand
                label="소계"
                material={s.material}
                labor={s.labor}
                total={s.direct}
              />

              {/* 나. 간접공사비: 항목은 항상 보이고, %는 견적서 편집 화면에서 정한다 */}
              <tr className="font-semibold">
                <td className={`${XTD} text-center`}>나</td>
                <td className={XTD} colSpan={11}>
                  간접공사비
                </td>
              </tr>
              {indirectRows.map((r) => (
                <tr key={r.no}>
                  <td className={`${XTD} text-center`}>{r.no}</td>
                  <td className={XTD}>{r.label}</td>
                  <td className={`${XTD}`}>{r.basis}</td>
                  <td className={`${XTD} text-center`}>%</td>
                  <td className={`${XTD} text-center tabular-nums`}>
                    {r.rate ? r.rate : ""}
                  </td>
                  <td className={XTD} />
                  <td className={XNUM}>{dash(r.material)}</td>
                  <td className={XTD} />
                  <td className={XNUM}>{dash(r.labor)}</td>
                  <td className={XTD} />
                  <td className={XNUM}>{dash(r.total)}</td>
                  <td className={`${XTD} text-[10px]`}>{r.note ?? ""}</td>
                </tr>
              ))}
              <BlankRows count={2} />
              <SumBand
                label="소계"
                material={indirectRows.reduce((a, r) => a + r.material, 0)}
                labor={indirectRows.reduce((a, r) => a + r.labor, 0)}
                total={s.indirect}
              />

              <tr className="font-semibold">
                <td className={`${XTD} text-center`}>다</td>
                <td className={XTD}>부가가치세</td>
                <td className={`${XTD} font-normal`}>
                  {estimate.vat_included ? "총원가의 구성비" : "부가세 별도"}
                </td>
                <td className={`${XTD} text-center font-normal`}>%</td>
                <td className={`${XTD} text-center font-normal tabular-nums`}>
                  {estimate.vat_rate}
                </td>
                <td className={XTD} colSpan={5} />
                <td className={XNUM}>
                  {estimate.vat_included ? won(s.vat) : "별도"}
                </td>
                <td className={`${XTD} text-right text-[10px] font-normal`}>
                  {estimate.vat_included ? "" : won(s.separateVat)}
                </td>
              </tr>
              <SumBand label="총계" total={s.total} />
              <tr className="bg-charcoal font-bold text-white">
                <td className="border border-charcoal px-2 py-1" />
                <td className="border border-charcoal px-2 py-1 text-center tracking-[0.3em]">
                  공사금액
                </td>
                <td
                  className="border border-charcoal px-2 py-1 text-[11px] font-normal text-white"
                  colSpan={8}
                >
                  {s.cut > 0
                    ? `${won(estimate.round_unit)}원 미만 절사 (-${won(s.cut)})`
                    : ""}
                </td>
                <td className="border border-charcoal px-2 py-1 text-right text-[13px] tabular-nums">
                  {won(s.final)}
                </td>
                <td className="border border-charcoal" />
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 간단 견적 내역: 엑셀 표 대신 체크리스트 (집계표 다음) */}
      {!st && (
        <ChecklistSheet estimate={estimate} byCategory={byCategory} s={s} />
      )}

      {/* 내역서: 엑셀 내역서와 같은 칸 (NO·품명·규격·단위·수량·재료비/노무비/합계 단가·금액·비고) */}
      {showDetail && st && (
        <section className={`${LAND_FLOW} px-4 py-8 sm:px-[4%]`}>
          <DocHeader title="내 역 서" estimate={estimate} />
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[980px] table-fixed border-collapse text-[11.5px]">
              <colgroup>
                {/* 엑셀 내역서 열 너비 비율: 9 · 25 · 40 · 5 · 10 · 13×6 · 26 */}
                <col style={{ width: "4.6%" }} />
                <col style={{ width: "13%" }} />
                <col style={{ width: "18%" }} />
                <col style={{ width: "4%" }} />
                <col style={{ width: "5%" }} />
                <col style={{ width: "7.4%" }} />
                <col style={{ width: "7.4%" }} />
                <col style={{ width: "7.4%" }} />
                <col style={{ width: "7.4%" }} />
                <col style={{ width: "7.4%" }} />
                <col style={{ width: "7.4%" }} />
                <col style={{ width: "11%" }} />
              </colgroup>
              <thead>
                <tr className="bg-[#F0EBE4] text-[11px]">
                  <th rowSpan={2} className={XTH}>
                    NO
                  </th>
                  <th rowSpan={2} className={XTH}>
                    품&emsp;&emsp;명
                  </th>
                  <th rowSpan={2} className={XTH}>
                    규&emsp;&emsp;격
                  </th>
                  <th rowSpan={2} className={XTH}>
                    단위
                  </th>
                  <th rowSpan={2} className={XTH}>
                    수량
                  </th>
                  <th colSpan={2} className={XTH}>
                    재 료 비
                  </th>
                  <th colSpan={2} className={XTH}>
                    노 무 비
                  </th>
                  <th colSpan={2} className={XTH}>
                    합 계
                  </th>
                  <th rowSpan={2} className={XTH}>
                    비고
                  </th>
                </tr>
                <tr className="bg-[#F0EBE4] text-[11px]">
                  {["단가", "금액", "단가", "금액", "단가", "금액"].map(
                    (t, i) => (
                      <th key={i} className={XTH}>
                        {t}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {[...byCategory.entries()].map(([cat, subs]) => (
                  <CategoryBlock
                    key={cat}
                    no={categoryNo(cat)}
                    label={categoryLabel(cat)}
                    subs={subs}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

// 집계표 여유 빈 줄 (엑셀처럼 소계 앞에)
function BlankRows({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, r) => (
        <tr key={r} className="h-[23px]">
          {Array.from({ length: 12 }, (_, c) => (
            <td key={c} className="border border-charcoal/15" />
          ))}
        </tr>
      ))}
    </>
  );
}

// 집계표 소계·총계 줄: 얇게, 밝은 그라데이션
function SumBand({
  label,
  material,
  labor,
  total,
}: {
  label: string;
  material?: number;
  labor?: number;
  total: number;
}) {
  const cell = "border border-charcoal/15 px-2 py-[3px]";
  return (
    <tr
      className="font-bold"
      style={{
        background:
          "linear-gradient(90deg, #EFE6DA 0%, #F7F2EC 55%, #FFFFFF 100%)",
      }}
    >
      <td className={cell} />
      <td className={`${cell} text-center tracking-[0.5em]`}>{label}</td>
      <td className={cell} colSpan={4} />
      <td className={`${cell} text-right tabular-nums`}>
        {material !== undefined ? dash(material) : ""}
      </td>
      <td className={cell} />
      <td className={`${cell} text-right tabular-nums`}>
        {labor !== undefined ? dash(labor) : ""}
      </td>
      <td className={cell} />
      <td className={`${cell} text-right tabular-nums`}>{won(total)}</td>
      <td className={cell} />
    </tr>
  );
}

// 내역서 공종 묶음: 공종 줄 → 세부공종(소계) → [합계]
function CategoryBlock({
  no,
  label,
  subs,
}: {
  no: number;
  label: string;
  subs: Map<string, DocLine[]>;
}) {
  const all = [...subs.values()].flat();
  const m = all.reduce((acc, l) => acc + lineAmounts(l).material, 0);
  const l = all.reduce((acc, x) => acc + lineAmounts(x).labor, 0);
  return (
    <>
      <tr className="bg-stone-50 font-bold">
        <td className={`${XTD} text-center`}>{no}</td>
        <td className={XTD} colSpan={11}>
          {label}
        </td>
      </tr>
      {[...subs.entries()].map(([sub, list]) => (
        <SubBlock key={sub || "-"} sub={sub} list={list} />
      ))}
      <tr className="bg-[#F0EBE4] font-bold">
        <td className={XTD} />
        <td className={`${XTD} text-center`} colSpan={4}>
          [ 합&emsp;&emsp;계 ]
        </td>
        <td className={XTD} />
        <td className={XNUM}>{dash(m)}</td>
        <td className={XTD} />
        <td className={XNUM}>{dash(l)}</td>
        <td className={XTD} />
        <td className={XNUM}>{dash(m + l)}</td>
        <td className={XTD} />
      </tr>
    </>
  );
}

function SubBlock({ sub, list }: { sub: string; list: DocLine[] }) {
  const code = sub.match(/^(\d+-\d+)\s*(.*)$/);
  const m = list.reduce((acc, l) => acc + lineAmounts(l).material, 0);
  const lb = list.reduce((acc, l) => acc + lineAmounts(l).labor, 0);
  return (
    <>
      {sub && (
        <tr className="font-semibold">
          <td className={`${XTD} text-center`}>{code ? code[1] : ""}</td>
          <td className={XTD} colSpan={11}>
            {code ? code[2] : sub}
          </td>
        </tr>
      )}
      {list.map((l, i) => {
        const a = lineAmounts(l);
        const qty = Number(l.qty);
        return (
          <tr
            key={`${l.name}-${i}`}
            className={a.total === 0 ? "text-charcoal/45" : ""}
          >
            <td className={XTD} />
            <td className={XTD}>{l.name}</td>
            <td className={`${XTD} text-charcoal/70`}>{l.spec}</td>
            <td className={`${XTD} text-center`}>{l.unit}</td>
            <td className={XNUM}>
              {qty
                ? qty.toLocaleString("ko-KR", { maximumFractionDigits: 2 })
                : "-"}
            </td>
            <td className={XNUM}>
              {l.material_price ? won(Number(l.material_price)) : ""}
            </td>
            <td className={XNUM}>{dash(a.material)}</td>
            <td className={XNUM}>
              {l.labor_price ? won(Number(l.labor_price)) : ""}
            </td>
            <td className={XNUM}>{dash(a.labor)}</td>
            <td className={XNUM}>
              {Number(l.material_price) + Number(l.labor_price)
                ? won(Number(l.material_price) + Number(l.labor_price))
                : ""}
            </td>
            <td className={`${XNUM} font-medium`}>{dash(a.total)}</td>
            <td className={`${XTD} text-charcoal/60`}>{l.note}</td>
          </tr>
        );
      })}
      {sub && (
        <tr className="font-semibold">
          <td className={XTD} />
          <td className={`${XTD} text-center`} colSpan={4}>
            [ 소&emsp;&emsp;계 ]
          </td>
          <td className={XTD} />
          <td className={XNUM}>{dash(m)}</td>
          <td className={XTD} />
          <td className={XNUM}>{dash(lb)}</td>
          <td className={XTD} />
          <td className={XNUM}>{dash(m + lb)}</td>
          <td className={XTD} />
        </tr>
      )}
    </>
  );
}

// 간단 견적 내역서: 체크(☑)한 품목만, 공종별 파스텔 머리 + 재료비·노무비 단가/금액 (휴대폰은 옆으로 밀어서 보기)
function ChecklistSheet({
  estimate,
  byCategory,
  s,
}: {
  estimate: DocEstimate;
  byCategory: Map<string, Map<string, DocLine[]>>;
  s: ReturnType<typeof calcEstimate>;
}) {
  const groups = [...byCategory.entries()]
    .map(([cat, subs]) => {
      const list = [...subs.entries()]
        .sort(([a], [b]) => a.localeCompare(b, "ko", { numeric: true }))
        .flatMap(([sub, ls]) =>
          ls.filter((l) => Number(l.qty) > 0).map((l) => ({ ...l, sub })),
        );
      const m = list.reduce((a, l) => a + lineAmounts(l).material, 0);
      const lb = list.reduce((a, l) => a + lineAmounts(l).labor, 0);
      return { cat, list, m, lb };
    })
    .filter((g) => g.list.length > 0);
  const td = "border-b border-charcoal/10 px-2 py-1.5 align-middle";
  const num = `${td} text-right tabular-nums whitespace-nowrap`;
  return (
    <section className={`${LAND_FLOW} px-4 py-8 sm:px-[4%]`}>
      <DocHeader title="내 역 서" estimate={estimate} />
      <p className="mt-2 text-[11px] text-charcoal/50 sm:hidden">
        ← 표를 옆으로 밀어서 재료비·노무비를 볼 수 있어요
      </p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[980px] table-fixed border-collapse text-[11.5px]">
          <colgroup>
            <col style={{ width: "3.6%" }} />
            <col style={{ width: "15%" }} />
            <col style={{ width: "20%" }} />
            <col style={{ width: "4.6%" }} />
            <col style={{ width: "5.4%" }} />
            <col style={{ width: "8.4%" }} />
            <col style={{ width: "9%" }} />
            <col style={{ width: "8.4%" }} />
            <col style={{ width: "9%" }} />
            <col style={{ width: "10%" }} />
            <col />
          </colgroup>
          <thead>
            <tr className="bg-[#F5F1EB] text-[10.5px]">
              <th rowSpan={2} className={XTH} />
              <th rowSpan={2} className={XTH}>
                품&emsp;&emsp;명
              </th>
              <th rowSpan={2} className={XTH}>
                규&emsp;&emsp;격
              </th>
              <th rowSpan={2} className={XTH}>
                단위
              </th>
              <th rowSpan={2} className={XTH}>
                수량
              </th>
              <th colSpan={2} className={XTH}>
                재 료 비
              </th>
              <th colSpan={2} className={XTH}>
                노 무 비
              </th>
              <th rowSpan={2} className={XTH}>
                합 계
              </th>
              <th rowSpan={2} className={XTH}>
                비고
              </th>
            </tr>
            <tr className="bg-[#F5F1EB] text-[10.5px]">
              {["단가", "금액", "단가", "금액"].map((t, i) => (
                <th key={i} className={XTH}>
                  {t}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <Fragment key={g.cat}>
                {/* 공종 머리: 파스텔 그라데이션 */}
                <tr
                  className="font-bold"
                  style={{
                    background: PASTEL[(categoryNo(g.cat) - 1) % PASTEL.length],
                  }}
                >
                  <td
                    className="border-y border-charcoal/15 px-2 py-1.5"
                    colSpan={5}
                  >
                    {categoryNo(g.cat)}. {categoryLabel(g.cat)}
                  </td>
                  <td className="border-y border-charcoal/15" />
                  <td className="border-y border-charcoal/15 px-2 py-1.5 text-right tabular-nums">
                    {dash(g.m)}
                  </td>
                  <td className="border-y border-charcoal/15" />
                  <td className="border-y border-charcoal/15 px-2 py-1.5 text-right tabular-nums">
                    {dash(g.lb)}
                  </td>
                  <td className="border-y border-charcoal/15 px-2 py-1.5 text-right tabular-nums">
                    {won(g.m + g.lb)}
                  </td>
                  <td className="border-y border-charcoal/15" />
                </tr>
                {g.list.map((l, i) => {
                  const a = lineAmounts(l);
                  const newSub =
                    l.sub && (i === 0 || g.list[i - 1].sub !== l.sub);
                  return (
                    <Fragment key={`${l.name}-${i}`}>
                      {newSub && (
                        <tr className="bg-stone-50/80">
                          <td className={td} />
                          <td
                            className={`${td} text-[10.5px] font-semibold tracking-[0.1em]`}
                            colSpan={10}
                          >
                            {l.sub.replace(/^\d+-\d+\s*/, "")}
                          </td>
                        </tr>
                      )}
                      <tr>
                        <td className={`${td} text-center text-orange-600`}>
                          ☑
                        </td>
                        <td className={`${td} font-medium`}>{l.name}</td>
                        <td className={td}>{l.spec}</td>
                        <td className={`${td} text-center`}>{l.unit}</td>
                        <td className={num}>
                          {Number(l.qty).toLocaleString("ko-KR", {
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td className={num}>
                          {Number(l.material_price)
                            ? won(Number(l.material_price))
                            : ""}
                        </td>
                        <td className={num}>{dash(a.material)}</td>
                        <td className={num}>
                          {Number(l.labor_price)
                            ? won(Number(l.labor_price))
                            : ""}
                        </td>
                        <td className={num}>{dash(a.labor)}</td>
                        <td className={`${num} font-semibold`}>
                          {won(a.total)}
                        </td>
                        <td className={`${td} text-[10.5px]`}>{l.note}</td>
                      </tr>
                    </Fragment>
                  );
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 break-inside-avoid overflow-hidden rounded-lg border border-charcoal/20 text-[12.5px]">
        <div className="flex justify-between px-4 py-2">
          <span>
            직접공사비 합계 (재료비 {won(s.material)} · 노무비 {won(s.labor)})
          </span>
          <span className="font-semibold tabular-nums">{won(s.direct)}원</span>
        </div>
        {s.indirect > 0 && (
          <div className="flex justify-between border-t border-charcoal/10 px-4 py-2">
            <span>간접공사비</span>
            <span className="tabular-nums">{won(s.indirect)}원</span>
          </div>
        )}
        <div className="flex justify-between border-t border-charcoal/10 px-4 py-2">
          <span>부가가치세</span>
          <span className="tabular-nums">
            {estimate.vat_included
              ? `${won(s.vat)}원`
              : `별도 (${won(s.separateVat)}원)`}
          </span>
        </div>
        {s.cut > 0 && (
          <div className="flex justify-between border-t border-charcoal/10 px-4 py-2">
            <span>단위 절사 ({won(estimate.round_unit)}원 미만)</span>
            <span className="tabular-nums">-{won(s.cut)}원</span>
          </div>
        )}
        <div className="flex items-baseline justify-between bg-charcoal px-4 py-2.5 font-bold text-white">
          <span className="tracking-[0.3em]">공 사 금 액</span>
          <span className="text-[15px] tabular-nums">
            {won(s.final)}원{" "}
            <span className="text-[11px] font-normal">
              일금 {toKoreanAmount(s.final)}원정
            </span>
          </span>
        </div>
      </div>
    </section>
  );
}

// 공통 머리 (공사원가계산서·집계표)
function DocHeader({
  title,
  estimate,
}: {
  title: string;
  estimate: DocEstimate;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-2 border-b-[1.5px] border-charcoal pb-3">
      <div>
        <h2 className="text-xl font-bold tracking-[0.3em]">{title}</h2>
        <p className="mt-1 text-xs text-charcoal/60">
          ▣ {estimate.title}
          {estimate.customer_name ? ` · ${estimate.customer_name} 고객님` : ""}
        </p>
      </div>
      <p className="text-right text-xs font-semibold text-charcoal/70">
        {areaText(estimate)}
        <span className="ml-3 font-normal text-charcoal/55">
          제출일 {estimate.quote_date}
        </span>
      </p>
    </div>
  );
}

// 갑지 왼쪽 아래: REAN 로고 + 공간을 다시 그리다
function ReanMark() {
  return (
    <div className="flex items-end gap-[0.9em]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.png"
        alt="REAN"
        className="block opacity-85"
        style={{ width: "clamp(72px, 8.6cqw, 106px)" }}
      />
      <span
        className="mb-[0.1em] border-l border-charcoal/25 pl-[0.9em] tracking-[0.32em] text-charcoal/55"
        style={fs(9.5, 0.95, 12)}
      >
        공간을 다시 그리다
      </span>
    </div>
  );
}

// 공사원가계산서 줄들
type StRow = { label: string; amount: number; basis: string };

function StGroup({
  group,
  rows,
  subtotal,
  base,
}: {
  group: string;
  rows: StRow[];
  subtotal: number;
  base: number;
}) {
  return (
    <>
      {rows.map((r, i) => (
        <tr
          key={r.label}
          className={`border-b border-charcoal/10 ${r.amount === 0 ? "text-charcoal/40" : ""}`}
        >
          {i === 0 && (
            <td
              rowSpan={rows.length + 1}
              className="border-r border-charcoal/15 py-1.5 text-center align-middle font-semibold text-charcoal tracking-[0.2em]"
            >
              {group}
            </td>
          )}
          <td className="py-1.5 pl-3">{r.label}</td>
          <td className="py-1.5 pr-3 text-right tabular-nums">
            {r.amount ? won(r.amount) : "-"}
          </td>
          <td className="py-1.5 pr-2 text-right tabular-nums text-charcoal/50">
            {pct(r.amount, base)}
          </td>
          <td className="py-1.5 pl-4 text-charcoal/55">{r.basis}</td>
        </tr>
      ))}
      <tr className="bg-[#F0EBE4] font-semibold">
        <td className="py-1.5 pl-3 tracking-[0.2em]">소 계</td>
        <td className="py-1.5 pr-3 text-right tabular-nums">{won(subtotal)}</td>
        <td className="py-1.5 pr-2 text-right tabular-nums">
          {pct(subtotal, base)}
        </td>
        <td />
      </tr>
    </>
  );
}

function StSingle({
  group,
  amount,
  base,
  basis,
}: {
  group: string;
  amount: number;
  base: number;
  basis: string;
}) {
  return (
    <tr className="border-b border-charcoal/10">
      <td
        className="border-r border-charcoal/15 py-2 text-center font-semibold tracking-[0.2em]"
        colSpan={2}
      >
        {group}
      </td>
      <td className="py-2 pr-3 text-right tabular-nums">
        {amount ? won(amount) : "-"}
      </td>
      <td className="py-2 pr-2 text-right tabular-nums text-charcoal/50">
        {pct(amount, base)}
      </td>
      <td className="py-2 pl-4 text-charcoal/55">{basis}</td>
    </tr>
  );
}

function StTotal({
  label,
  amount,
  base,
  basis,
}: {
  label: string;
  amount: number;
  base: number;
  basis: string;
}) {
  return (
    <tr className="border-y border-charcoal/40 font-bold">
      <td className="py-2 text-center tracking-[0.2em]" colSpan={2}>
        {label}
      </td>
      <td className="py-2 pr-3 text-right tabular-nums">{won(amount)}</td>
      <td className="py-2 pr-2 text-right tabular-nums">{pct(amount, base)}</td>
      <td className="py-2 pl-4 font-normal text-charcoal/55">{basis}</td>
    </tr>
  );
}
