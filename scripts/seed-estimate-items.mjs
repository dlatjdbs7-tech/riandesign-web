// 견적 품목 라이브러리 채우기 (한 번만 실행)
//   node --env-file=.env.local scripts/seed-estimate-items.mjs <items.json> <simple_template.json>
// 자료 원본: X:\claude-shared\리안네트웍스_견적자료 (NAS 견적서·자재 단가에서 정리, 단가는 git에 올리지 않음)
import { readFileSync } from "node:fs";
import { Client } from "pg";

const [itemsPath, templatePath] = process.argv.slice(2);
if (!itemsPath || !templatePath) {
  console.error("사용법: node scripts/seed-estimate-items.mjs <items.json> <simple_template.json>");
  process.exit(1);
}

const CATEGORY_ORDER = [
  "허가및공통가설",
  "철거및습식",
  "도어및목공",
  "타일및화장실",
  "수장",
  "창호및금속유리",
  "공조시설",
  "가구",
  "전기및조명",
  "기타",
];

// [공종, 세부공종, 품명, 규격, 단위]
const EXTRA_ITEMS = [
  ["허가및공통가설", "1-1 허가사항", "관리사무소 공사신고", "동의서·공사예치금", "식"],
  ["허가및공통가설", "1-2 공통가설공사", "자재 양중", "사다리차·인력 양중", "식"],
  ["허가및공통가설", "1-2 공통가설공사", "현장관리비", "현장 관리·감독", "식"],
  ["허가및공통가설", "1-2 공통가설공사", "공용부 보양", "복도·엘리베이터 홀", "식"],
  ["철거및습식", "2-1 철거공사", "바닥재 철거", "장판·데코타일", "M2"],
  ["철거및습식", "2-1 철거공사", "벽지 철거", "기존 벽지 제거", "식"],
  ["철거및습식", "2-1 철거공사", "몰딩·걸레받이 철거", "", "M"],
  ["철거및습식", "2-1 철거공사", "문틀·문짝 철거", "", "EA"],
  ["철거및습식", "2-1 철거공사", "붙박이장 철거", "", "M"],
  ["철거및습식", "2-2 설비·방수", "액체방수", "욕실·발코니 바닥", "M2"],
  ["철거및습식", "2-2 설비·방수", "도막방수", "우레탄", "M2"],
  ["철거및습식", "2-2 설비·방수", "방통·미장", "바닥 수평", "M2"],
  ["철거및습식", "2-2 설비·방수", "조적", "벽돌 쌓기", "M2"],
  ["도어및목공", "3-2 목공사", "가벽 신설", "각재+석고보드 2겹", "M2"],
  ["도어및목공", "3-2 목공사", "아트월 틀", "", "M2"],
  ["도어및목공", "3-2 목공사", "커튼박스", "", "M"],
  ["도어및목공", "3-2 목공사", "목공 인건비", "기공", "인"],
  ["도어및목공", "3-1 도어", "도장 방문", "도어+문틀 도장", "EA"],
  ["타일및화장실", "4-1 타일공사", "주방벽 타일", "", "M2"],
  ["타일및화장실", "4-1 타일공사", "발코니 타일", "", "M2"],
  ["타일및화장실", "4-1 타일공사", "줄눈 시공", "", "M2"],
  ["타일및화장실", "4-2 화장실공사", "욕실 덧방", "기존 타일 위 시공", "개소"],
  ["타일및화장실", "4-2 화장실공사", "욕실 천장재", "SMC·ABS", "개소"],
  ["타일및화장실", "4-2 화장실공사", "샤워부스", "강화유리", "EA"],
  ["타일및화장실", "4-2 화장실공사", "젠다이", "인조대리석 상판", "M"],
  ["수장", "5-2 도배", "실크 도배", "LX·개나리 실크", "평"],
  ["수장", "5-2 도배", "합지 도배", "소폭 합지", "평"],
  ["수장", "5-3 바닥", "장판", "1.8~2.2T", "M2"],
  ["수장", "5-3 바닥", "데코타일", "", "M2"],
  ["수장", "5-1 필름", "인테리어 필름", "문·문틀", "EA"],
  ["수장", "5-1 필름", "샷시 필름", "", "EA"],
  ["수장", "5-4 도장", "탄성코트", "발코니", "M2"],
  ["창호및금속유리", "6-1 창호", "PVC 이중창", "브랜드·규격 기재", "틀"],
  ["창호및금속유리", "6-1 창호", "발코니 창", "", "EA"],
  ["창호및금속유리", "6-2 금속유리", "3연동 중문", "", "EA"],
  ["창호및금속유리", "6-2 금속유리", "슬림 중문", "", "EA"],
  ["창호및금속유리", "6-2 금속유리", "강화유리 파티션", "", "M2"],
  ["창호및금속유리", "6-2 금속유리", "방범창", "", "EA"],
  ["공조시설", "7-1 에어컨공사", "시스템에어컨 실내기", "", "대"],
  ["공조시설", "7-1 에어컨공사", "냉매 배관", "", "M"],
  ["공조시설", "7-1 에어컨공사", "드레인 배관", "", "M"],
  ["공조시설", "7-2 공조공사", "보일러 교체", "콘덴싱", "대"],
  ["공조시설", "7-2 공조공사", "난방 분배기", "", "식"],
  ["가구", "8-1 가구", "주방 상부장", "", "M"],
  ["가구", "8-1 가구", "주방 하부장", "", "M"],
  ["가구", "8-1 가구", "키큰장", "", "EA"],
  ["가구", "8-1 가구", "냉장고장", "", "EA"],
  ["가구", "8-1 가구", "아일랜드", "", "EA"],
  ["가구", "8-1 가구", "붙박이장", "", "자"],
  ["가구", "8-1 가구", "신발장", "", "EA"],
  ["가구", "8-1 가구", "드레스룸 시스템", "", "M"],
  ["가구", "8-2 상판", "주방 상판", "인조대리석·세라믹", "M"],
  ["가구", "8-3 하드웨어", "싱크볼", "", "EA"],
  ["가구", "8-3 하드웨어", "주방 수전", "", "EA"],
  ["가구", "8-3 하드웨어", "후드", "", "EA"],
  ["전기및조명", "9-1 전기공사", "배선 교체", "", "식"],
  ["전기및조명", "9-1 전기공사", "콘센트·스위치 교체", "", "EA"],
  ["전기및조명", "9-1 전기공사", "콘센트 증설", "", "EA"],
  ["전기및조명", "9-1 전기공사", "인덕션 전용선", "", "EA"],
  ["전기및조명", "9-1 전기공사", "분전반 교체", "", "EA"],
  ["전기및조명", "9-1 전기공사", "통신·TV 단자", "", "EA"],
  ["전기및조명", "9-2 조명공사", "다운라이트", "", "EA"],
  ["전기및조명", "9-2 조명공사", "LED 라인조명", "", "M"],
  ["전기및조명", "9-2 조명공사", "방등·거실등", "", "EA"],
  ["전기및조명", "9-2 조명공사", "센서등", "현관", "EA"],
  ["전기및조명", "9-1 전기공사", "인터폰·월패드", "", "식"],
];

const items = JSON.parse(readFileSync(itemsPath, "utf-8"));
const template = JSON.parse(readFileSync(templatePath, "utf-8"));
const key = (i) => `${i.category}|${i.name}|${i.spec ?? ""}`;
const simple = new Map(template.items.map((t) => [key(t), t]));

function priceKind(note = "") {
  if (note.includes("매입가")) return "매입가";
  if (note.includes("업체")) return "업체가";
  return "견적가";
}

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const { rows } = await client.query("select count(*)::int as n from estimate_items");
  if (rows[0].n > 0) {
    console.log(`이미 품목 ${rows[0].n}개가 있어 건너뜁니다.`);
    process.exit(0);
  }
  await client.query("begin");
  let order = 0;
  let matched = 0;
  const sorted = [...items].sort(
    (a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category)
  );
  for (const item of sorted) {
    const t = simple.get(key(item));
    if (t) matched += 1;
    await client.query(
      `insert into estimate_items (category, subcategory, name, spec, unit, material_price, labor_price, price_kind, simple_qty, qty_basis, note, source, sort_order)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [
        CATEGORY_ORDER.includes(item.category) ? item.category : "기타",
        item.subcategory || null,
        item.name,
        item.spec || null,
        item.unit || null,
        Number(item.material_price) || 0,
        Number(item.labor_price) || 0,
        priceKind(item.note),
        t ? Number(t.default_qty) : null,
        t?.qty_basis || null,
        item.note || null,
        item.source || null,
        (order += 1),
      ]
    );
  }
  // 간단 양식에만 있고 라이브러리에 없는 품목도 넣는다
  for (const t of template.items) {
    if (items.some((i) => key(i) === key(t))) continue;
    await client.query(
      `insert into estimate_items (category, subcategory, name, spec, unit, material_price, labor_price, simple_qty, qty_basis, sort_order)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [t.category, t.subcategory || null, t.name, t.spec || null, t.unit || null, Number(t.material_price) || 0, Number(t.labor_price) || 0, Number(t.default_qty), t.qty_basis || null, (order += 1)]
    );
    matched += 1;
  }
  // 인테리어 견적에 자주 나오는 품목 중 라이브러리에 없는 것 (단가는 품목 관리에서 입력)
  let extraCount = 0;
  for (const [category, subcategory, name, spec, unit] of EXTRA_ITEMS) {
    const exists = await client.query("select 1 from estimate_items where category = $1 and name = $2 limit 1", [category, name]);
    if (exists.rowCount) continue;
    await client.query(
      `insert into estimate_items (category, subcategory, name, spec, unit, note, source, sort_order)
       values ($1,$2,$3,$4,$5,'단가 입력 필요','표준 품목 (인테리어 견적 사례)',$6)`,
      [category, subcategory, name, spec, unit, (order += 1)]
    );
    extraCount += 1;
  }
  console.log(`표준 품목 ${extraCount}개 추가 (단가 입력 필요)`);
  await client.query("commit");
  console.log(`품목 ${order}개 등록, 간단 양식 품목 ${matched}개 연결`);
} catch (error) {
  await client.query("rollback");
  console.error("실패:", error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}

