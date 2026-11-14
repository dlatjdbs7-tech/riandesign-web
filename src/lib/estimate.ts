// 웹 견적서 계산·표시 규칙 (리안 엑셀 견적서 Ver 6.0과 같은 계산)
//   줄 금액     = 수량 × 단가 (원 미만 버림)
//   경비        = 재료비 합계 × 경비율          (엑셀 수식 그대로: 노무비 제외)
//   공과잡비    = 재료비 합계 × 공과잡비율
//   기업이윤    = (재료비 + 노무비) × 이윤율
//   부가세      = (직접공사비 + 간접공사비) × 부가세율   (부가세 별도면 0으로 두고 따로 표기)
//   최종 금액   = 절사 단위(기본 10만원) 미만 버림

export const ESTIMATE_CATEGORIES = [
  { key: "허가및공통가설", no: 1, label: "허가 사항 및 공통가설공사" },
  { key: "철거및습식", no: 2, label: "철거 및 습식공사" },
  { key: "도어및목공", no: 3, label: "도어 및 목공사" },
  { key: "타일및화장실", no: 4, label: "타일공사 및 화장실공사" },
  { key: "수장", no: 5, label: "수장공사" },
  { key: "창호및금속유리", no: 6, label: "창호 및 금속유리공사" },
  { key: "공조시설", no: 7, label: "공조시설공사" },
  { key: "가구", no: 8, label: "가구공사" },
  { key: "전기및조명", no: 9, label: "전기 및 조명공사" },
  { key: "기타", no: 10, label: "기타공사" },
] as const;

export function categoryLabel(key: string) {
  return ESTIMATE_CATEGORIES.find((c) => c.key === key)?.label ?? key;
}
export function categoryNo(key: string) {
  return ESTIMATE_CATEGORIES.find((c) => c.key === key)?.no ?? 99;
}

export type EstimateKind = "detail" | "simple";

export const KIND_LABEL: Record<EstimateKind, string> = { detail: "상세 견적", simple: "간단 견적 (1억 미만)" };

// 양식별 기본 비율
//  - 상세 견적: 공사원가계산서 방식 (expense = 기타경비율, misc = 일반관리비율, profit = 이윤율 — 조달청 2026 건축 기준값)
//  - 간단 견적: 간접비 없이 직접공사비 + 부가세 별도
export const DEFAULT_RATES: Record<EstimateKind, { expense: number; misc: number; profit: number; vat: number; vatIncluded: boolean }> = {
  detail: { expense: 5, misc: 8, profit: 15, vat: 10, vatIncluded: true },
  simple: { expense: 0, misc: 0, profit: 0, vat: 10, vatIncluded: false },
};

export type CalcMethod = "statement" | "simple";

// 견적 양식 → 계산 방식 (상세 = 공사원가계산서, 간단 = 간접비 없음)
export function methodOf(kind: string | null | undefined): CalcMethod {
  return kind === "detail" ? "statement" : "simple";
}

export type CalcLine = { category: string; qty: number; material_price: number; labor_price: number };
export type CalcRates = {
  expense: number;
  misc: number;
  profit: number;
  vat: number;
  vatIncluded: boolean;
  roundUnit: number;
  method?: CalcMethod;
};

// 공사원가계산서 법정 요율 (2026년)
// 근거: 조달청 「2026년 건축·산업환경설비공사 원가계산 간접공사비(제비율) 적용기준」 (2026.4.13 입찰공고분부터)
//       공사규모 10억 미만 · 공사기간 6개월 이하 · 건축공사 · 개보수(인테리어)
export const STATEMENT_RATES = {
  basis: "조달청 2026 건축공사 원가계산 제비율 (10억 미만 · 공기 6개월 이하)",
  indirectLabor: 17.5, // 간접노무비: 직접노무비 ×
  accident: 3.56, // 산재보험료: 노무비 × (고용노동부 고시)
  employment: 1.01, // 고용보험료: 노무비 ×
  health: 3.595, // 국민건강보험료: 직접노무비 × (공사기간 1개월 이상)
  longTermCare: 13.14, // 노인장기요양보험료: 건강보험료 ×
  pension: 4.75, // 국민연금보험료: 직접노무비 × (공사기간 1개월 이상)
  retirement: 2.3, // 퇴직공제부금비: 직접노무비 × (추정금액 1억 이상)
  safety: 3.11, // 산업안전보건관리비: (재료비 + 직접노무비) × (건축 5억 미만, 총공사금액 2천만 이상)
  environment: 0.3, // 환경보전비: 직접공사비 × (건축 개보수)
  asbestos: 0.006, // 석면피해구제분담금: 노무비 ×
  wageClaim: 0.09, // 임금채권부담금: 노무비 ×
} as const;

export type StatementRow = { key: string; label: string; basis: string; amount: number };

// 원 미만 버림
const cut = (n: number) => Math.floor(n);

export function calcStatement(material: number, directLabor: number, rates: CalcRates) {
  const R = STATEMENT_RATES;
  const indirectLabor = cut((directLabor * R.indirectLabor) / 100);
  const labor = directLabor + indirectLabor;
  const direct = material + directLabor;

  const health = cut((directLabor * R.health) / 100);
  const expenseRows: StatementRow[] = [
    { key: "accident", label: "산재보험료", basis: `노무비 × ${R.accident}%`, amount: cut((labor * R.accident) / 100) },
    { key: "employment", label: "고용보험료", basis: `노무비 × ${R.employment}%`, amount: cut((labor * R.employment) / 100) },
    { key: "health", label: "국민건강보험료", basis: `직접노무비 × ${R.health}%`, amount: health },
    { key: "care", label: "노인장기요양보험료", basis: `건강보험료 × ${R.longTermCare}%`, amount: cut((health * R.longTermCare) / 100) },
    { key: "pension", label: "국민연금보험료", basis: `직접노무비 × ${R.pension}%`, amount: cut((directLabor * R.pension) / 100) },
    {
      key: "retirement",
      label: "퇴직공제부금비",
      basis: direct >= 100_000_000 ? `직접노무비 × ${R.retirement}%` : "1억 미만 해당 없음",
      amount: direct >= 100_000_000 ? cut((directLabor * R.retirement) / 100) : 0,
    },
    {
      key: "safety",
      label: "산업안전보건관리비",
      basis: direct >= 20_000_000 ? `(재료비+직접노무비) × ${R.safety}%` : "2천만 미만 해당 없음",
      amount: direct >= 20_000_000 ? cut(((material + directLabor) * R.safety) / 100) : 0,
    },
    { key: "environment", label: "환경보전비", basis: `직접공사비 × ${R.environment}%`, amount: cut((direct * R.environment) / 100) },
    { key: "etc", label: "기타경비", basis: `(재료비+노무비) × ${rates.expense}%`, amount: cut(((material + labor) * rates.expense) / 100) },
    { key: "asbestos", label: "석면피해구제분담금", basis: `노무비 × ${R.asbestos}%`, amount: cut((labor * R.asbestos) / 100) },
    { key: "wage", label: "임금채권부담금", basis: `노무비 × ${R.wageClaim}%`, amount: cut((labor * R.wageClaim) / 100) },
  ];
  const expense = expenseRows.reduce((a, r) => a + r.amount, 0);
  const netCost = material + labor + expense; // 순공사원가
  const overhead = cut((netCost * rates.misc) / 100); // 일반관리비
  const profit = cut(((labor + expense + overhead) * rates.profit) / 100); // 이윤
  const supply = netCost + overhead + profit; // 총원가(공급가액)

  return {
    material,
    directLabor,
    indirectLabor,
    labor,
    expenseRows,
    expense,
    netCost,
    overhead,
    overheadBasis: `(재료비+노무비+경비) × ${rates.misc}%`,
    profit,
    profitBasis: `(노무비+경비+일반관리비) × ${rates.profit}%`,
    supply,
  };
}

export type CostStatement = ReturnType<typeof calcStatement>;

export function lineAmounts(line: { qty: number; material_price: number; labor_price: number }) {
  const material = Math.trunc((Number(line.qty) || 0) * (Number(line.material_price) || 0));
  const labor = Math.trunc((Number(line.qty) || 0) * (Number(line.labor_price) || 0));
  return { material, labor, total: material + labor };
}

export function calcEstimate(lines: CalcLine[], rates: CalcRates) {
  const byCategory = new Map<string, { material: number; labor: number }>();
  let material = 0;
  let labor = 0;
  for (const line of lines) {
    const a = lineAmounts(line);
    material += a.material;
    labor += a.labor;
    const c = byCategory.get(line.category) ?? { material: 0, labor: 0 };
    c.material += a.material;
    c.labor += a.labor;
    byCategory.set(line.category, c);
  }
  const direct = material + labor;

  let expense = 0;
  let misc = 0;
  let profit = 0;
  let statement: CostStatement | null = null;
  if (rates.method === "statement") {
    // 공사원가계산서: 간접노무비·법정 보험료·안전관리비·기타경비 → 일반관리비 → 이윤
    statement = calcStatement(material, labor, rates);
    expense = statement.indirectLabor + statement.expense; // 간접노무비 + 경비
    misc = statement.overhead;
    profit = statement.profit;
  } else {
    expense = (material * rates.expense) / 100;
    misc = (material * rates.misc) / 100;
    profit = (direct * rates.profit) / 100;
  }
  const indirect = expense + misc + profit;
  const supply = direct + indirect;
  const vatRaw = (supply * rates.vat) / 100;
  const vat = rates.vatIncluded ? (rates.method === "statement" ? Math.floor(vatRaw) : vatRaw) : 0;
  const total = supply + vat;
  const unit = rates.roundUnit > 0 ? rates.roundUnit : 1;
  const final = Math.floor(total / unit) * unit;
  // 부가세 별도일 때 참고로 보여줄 부가세 (절사한 공급가 기준)
  const separateVat = rates.vatIncluded ? 0 : Math.trunc((final * rates.vat) / 100);

  const categories = [...byCategory.entries()]
    .map(([key, v]) => ({
      key,
      no: categoryNo(key),
      label: categoryLabel(key),
      material: v.material,
      labor: v.labor,
      total: v.material + v.labor,
    }))
    .sort((a, b) => a.no - b.no);

  return { material, labor, direct, expense, misc, profit, indirect, supply, vat, total, final, cut: total - final, separateVat, categories, statement };
}

export function won(n: number) {
  return Math.round(n).toLocaleString("ko-KR");
}

// 188000000 → "일억팔천팔백만"
export function toKoreanAmount(value: number) {
  const n = Math.floor(Math.abs(value));
  if (n === 0) return "영";
  const digits = ["", "일", "이", "삼", "사", "오", "육", "칠", "팔", "구"];
  const small = ["", "십", "백", "천"];
  const big = ["", "만", "억", "조"];
  let result = "";
  let group = 0;
  let rest = n;
  while (rest > 0) {
    const chunk = rest % 10000;
    if (chunk > 0) {
      let text = "";
      let c = chunk;
      for (let i = 0; i < 4 && c > 0; i++) {
        const d = c % 10;
        if (d > 0) text = digits[d] + small[i] + text;
        c = Math.floor(c / 10);
      }
      result = text + big[group] + result;
    }
    rest = Math.floor(rest / 10000);
    group += 1;
  }
  return result;
}

export type EstimateItem = {
  id: string;
  category: string;
  subcategory: string | null;
  name: string;
  spec: string | null;
  unit: string | null;
  material_price: number;
  labor_price: number;
  price_kind: string;
  simple_qty: number | null;
  qty_basis: string | null;
  note: string | null;
  source?: string | null;
  sort_order: number;
  is_active: boolean;
};

export type Estimate = {
  id: string;
  kind: EstimateKind;
  title: string;
  customer_name: string | null;
  customer_phone: string | null;
  site_address: string | null;
  area_py: number | null;
  area_m2: number | null;
  quote_date: string;
  status: string;
  expense_rate: number;
  misc_rate: number;
  profit_rate: number;
  vat_rate: number;
  vat_included: boolean;
  round_unit: number;
  notes: string | null;
  total_amount: number | null;
  share_token: string;
  viewed_at: string | null;
  view_count: number;
  approved_name: string | null;
  approved_at: string | null;
  share_expires_at: string | null;
  created_at: string;
  updated_at: string;
};

export type EstimateLine = {
  id: string;
  estimate_id: string;
  item_id: string | null;
  category: string;
  subcategory: string | null;
  name: string;
  spec: string | null;
  unit: string | null;
  qty: number;
  material_price: number;
  labor_price: number;
  note: string | null;
  sort_order: number;
};

export const STATUS_LABEL: Record<string, string> = { draft: "작성 중", sent: "발송", approved: "승인" };

// 고객 링크로 열람·승인한 기록
export type EstimateShareInfo = { viewed_at: string | null; view_count: number; approved_name: string | null; approved_at: string | null };
