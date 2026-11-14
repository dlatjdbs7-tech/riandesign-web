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
export const DEFAULT_RATES: Record<EstimateKind, { expense: number; misc: number; profit: number; vat: number; vatIncluded: boolean }> = {
  detail: { expense: 2, misc: 3, profit: 5, vat: 10, vatIncluded: true },
  simple: { expense: 0, misc: 0, profit: 0, vat: 10, vatIncluded: false },
};

export type CalcLine = { category: string; qty: number; material_price: number; labor_price: number };
export type CalcRates = { expense: number; misc: number; profit: number; vat: number; vatIncluded: boolean; roundUnit: number };

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
  const expense = (material * rates.expense) / 100;
  const misc = (material * rates.misc) / 100;
  const profit = (direct * rates.profit) / 100;
  const indirect = expense + misc + profit;
  const supply = direct + indirect;
  const vat = rates.vatIncluded ? (supply * rates.vat) / 100 : 0;
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

  return { material, labor, direct, expense, misc, profit, indirect, supply, vat, total, final, cut: total - final, separateVat, categories };
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
