import { calcEstimate, categoryLabel, categoryNo, lineAmounts, toKoreanAmount, won } from "@/lib/estimate";

// 견적서 문서: 표지 → 갑지 → 집계표 → 내역서 (인쇄 화면과 고객 링크가 같이 쓴다)

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

const PAGE = "estimate-page mx-auto w-full max-w-[860px] bg-white px-8 py-10 sm:px-12";
const TH = "border border-charcoal/25 bg-stone-100 px-2 py-1.5 text-center text-xs font-semibold";
const TD = "border border-charcoal/20 px-2 py-1.5 text-xs";
const NUM = `${TD} text-right tabular-nums whitespace-nowrap`;

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
  const numeric = lines.map((l) => ({ ...l, qty: Number(l.qty), material_price: Number(l.material_price), labor_price: Number(l.labor_price) }));
  const s = calcEstimate(numeric, {
    expense: Number(estimate.expense_rate),
    misc: Number(estimate.misc_rate),
    profit: Number(estimate.profit_rate),
    vat: Number(estimate.vat_rate),
    vatIncluded: estimate.vat_included,
    roundUnit: estimate.round_unit,
  });
  const noteLines = (estimate.notes ?? "").split("\n").map((t) => t.trim()).filter(Boolean);
  const companyName = company?.company_name ?? "리안디자인";

  // 내역서: 공종 → 세부공종 → 품목
  const byCategory = new Map<string, Map<string, typeof numeric>>();
  for (const l of [...numeric].sort((a, b) => categoryNo(a.category) - categoryNo(b.category))) {
    const subs = byCategory.get(l.category) ?? new Map<string, typeof numeric>();
    const key = l.subcategory ?? "";
    subs.set(key, [...(subs.get(key) ?? []), l]);
    byCategory.set(l.category, subs);
  }

  return (
    <div className="estimate-doc flex flex-col gap-6 text-charcoal">
      {showCover && (
        <section className={`${PAGE} flex min-h-[1000px] flex-col justify-between`}>
          <div>
            <p className="text-sm font-bold tracking-[0.3em]">REAN DESIGN</p>
            <p className="mt-1 text-xs tracking-[0.2em] text-charcoal/50">RE-ANALYZE · RE-DESIGN</p>
          </div>
          <div>
            <p className="text-5xl font-bold tracking-tight sm:text-6xl">ESTIMATE</p>
            <p className="mt-2 text-2xl font-semibold">견 적 서</p>
            <div className="mt-10 h-1 w-24 bg-orange-500" />
            <dl className="mt-10 grid grid-cols-[90px_1fr] gap-y-3 text-base">
              <dt className="font-semibold tracking-widest text-charcoal/50">CLIENT.</dt>
              <dd>{estimate.customer_name ?? "-"}</dd>
              <dt className="font-semibold tracking-widest text-charcoal/50">SITE.</dt>
              <dd>{estimate.title}</dd>
              <dt className="font-semibold tracking-widest text-charcoal/50">DATE.</dt>
              <dd>{dateText(estimate.quote_date)}</dd>
            </dl>
          </div>
          <div>
            <p className="text-lg font-medium">단순한 숫자가 아닌, 공간 완성도를 위한 기준입니다.</p>
            <p className="mt-6 text-sm text-charcoal/60">
              {companyName} · {company?.address ?? ""} · {company?.phone ?? ""}
            </p>
          </div>
        </section>
      )}

      {/* 갑지 */}
      <section className={PAGE}>
        <h2 className="text-center text-3xl font-bold tracking-[0.4em]">견 적 서</h2>
        <p className="mt-1 text-center text-sm tracking-[0.3em] text-charcoal/50">ESTIMATE</p>
        <table className="mt-8 w-full border-collapse text-sm">
          <tbody>
            {[
              ["고 객 명", `${estimate.customer_name ?? "-"} ${estimate.customer_name ? "고객님" : ""}`],
              ["공 사 명", estimate.title],
              ["현 장 평 수", areaText(estimate)],
              ["제 출 일 자", estimate.quote_date],
            ].map(([k, v]) => (
              <tr key={k}>
                <th className="w-32 border border-charcoal/25 bg-stone-100 px-3 py-2.5 text-center font-semibold tracking-widest">{k}</th>
                <td className="border border-charcoal/20 px-4 py-2.5">{v}</td>
              </tr>
            ))}
            <tr>
              <th className="border border-charcoal/25 bg-stone-100 px-3 py-3 text-center font-semibold tracking-widest">공 사 금 액</th>
              <td className="border border-charcoal/20 px-4 py-3">
                <p className="text-xl font-bold tabular-nums">
                  ￦ {won(s.final)}
                  <span className="ml-2 text-xs font-normal text-charcoal/50">
                    ({estimate.round_unit > 1 ? "단위절사함, " : ""}부가세 {estimate.vat_included ? `${estimate.vat_rate}% 포함` : "별도"})
                  </span>
                </p>
                <p className="mt-1 text-sm">일금 {toKoreanAmount(s.final)}원정</p>
              </td>
            </tr>
            <tr>
              <th className="border border-charcoal/25 bg-stone-100 px-3 py-3 text-center font-semibold tracking-widest">비 고</th>
              <td className="border border-charcoal/20 px-4 py-3">
                {noteLines.length > 0 ? (
                  <ul className="list-disc pl-4 text-sm">
                    {noteLines.map((n) => (
                      <li key={n}>{n}</li>
                    ))}
                  </ul>
                ) : (
                  "-"
                )}
              </td>
            </tr>
          </tbody>
        </table>
        <div className="mt-10 text-right text-sm leading-7">
          <p className="text-lg font-bold">{companyName}</p>
          {company?.address && <p>{company.address}</p>}
          {company?.business_registration_number && <p>{company.business_registration_number} (업태 : 건설, 종목 : 인테리어)</p>}
          {company?.phone && <p>TEL : {company.phone}</p>}
          {company?.representative_name && <p>대표 : {company.representative_name} (인)</p>}
        </div>
      </section>

      {/* 집계표 */}
      <section className={PAGE}>
        <h2 className="text-center text-2xl font-bold tracking-[0.4em]">집 계 표</h2>
        <p className="mt-1 text-right text-xs text-charcoal/50">{areaText(estimate)}</p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[600px] border-collapse">
            <thead>
              <tr>
                <th className={TH}>NO</th>
                <th className={TH}>공 종</th>
                <th className={TH}>재 료 비</th>
                <th className={TH}>노 무 비</th>
                <th className={TH}>합 계</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={5} className={`${TD} bg-stone-50 font-semibold`}>가. 직접공사비</td>
              </tr>
              {s.categories.map((c, i) => (
                <tr key={c.key}>
                  <td className={`${TD} text-center`}>{i + 1}</td>
                  <td className={TD}>{c.label}</td>
                  <td className={NUM}>{won(c.material)}</td>
                  <td className={NUM}>{won(c.labor)}</td>
                  <td className={NUM}>{won(c.total)}</td>
                </tr>
              ))}
              <tr className="font-semibold">
                <td colSpan={2} className={`${TD} text-center`}>소 계</td>
                <td className={NUM}>{won(s.material)}</td>
                <td className={NUM}>{won(s.labor)}</td>
                <td className={NUM}>{won(s.direct)}</td>
              </tr>
              {s.indirect > 0 && (
                <>
                  <tr>
                    <td colSpan={5} className={`${TD} bg-stone-50 font-semibold`}>나. 간접공사비</td>
                  </tr>
                  <tr>
                    <td className={`${TD} text-center`}>1</td>
                    <td className={TD}>경비 (재료비의 {estimate.expense_rate}%)</td>
                    <td className={NUM}>{won(s.expense)}</td>
                    <td className={NUM} />
                    <td className={NUM}>{won(s.expense)}</td>
                  </tr>
                  <tr>
                    <td className={`${TD} text-center`}>2</td>
                    <td className={TD}>공과잡비 (재료비의 {estimate.misc_rate}%)</td>
                    <td className={NUM}>{won(s.misc)}</td>
                    <td className={NUM} />
                    <td className={NUM}>{won(s.misc)}</td>
                  </tr>
                  <tr>
                    <td className={`${TD} text-center`}>3</td>
                    <td className={TD}>기업이윤 (직접공사비의 {estimate.profit_rate}%)</td>
                    <td className={NUM}>{won((s.material * Number(estimate.profit_rate)) / 100)}</td>
                    <td className={NUM}>{won((s.labor * Number(estimate.profit_rate)) / 100)}</td>
                    <td className={NUM}>{won(s.profit)}</td>
                  </tr>
                </>
              )}
              <tr>
                <td colSpan={2} className={`${TD} text-center`}>
                  다. 부가가치세 {estimate.vat_included ? `(${estimate.vat_rate}%)` : "(별도)"}
                </td>
                <td colSpan={2} className={NUM} />
                <td className={NUM}>{estimate.vat_included ? won(s.vat) : "별도"}</td>
              </tr>
              <tr className="font-bold">
                <td colSpan={4} className={`${TD} text-center`}>총 계</td>
                <td className={NUM}>{won(s.total)}</td>
              </tr>
              {s.cut > 0 && (
                <tr>
                  <td colSpan={4} className={`${TD} text-center text-charcoal/60`}>단위 절사</td>
                  <td className={`${NUM} text-charcoal/60`}>-{won(s.cut)}</td>
                </tr>
              )}
              <tr className="bg-orange-50 font-bold">
                <td colSpan={4} className={`${TD} text-center`}>공 사 금 액</td>
                <td className={NUM}>{won(s.final)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 내역서 */}
      {showDetail && (
        <section className={PAGE}>
          <h2 className="text-center text-2xl font-bold tracking-[0.4em]">내 역 서</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse">
              <thead>
                <tr>
                  <th className={TH}>품 명</th>
                  <th className={TH}>규 격</th>
                  <th className={TH}>단위</th>
                  <th className={TH}>수량</th>
                  <th className={TH}>재료비</th>
                  <th className={TH}>노무비</th>
                  <th className={TH}>합 계</th>
                  <th className={TH}>비고</th>
                </tr>
              </thead>
              <tbody>
                {[...byCategory.entries()].map(([cat, subs]) => {
                  const catLines = [...subs.values()].flat();
                  const catSum = catLines.reduce(
                    (acc, l) => {
                      const a = lineAmounts(l);
                      return { m: acc.m + a.material, l: acc.l + a.labor };
                    },
                    { m: 0, l: 0 }
                  );
                  return (
                    <CategoryBlock key={cat} label={`${categoryNo(cat)}. ${categoryLabel(cat)}`} subs={subs} sum={catSum} />
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function CategoryBlock({
  label,
  subs,
  sum,
}: {
  label: string;
  subs: Map<string, DocLine[]>;
  sum: { m: number; l: number };
}) {
  return (
    <>
      <tr>
        <td colSpan={8} className={`${TD} bg-stone-100 font-bold`}>
          {label}
        </td>
      </tr>
      {[...subs.entries()].map(([sub, list]) => (
        <SubBlock key={sub || "-"} sub={sub} list={list} />
      ))}
      <tr className="font-semibold">
        <td colSpan={4} className={`${TD} text-center`}>[ 합 계 ]</td>
        <td className={NUM}>{won(sum.m)}</td>
        <td className={NUM}>{won(sum.l)}</td>
        <td className={NUM}>{won(sum.m + sum.l)}</td>
        <td className={TD} />
      </tr>
    </>
  );
}

function SubBlock({ sub, list }: { sub: string; list: DocLine[] }) {
  return (
    <>
      {sub && (
        <tr>
          <td colSpan={8} className={`${TD} font-semibold text-charcoal/70`}>
            {sub}
          </td>
        </tr>
      )}
      {list.map((l, i) => {
        const a = lineAmounts(l);
        return (
          <tr key={`${l.name}-${i}`}>
            <td className={TD}>{l.name}</td>
            <td className={`${TD} text-charcoal/70`}>{l.spec}</td>
            <td className={`${TD} text-center`}>{l.unit}</td>
            <td className={NUM}>{Number(l.qty).toLocaleString("ko-KR", { maximumFractionDigits: 2 })}</td>
            <td className={NUM}>{a.material ? won(a.material) : ""}</td>
            <td className={NUM}>{a.labor ? won(a.labor) : ""}</td>
            <td className={NUM}>{won(a.total)}</td>
            <td className={`${TD} text-charcoal/60`}>{l.note}</td>
          </tr>
        );
      })}
    </>
  );
}
