import ExcelJS from "exceljs";
import {
  ESTIMATE_CATEGORIES,
  STATEMENT_RATES,
  calcEstimate,
  categoryNo,
  lineAmounts,
  methodOf,
  toKoreanAmount,
  type Estimate,
  type EstimateLine,
} from "@/lib/estimate";

// 견적서 엑셀 내보내기: 리안 엑셀 견적서 양식(표지·갑지·집계표·내역서) 그대로 + 공사원가계산서(상세 견적)
// 수식을 살려 두어 엑셀에서 수량·단가·요율을 고치면 합계가 다시 계산된다.

export type ExcelCompany = {
  company_name: string | null;
  business_registration_number: string | null;
  representative_name: string | null;
  address: string | null;
  phone: string | null;
} | null;

export type ExcelImages = { rean?: ArrayBuffer; design?: ArrayBuffer; studio?: ArrayBuffer };

const COMPANY_MOBILE = "010-6232-9714";
const MALGUN = "맑은 고딕";
const DOTUM = "돋움";
const NUM = '#,##0;-#,##0;"-"';
const BEIGE = "FFF0EBE4";
const HEAD = "FFF2F2F2";

const thin = { style: "thin" as const, color: { argb: "FF999999" } };
const box = { top: thin, left: thin, bottom: thin, right: thin };

function spaced(text: string, sep = " ") {
  return [...text.replace(/\s+/g, "")].join(sep);
}

function areaText(e: Estimate) {
  if (!e.area_py && !e.area_m2) return "";
  return `${e.area_m2 ? `${e.area_m2}m2` : ""}${e.area_py ? ` [${e.area_py} py]` : ""}`.trim();
}

function landscape(ws: ExcelJS.Worksheet, area: string, extra: Partial<ExcelJS.PageSetup> = {}) {
  ws.pageSetup = {
    paperSize: 9, // A4
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    horizontalCentered: true,
    printArea: area,
    margins: { left: 0.6, right: 0.6, top: 0.6, bottom: 0.5, header: 0.3, footer: 0.3 },
    ...extra,
  };
  ws.views = [{ showGridLines: false }];
}

function widths(ws: ExcelJS.Worksheet, list: number[]) {
  list.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
    if (w === 0) ws.getColumn(i + 1).hidden = true;
  });
}

function f(formula: string, result: number | string) {
  return { formula, result } as ExcelJS.CellFormulaValue;
}

export async function buildEstimateWorkbook(est: Estimate, rawLines: EstimateLine[], company: ExcelCompany, images: ExcelImages) {
  const lines = rawLines.map((l) => ({ ...l, qty: Number(l.qty), material_price: Number(l.material_price), labor_price: Number(l.labor_price) }));
  const method = methodOf(est.kind);
  const s = calcEstimate(lines, {
    expense: Number(est.expense_rate),
    misc: Number(est.misc_rate),
    profit: Number(est.profit_rate),
    vat: Number(est.vat_rate),
    vatIncluded: est.vat_included,
    roundUnit: est.round_unit,
    method,
  });
  const st = s.statement;
  const companyName = company?.company_name ?? "리안디자인";
  const noteLines = (est.notes ?? "").split("\n").map((t) => t.trim()).filter(Boolean);
  const roundDigits = -Math.round(Math.log10(Math.max(1, est.round_unit))); // 100000 → -5

  const wb = new ExcelJS.Workbook();
  wb.creator = companyName;
  wb.created = new Date();
  wb.calcProperties.fullCalcOnLoad = true;

  const img = (buf?: ArrayBuffer) => (buf ? wb.addImage({ buffer: Buffer.from(buf) as unknown as ExcelJS.Buffer, extension: "png" }) : null);
  const reanImg = img(images.rean);
  const designImg = img(images.design);
  const studioImg = img(images.studio);

  // ── 시트 순서 미리 만들기 (수식이 서로를 참조)
  const wsCover = wb.addWorksheet("표지");
  const wsGap = wb.addWorksheet("갑지");
  const wsCost = st ? wb.addWorksheet("공사원가계산서") : null;
  const wsSum = wb.addWorksheet("집계표");
  const wsDet = wb.addWorksheet("내역서");

  // ───────────── 내역서 (엑셀 양식: C~N열)
  widths(wsDet, [0, 0, 9.44, 25, 40, 5, 10, 13, 13, 13, 13, 13, 13, 26]);
  landscape(wsDet, "", { printTitlesRow: "1:3" });
  wsDet.pageSetup.printArea = undefined;
  const detFont = { name: DOTUM, size: 9 };
  wsDet.getCell("C1").value = areaText(est);
  wsDet.getCell("C1").font = { ...detFont, bold: true };
  const head2 = ["NO", "품          명", "규       격", "단위", "수량", "재  료  비", "", "노  무  비", "", "합    계", "", "비고"];
  const head3 = ["", "", "", "", "", "단가", "금액", "단가", "금액", "단가", "금액", ""];
  head2.forEach((t, i) => (wsDet.getCell(2, i + 3).value = t));
  head3.forEach((t, i) => (wsDet.getCell(3, i + 3).value = t));
  for (const [a, b] of [["C2", "C3"], ["D2", "D3"], ["E2", "E3"], ["F2", "F3"], ["G2", "G3"], ["H2", "I2"], ["J2", "K2"], ["L2", "M2"], ["N2", "N3"]]) wsDet.mergeCells(`${a}:${b}`);
  for (let r = 2; r <= 3; r++)
    for (let c = 3; c <= 14; c++) {
      const cell = wsDet.getCell(r, c);
      cell.font = { ...detFont, bold: true };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEAD } };
      cell.border = box;
    }

  // 공종 → 세부공종 → 품목
  const byCat = new Map<string, Map<string, typeof lines>>();
  for (const l of [...lines].sort((a, b) => categoryNo(a.category) - categoryNo(b.category))) {
    const subs = byCat.get(l.category) ?? new Map<string, typeof lines>();
    const k = l.subcategory ?? "";
    subs.set(k, [...(subs.get(k) ?? []), l]);
    byCat.set(l.category, subs);
  }
  const catTotalRow = new Map<string, number>(); // 공종 → [합계] 행
  let r = 4;
  const styleRow = (row: number, opts: { bold?: boolean; fill?: string } = {}) => {
    for (let c = 3; c <= 14; c++) {
      const cell = wsDet.getCell(row, c);
      cell.font = { ...detFont, bold: !!opts.bold };
      cell.border = box;
      if (c >= 8 && c <= 13) cell.numFmt = NUM;
      if (c === 7) cell.numFmt = "General";
      if (opts.fill) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: opts.fill } };
    }
  };
  for (const cat of ESTIMATE_CATEGORIES) {
    const subs = byCat.get(cat.key);
    if (!subs) continue;
    wsDet.getCell(r, 3).value = cat.no;
    wsDet.getCell(r, 4).value = cat.label;
    styleRow(r, { bold: true, fill: HEAD });
    wsDet.getCell(r, 3).alignment = { horizontal: "center" };
    r++;
    const subTotalRows: number[] = [];
    for (const [sub, list] of subs) {
      const m = sub.match(/^(\d+-\d+)\s*(.*)$/);
      wsDet.getCell(r, 3).value = m ? m[1] : "";
      wsDet.getCell(r, 4).value = m ? m[2] : sub || "";
      styleRow(r, { bold: true });
      wsDet.getCell(r, 3).alignment = { horizontal: "center" };
      r++;
      const first = r;
      for (const l of list) {
        const a = lineAmounts(l);
        wsDet.getCell(r, 4).value = l.name;
        wsDet.getCell(r, 5).value = l.spec ?? "";
        wsDet.getCell(r, 6).value = l.unit ?? "";
        wsDet.getCell(r, 7).value = l.qty;
        wsDet.getCell(r, 8).value = l.material_price || null;
        wsDet.getCell(r, 9).value = f(`TRUNC(G${r}*H${r},0)`, a.material);
        wsDet.getCell(r, 10).value = l.labor_price || null;
        wsDet.getCell(r, 11).value = f(`TRUNC(G${r}*J${r},0)`, a.labor);
        wsDet.getCell(r, 12).value = f(`H${r}+J${r}`, l.material_price + l.labor_price);
        wsDet.getCell(r, 13).value = f(`I${r}+K${r}`, a.total);
        wsDet.getCell(r, 14).value = l.note ?? "";
        styleRow(r);
        wsDet.getCell(r, 6).alignment = { horizontal: "center" };
        r++;
      }
      const last = r - 1;
      const sm = list.reduce((acc, l) => acc + lineAmounts(l).material, 0);
      const sl = list.reduce((acc, l) => acc + lineAmounts(l).labor, 0);
      wsDet.getCell(r, 4).value = "[ 소           계 ]";
      wsDet.getCell(r, 9).value = f(`SUM(I${first}:I${last})`, sm);
      wsDet.getCell(r, 11).value = f(`SUM(K${first}:K${last})`, sl);
      wsDet.getCell(r, 13).value = f(`SUM(M${first}:M${last})`, sm + sl);
      styleRow(r, { bold: true });
      wsDet.getCell(r, 4).alignment = { horizontal: "center" };
      subTotalRows.push(r);
      r++;
    }
    const cm = s.categories.find((c) => c.key === cat.key);
    wsDet.getCell(r, 4).value = "[ 합           계 ]";
    wsDet.getCell(r, 9).value = f(subTotalRows.map((x) => `I${x}`).join("+"), cm?.material ?? 0);
    wsDet.getCell(r, 11).value = f(subTotalRows.map((x) => `K${x}`).join("+"), cm?.labor ?? 0);
    wsDet.getCell(r, 13).value = f(subTotalRows.map((x) => `M${x}`).join("+"), cm?.total ?? 0);
    styleRow(r, { bold: true, fill: BEIGE });
    wsDet.getCell(r, 4).alignment = { horizontal: "center" };
    catTotalRow.set(cat.key, r);
    r += 2;
  }
  wsDet.pageSetup.printArea = `C1:N${Math.max(4, r - 1)}`;

  // ───────────── 집계표 (엑셀 양식: A~M열)
  widths(wsSum, [8.11, 25, 15, 7, 7, 14, 14, 14, 14, 14, 14, 20, 20]);
  const sumFont = { name: MALGUN, size: 10 };
  wsSum.getCell("B1").value = "집   계   표";
  wsSum.mergeCells("B1:M1");
  wsSum.getCell("B1").font = { name: MALGUN, size: 16, bold: true, underline: true };
  wsSum.getCell("B1").alignment = { horizontal: "center" };
  wsSum.getRow(1).height = 36;
  wsSum.getCell("A2").value = areaText(est);
  wsSum.getCell("A2").font = { ...sumFont, bold: true };
  const sh3 = ["", "품          명", "규 격", "단 위", "수 량", "재  료  비", "", "노  무  비", "", "합    계", "", "", "비고"];
  const sh4 = ["", "", "", "", "", "단가", "금액", "단가", "금액", "단가", "금액", "", ""];
  sh3.forEach((t, i) => (wsSum.getCell(3, i + 1).value = t));
  sh4.forEach((t, i) => (wsSum.getCell(4, i + 1).value = t));
  for (const [a, b] of [["A3", "A4"], ["B3", "B4"], ["C3", "C4"], ["D3", "D4"], ["E3", "E4"], ["F3", "G3"], ["H3", "I3"], ["J3", "K3"], ["L3", "L4"], ["M3", "M4"]]) wsSum.mergeCells(`${a}:${b}`);
  const sumStyle = (row: number, opts: { bold?: boolean; fill?: string; head?: boolean } = {}) => {
    for (let c = 1; c <= 13; c++) {
      const cell = wsSum.getCell(row, c);
      cell.font = { ...sumFont, bold: !!opts.bold };
      cell.border = box;
      if (c >= 6 && c <= 11) cell.numFmt = NUM;
      if (opts.head) cell.alignment = { horizontal: "center", vertical: "middle" };
      if (opts.fill) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: opts.fill } };
    }
    wsSum.getCell(row, 1).alignment = { horizontal: "center" };
  };
  sumStyle(3, { bold: true, head: true, fill: HEAD });
  sumStyle(4, { bold: true, head: true, fill: HEAD });
  wsSum.getCell("A5").value = "▣";
  wsSum.getCell("B5").value = est.title;
  sumStyle(5, { bold: true });
  wsSum.getCell("A6").value = "가";
  wsSum.getCell("B6").value = "직접공사비";
  sumStyle(6, { bold: true });
  let sr = 7;
  const catRows: number[] = [];
  for (const cat of ESTIMATE_CATEGORIES) {
    const cm = s.categories.find((c) => c.key === cat.key);
    if (!cm && cat.key === "기타") continue;
    const tr = catTotalRow.get(cat.key);
    wsSum.getCell(sr, 1).value = cat.no;
    wsSum.getCell(sr, 2).value = cat.label;
    wsSum.getCell(sr, 4).value = "식";
    wsSum.getCell(sr, 5).value = 1;
    wsSum.getCell(sr, 6).value = tr ? f(`내역서!I${tr}`, cm?.material ?? 0) : 0;
    wsSum.getCell(sr, 7).value = f(`F${sr}*E${sr}`, cm?.material ?? 0);
    wsSum.getCell(sr, 8).value = tr ? f(`내역서!K${tr}`, cm?.labor ?? 0) : 0;
    wsSum.getCell(sr, 9).value = f(`H${sr}*E${sr}`, cm?.labor ?? 0);
    wsSum.getCell(sr, 11).value = f(`G${sr}+I${sr}`, cm?.total ?? 0);
    sumStyle(sr);
    wsSum.getCell(sr, 4).alignment = { horizontal: "center" };
    wsSum.getCell(sr, 5).alignment = { horizontal: "center" };
    catRows.push(sr);
    sr++;
  }
  const firstCat = catRows[0];
  const lastCat = catRows[catRows.length - 1];
  const SUB1 = sr; // 직접공사비 소계
  wsSum.getCell(SUB1, 2).value = "소          계";
  wsSum.getCell(SUB1, 7).value = f(`SUM(G${firstCat}:G${lastCat})`, s.material);
  wsSum.getCell(SUB1, 9).value = f(`SUM(I${firstCat}:I${lastCat})`, s.labor);
  wsSum.getCell(SUB1, 11).value = f(`SUM(K${firstCat}:K${lastCat})`, s.direct);
  sumStyle(SUB1, { bold: true, fill: BEIGE });
  wsSum.getCell(SUB1, 2).alignment = { horizontal: "center" };
  sr += 1;

  // 원가계산서 셀 주소 (아래에서 채움) — 집계표의 간접공사비·부가세가 참조한다
  const COST = { supply: "C0", vat: "C0", total: "C0", final: "C0" };
  const costRowsStart = 6;

  const INDIRECT = sr;
  wsSum.getCell(INDIRECT, 1).value = "나";
  wsSum.getCell(INDIRECT, 2).value = "간접공사비";
  wsSum.getCell(INDIRECT, 3).value = st ? "공사원가계산서 참조" : "해당 없음";
  sumStyle(INDIRECT);
  sr++;
  const VAT = sr;
  wsSum.getCell(VAT, 1).value = "다";
  wsSum.getCell(VAT, 2).value = "부가가치세";
  wsSum.getCell(VAT, 3).value = est.vat_included ? "공급가액의" : "부가세 별도";
  wsSum.getCell(VAT, 4).value = "%";
  wsSum.getCell(VAT, 5).value = est.vat_included ? Number(est.vat_rate) : null;
  sumStyle(VAT);
  sr++;
  const TOTAL = sr;
  wsSum.getCell(TOTAL, 2).value = "총          계";
  sumStyle(TOTAL, { bold: true, fill: BEIGE });
  wsSum.getCell(TOTAL, 2).alignment = { horizontal: "center" };
  sr++;
  const FINAL = sr;
  wsSum.getCell(FINAL, 2).value = "공  사  금  액";
  wsSum.getCell(FINAL, 3).value = est.round_unit > 1 ? `${est.round_unit.toLocaleString("ko-KR")}원 미만 절사` : "";
  sumStyle(FINAL, { bold: true, fill: BEIGE });
  wsSum.getCell(FINAL, 2).alignment = { horizontal: "center" };
  landscape(wsSum, `A1:M${FINAL}`, { printTitlesRow: "1:4", fitToHeight: 1 });

  // ───────────── 공사원가계산서 (상세 견적)
  if (wsCost && st) {
    widths(wsCost, [12, 24, 18, 10, 10, 44]);
    const cf = { name: MALGUN, size: 10 };
    wsCost.getCell("A1").value = "공 사 원 가 계 산 서";
    wsCost.mergeCells("A1:F1");
    wsCost.getCell("A1").font = { name: MALGUN, size: 16, bold: true, underline: true };
    wsCost.getCell("A1").alignment = { horizontal: "center" };
    wsCost.getRow(1).height = 36;
    wsCost.getCell("A2").value = `▣ ${est.title}${est.customer_name ? ` · ${est.customer_name} 고객님` : ""}`;
    wsCost.getCell("F2").value = `${areaText(est)}   제출일 ${est.quote_date}`;
    wsCost.getCell("A2").font = { ...cf, bold: true };
    wsCost.getCell("F2").font = cf;
    wsCost.getCell("F2").alignment = { horizontal: "right" };
    ["구  분", "비  목", "금  액", "구성비", "요율(%)", "산  출  근  거"].forEach((t, i) => {
      const c = wsCost.getCell(4, i + 1);
      c.value = t;
      c.font = { ...cf, bold: true };
      c.alignment = { horizontal: "center" };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BEIGE } };
      c.border = box;
    });
    let cr = 5;
    const at: Record<string, number> = {};
    const R = STATEMENT_RATES;
    const exp = Object.fromEntries(st.expenseRows.map((x) => [x.key, x.amount]));
    // 줄 정의: key, 구분, 비목, 수식(C열, 행번호 at[] 참조), 값, 요율, 근거
    type Row = { key: string; group?: string; label: string; formula: (rate: string) => string; value: number; rate?: number; basis: string; bold?: boolean; fill?: string };
    const C = (k: string) => `C${at[k]}`;
    const rows: Row[] = [
      { key: "mat", group: "재료비", label: "직접재료비", formula: () => `집계표!G${SUB1}`, value: st.material, basis: "내역서 재료비 합계" },
      { key: "imat", label: "간접재료비", formula: () => "0", value: 0, basis: "해당 없음" },
      { key: "matSum", label: "소   계", formula: () => `${C("mat")}+${C("imat")}`, value: st.material, basis: "", bold: true, fill: BEIGE },
      { key: "dl", group: "노무비", label: "직접노무비", formula: () => `집계표!I${SUB1}`, value: st.directLabor, basis: "내역서 노무비 합계" },
      { key: "il", label: "간접노무비", formula: (x) => `TRUNC(${C("dl")}*${x}/100,0)`, value: st.indirectLabor, rate: R.indirectLabor, basis: "직접노무비 × 요율" },
      { key: "labSum", label: "소   계", formula: () => `${C("dl")}+${C("il")}`, value: st.labor, basis: "", bold: true, fill: BEIGE },
      { key: "acc", group: "경비", label: "산재보험료", formula: (x) => `TRUNC(${C("labSum")}*${x}/100,0)`, value: exp.accident, rate: R.accident, basis: "노무비 × 요율" },
      { key: "emp", label: "고용보험료", formula: (x) => `TRUNC(${C("labSum")}*${x}/100,0)`, value: exp.employment, rate: R.employment, basis: "노무비 × 요율" },
      { key: "hea", label: "국민건강보험료", formula: (x) => `TRUNC(${C("dl")}*${x}/100,0)`, value: exp.health, rate: R.health, basis: "직접노무비 × 요율 (공기 1개월 이상)" },
      { key: "care", label: "노인장기요양보험료", formula: (x) => `TRUNC(${C("hea")}*${x}/100,0)`, value: exp.care, rate: R.longTermCare, basis: "건강보험료 × 요율" },
      { key: "pen", label: "국민연금보험료", formula: (x) => `TRUNC(${C("dl")}*${x}/100,0)`, value: exp.pension, rate: R.pension, basis: "직접노무비 × 요율 (공기 1개월 이상)" },
      {
        key: "ret",
        label: "퇴직공제부금비",
        formula: (x) => `IF(${C("mat")}+${C("dl")}>=100000000,TRUNC(${C("dl")}*${x}/100,0),0)`,
        value: exp.retirement,
        rate: R.retirement,
        basis: "직접노무비 × 요율 (1억 이상)",
      },
      {
        key: "safe",
        label: "산업안전보건관리비",
        formula: (x) => `IF(${C("mat")}+${C("dl")}>=20000000,TRUNC((${C("mat")}+${C("dl")})*${x}/100,0),0)`,
        value: exp.safety,
        rate: R.safety,
        basis: "(재료비+직접노무비) × 요율 (2천만 이상)",
      },
      { key: "env", label: "환경보전비", formula: (x) => `TRUNC((${C("mat")}+${C("dl")})*${x}/100,0)`, value: exp.environment, rate: R.environment, basis: "직접공사비 × 요율" },
      { key: "etc", label: "기타경비", formula: (x) => `TRUNC((${C("matSum")}+${C("labSum")})*${x}/100,0)`, value: exp.etc, rate: Number(est.expense_rate), basis: "(재료비+노무비) × 요율" },
      { key: "asb", label: "석면피해구제분담금", formula: (x) => `TRUNC(${C("labSum")}*${x}/100,0)`, value: exp.asbestos, rate: R.asbestos, basis: "노무비 × 요율" },
      { key: "wage", label: "임금채권부담금", formula: (x) => `TRUNC(${C("labSum")}*${x}/100,0)`, value: exp.wage, rate: R.wageClaim, basis: "노무비 × 요율" },
      { key: "expSum", label: "소   계", formula: () => `SUM(${C("acc")}:${C("wage")})`, value: st.expense, basis: "", bold: true, fill: BEIGE },
      { key: "net", group: "순공사원가", label: "", formula: () => `${C("matSum")}+${C("labSum")}+${C("expSum")}`, value: st.netCost, basis: "재료비 + 노무비 + 경비", bold: true },
      { key: "oh", group: "일반관리비", label: "", formula: (x) => `TRUNC(${C("net")}*${x}/100,0)`, value: st.overhead, rate: Number(est.misc_rate), basis: "(재료비+노무비+경비) × 요율" },
      { key: "pr", group: "이윤", label: "", formula: (x) => `TRUNC((${C("labSum")}+${C("expSum")}+${C("oh")})*${x}/100,0)`, value: st.profit, rate: Number(est.profit_rate), basis: "(노무비+경비+일반관리비) × 요율" },
      { key: "sup", group: "총원가 (공급가액)", label: "", formula: () => `${C("net")}+${C("oh")}+${C("pr")}`, value: st.supply, basis: "순공사원가 + 일반관리비 + 이윤", bold: true, fill: BEIGE },
      {
        key: "vat",
        group: "부가가치세",
        label: "",
        formula: (x) => (est.vat_included ? `TRUNC(${C("sup")}*${x}/100,0)` : "0"),
        value: est.vat_included ? s.vat : 0,
        rate: est.vat_included ? Number(est.vat_rate) : undefined,
        basis: est.vat_included ? "공급가액 × 요율" : "부가세 별도",
      },
      { key: "tot", group: "총공사비", label: "", formula: () => `${C("sup")}+${C("vat")}`, value: s.total, basis: "총원가 + 부가가치세", bold: true },
      {
        key: "fin",
        group: "공사금액",
        label: "",
        formula: () => (est.round_unit > 1 ? `ROUNDDOWN(${C("tot")},${roundDigits})` : C("tot")),
        value: s.final,
        basis: est.round_unit > 1 ? `${est.round_unit.toLocaleString("ko-KR")}원 미만 절사` : "",
        bold: true,
        fill: BEIGE,
      },
    ];
    for (const row of rows) at[row.key] = cr++;
    const groupStart: Record<string, number> = {};
    for (const row of rows) {
      const rr = at[row.key];
      const rateCell = `E${rr}`;
      if (row.group) groupStart[row.group] = rr;
      wsCost.getCell(rr, 1).value = row.group ?? "";
      wsCost.getCell(rr, 2).value = row.label;
      wsCost.getCell(rr, 3).value = f(row.formula(rateCell), row.value);
      wsCost.getCell(rr, 4).value = f(`IF(${C("tot")}=0,0,C${rr}/${C("tot")})`, s.total ? row.value / s.total : 0);
      wsCost.getCell(rr, 5).value = row.rate ?? null;
      wsCost.getCell(rr, 6).value = row.basis;
      for (let c = 1; c <= 6; c++) {
        const cell = wsCost.getCell(rr, c);
        cell.font = { ...cf, bold: !!row.bold || c === 1 };
        cell.border = box;
        if (row.fill) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: row.fill } };
      }
      wsCost.getCell(rr, 1).alignment = { horizontal: "center", vertical: "middle" };
      wsCost.getCell(rr, 3).numFmt = NUM;
      wsCost.getCell(rr, 4).numFmt = "0.0%";
      wsCost.getCell(rr, 5).numFmt = "General";
      wsCost.getCell(rr, 5).alignment = { horizontal: "center" };
      // 구분 없는 줄(합계성)은 구분·비목 칸 합치기
      if (row.group && !row.label) wsCost.mergeCells(`A${rr}:B${rr}`);
    }
    // 재료비·노무비·경비 구분 칸 세로로 합치기
    wsCost.mergeCells(`A${at.mat}:A${at.matSum}`);
    wsCost.mergeCells(`A${at.dl}:A${at.labSum}`);
    wsCost.mergeCells(`A${at.acc}:A${at.expSum}`);
    const tail = at.fin + 1;
    wsCost.getCell(`A${tail}`).value = f(`"일금 "&NUMBERSTRING(${C("fin")},1)&"원정"`, `일금 ${toKoreanAmount(s.final)}원정`);
    wsCost.getCell(`A${tail}`).font = { ...cf, bold: true };
    wsCost.getCell(`F${tail}`).value = `요율 근거 : ${R.basis}`;
    wsCost.getCell(`F${tail}`).font = { name: MALGUN, size: 8, color: { argb: "FF777777" } };
    wsCost.getCell(`F${tail}`).alignment = { horizontal: "right" };
    landscape(wsCost, `A1:F${tail}`, { fitToHeight: 1 });
    COST.supply = `공사원가계산서!${C("sup")}`;
    COST.vat = `공사원가계산서!${C("vat")}`;
    COST.total = `공사원가계산서!${C("tot")}`;
    COST.final = `공사원가계산서!${C("fin")}`;
    void costRowsStart;
  }

  // 집계표 간접공사비·부가세·총계·공사금액 수식
  if (st) {
    wsSum.getCell(INDIRECT, 11).value = f(`${COST.supply}-K${SUB1}`, s.indirect);
    wsSum.getCell(VAT, 11).value = f(COST.vat, s.vat);
    wsSum.getCell(TOTAL, 11).value = f(COST.total, s.total);
    wsSum.getCell(FINAL, 11).value = f(COST.final, s.final);
  } else {
    wsSum.getCell(INDIRECT, 11).value = 0;
    wsSum.getCell(VAT, 11).value = est.vat_included ? f(`TRUNC(K${SUB1}*E${VAT}/100,0)`, s.vat) : 0;
    wsSum.getCell(TOTAL, 11).value = f(`K${SUB1}+K${INDIRECT}+K${VAT}`, s.total);
    wsSum.getCell(FINAL, 11).value = f(est.round_unit > 1 ? `ROUNDDOWN(K${TOTAL},${roundDigits})` : `K${TOTAL}`, s.final);
  }
  if (!est.vat_included) wsSum.getCell(VAT, 13).value = `별도 ${Math.trunc((s.final * Number(est.vat_rate)) / 100).toLocaleString("ko-KR")}원`;

  // ───────────── 갑지 (엑셀 양식: A~K열)
  widths(wsGap, [8.11, 4.22, 14, 8, 14.89, 15, 6, 11.11, 5.56, 5, 10.89]);
  [39.75, 40, 39, 39, 24.75, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 24.75, 24.75, 24.75, 37.5].forEach((h, i) => (wsGap.getRow(i + 1).height = h));
  const gf = { name: MALGUN, size: 10 };
  wsGap.getCell("A2").value = "          견 적 서 / ESTIMATE";
  wsGap.getCell("A2").font = { name: MALGUN, size: 16, bold: true };
  wsGap.getCell("A2").alignment = { vertical: "middle" };
  for (let c = 1; c <= 11; c++) {
    wsGap.getCell(1, c).border = { bottom: { style: "medium", color: { argb: "FF000000" } } };
    wsGap.getCell(3, c).border = { bottom: { style: "medium", color: { argb: "FF000000" } } };
  }
  const gapRows: [string, string | ExcelJS.CellFormulaValue][] = [
    ["              고    객   명", est.customer_name ? `   ${spaced(est.customer_name)}          고객님` : ""],
    ["              공    사   명 ", `   ${est.title}`],
    ["             현 장   평 수 ", `   ${areaText(est)}`],
    ["             제 출   일 자 ", `   ${est.quote_date}`],
  ];
  gapRows.forEach(([k, v], i) => {
    wsGap.getCell(5 + i, 1).value = k;
    wsGap.getCell(5 + i, 1).font = { ...gf, bold: true };
    wsGap.getCell(5 + i, 6).value = v;
    wsGap.getCell(5 + i, 6).font = gf;
  });
  wsGap.getCell("A9").value = "             공 사   금 액 ";
  wsGap.getCell("A9").font = { ...gf, bold: true };
  wsGap.getCell("F9").value = "₩";
  wsGap.getCell("F9").font = gf;
  wsGap.getCell("H9").value = f(st ? COST.final : `집계표!K${FINAL}`, s.final);
  wsGap.getCell("H9").numFmt = "#,##0";
  wsGap.getCell("H9").font = { ...gf, bold: true };
  wsGap.getCell("H9").alignment = { horizontal: "right" };
  wsGap.getCell("I9").value = `( ${est.round_unit > 1 ? "단위절사함, " : ""}${est.vat_included ? "부가세 포함" : "부가세 별도"} )`;
  wsGap.getCell("I9").font = gf;
  wsGap.getCell("G10").value = f(`"일금"&NUMBERSTRING(H9,1)&"원정"`, `일금${toKoreanAmount(s.final)}원정`);
  wsGap.getCell("G10").font = gf;
  wsGap.getCell("A12").value = "             비  고";
  wsGap.getCell("A12").font = { ...gf, bold: true };
  noteLines.slice(0, 4).forEach((n, i) => {
    wsGap.getCell(12 + i, 6).value = `  ${n}`;
    wsGap.getCell(12 + i, 6).font = gf;
  });
  const coRows = [
    [` ${spaced(companyName, " ")}`, true],
    [` ${company?.address ?? ""}`, false],
    [` ${company?.business_registration_number ?? ""} (업태 : 건설, 종목 : 인테리어)`, false],
    [` TEL : ${company?.phone ?? ""} /  ${COMPANY_MOBILE}`, false],
    [` 대표 : ${company?.representative_name ? spaced(company.representative_name, "  ") : ""} (인)`, false],
  ] as const;
  coRows.forEach(([t, b], i) => {
    wsGap.getCell(16 + i, 6).value = t;
    wsGap.getCell(16 + i, 6).font = { ...gf, bold: b, color: b ? { argb: "FF555555" } : undefined };
  });
  for (let c = 1; c <= 11; c++) wsGap.getCell(21, c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: BEIGE } };
  if (studioImg !== null) wsGap.addImage(studioImg, { tl: { col: 0.3, row: 17.2 }, ext: { width: 200, height: 104 } });
  landscape(wsGap, "A1:K21", { fitToHeight: 1, margins: { left: 0.9, right: 0.6, top: 0.7, bottom: 0.5, header: 0.3, footer: 0.3 } });

  // ───────────── 표지 (엑셀 양식: A~K열)
  widths(wsCover, [5, 4.22, 4.22, 14, 0.5, 8, 14.89, 15, 15, 15, 15]);
  [39.75, 40, 39, ...Array(16).fill(25)].forEach((h, i) => (wsCover.getRow(i + 1).height = h));
  if (reanImg !== null) wsCover.addImage(reanImg, { tl: { col: 0.4, row: 5.4 }, ext: { width: 190, height: 43 } });
  if (designImg !== null) wsCover.addImage(designImg, { tl: { col: 0.2, row: 7.3 }, ext: { width: 200, height: 85 } });
  for (let c = 6; c <= 11; c++) wsCover.getCell(7, c).border = { bottom: { style: "medium", color: { argb: "FF000000" } } };
  const cv = { name: MALGUN, size: 9 };
  wsCover.getCell("I14").value = "CLIENT.";
  wsCover.getCell("J14").value = est.title;
  wsCover.getCell("I15").value = "DATE.";
  wsCover.getCell("J15").value = est.quote_date.replaceAll("-", ". ");
  wsCover.getCell("I16").value = "단순한 숫자가 아닌, 공간 완성도를 위한 기준입니다.";
  for (const a of ["I14", "J14", "I15", "J15"]) wsCover.getCell(a).font = cv;
  wsCover.getCell("I16").font = { name: MALGUN, size: 8 };
  landscape(wsCover, "A1:K19", { fitToHeight: 1, margins: { left: 0.9, right: 0.6, top: 0.7, bottom: 0.5, header: 0.3, footer: 0.3 } });

  return wb;
}
