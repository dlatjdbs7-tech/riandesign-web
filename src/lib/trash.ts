import type { createClient } from "@/utils/supabase/server";

// 휴지통: 지우기 전에 행(과 같이 지워지는 하위 행)을 deleted_items에 보관하고,
// "되돌리기"를 누르면 그대로 다시 넣는다. (DB: supabase/migrations/0063_deleted_items.sql)

type Supabase = Awaited<ReturnType<typeof createClient>>;
type Row = Record<string, unknown>;

export type TrashResult = { trashId: string; label: string } | { error: string };

// 부모를 지우면 DB가 같이 지우는 하위 행 (on delete cascade)
const CHILD_TABLES: Record<string, [table: string, column: string][]> = {
  work_orders: [
    ["work_order_tasks", "work_order_id"],
    ["work_order_photos", "work_order_id"],
    ["work_logs", "work_order_id"],
  ],
  customer_projects: [["customer_project_photos", "customer_project_id"]],
};

// 부모를 지우면 연결만 끊기는 행 (on delete set null) — 되돌릴 때 다시 연결한다
const LINKED_REFS: Record<string, [table: string, column: string][]> = {
  inquiries: [["quotes", "inquiry_id"]],
  quotes: [["work_orders", "quote_id"]],
  customers: [
    ["quotes", "customer_id"],
    ["transactions", "customer_id"],
    ["as_requests", "customer_id"],
    ["work_orders", "customer_id"],
  ],
};

// 휴지통 화면에 보일 이름
export const TABLE_LABEL: Record<string, string> = {
  as_requests: "AS",
  calendar_events: "캘린더 일정",
  categories: "카테고리",
  customer_project_photos: "고객페이지 사진",
  customer_projects: "고객페이지",
  customers: "고객",
  inquiries: "상담접수",
  manuals: "리안메뉴얼",
  materials: "자재",
  portfolio_items: "포트폴리오",
  process_steps: "시공프로세스",
  purchase_orders: "발주서",
  quick_links: "바로가기",
  quick_phrases: "자주 쓰는 문구",
  quotes: "견적",
  reviews: "고객후기",
  services: "서비스",
  todos: "할일",
  transactions: "거래명세서",
  vendors: "업체",
  work_directives: "작업지시서",
  work_order_photos: "현장 사진",
  work_order_tasks: "공정",
  work_orders: "현장",
  work_sites: "근무지",
};

function rowLabel(row: Row) {
  const value = row.title ?? row.name ?? row.customer_name ?? row.caption ?? row.content ?? "";
  return String(value).slice(0, 60);
}

export async function moveToTrash(supabase: Supabase, table: string, id: string): Promise<TrashResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const { data: row } = await supabase.from(table).select("*").eq("id", id).maybeSingle<Row>();
  if (!row) return { error: "이미 지워졌거나 찾을 수 없습니다." };

  const children: Record<string, Row[]> = {};
  for (const [childTable, column] of CHILD_TABLES[table] ?? []) {
    const { data } = await supabase.from(childTable).select("*").eq(column, id).returns<Row[]>();
    if (data && data.length > 0) children[childTable] = data;
  }

  const refs: { table: string; column: string; ids: string[] }[] = [];
  for (const [refTable, column] of LINKED_REFS[table] ?? []) {
    const { data } = await supabase.from(refTable).select("id").eq(column, id).returns<{ id: string }[]>();
    if (data && data.length > 0) refs.push({ table: refTable, column, ids: data.map((r) => r.id) });
  }

  const label = rowLabel(row);
  const { data: trash, error: trashError } = await supabase
    .from("deleted_items")
    .insert({ table_name: table, record_id: id, label, payload: { row, children, refs }, deleted_by: user.id })
    .select("id")
    .single<{ id: string }>();
  if (trashError || !trash) return { error: "휴지통에 보관하지 못해 지우지 않았습니다." };

  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) {
    await supabase.from("deleted_items").delete().eq("id", trash.id);
    return { error: "지우지 못했습니다." };
  }
  return { trashId: trash.id, label };
}

export async function restoreTrashItem(supabase: Supabase, trashId: string): Promise<{ ok: true; table: string } | { error: string }> {
  const { data: item } = await supabase
    .from("deleted_items")
    .select("*")
    .eq("id", trashId)
    .maybeSingle<{ table_name: string; payload: { row: Row; children?: Record<string, Row[]>; refs?: { table: string; column: string; ids: string[] }[] } }>();
  if (!item) return { error: "휴지통에서 찾을 수 없습니다." };

  const { row, children = {}, refs = [] } = item.payload;
  const { error } = await supabase.from(item.table_name).insert(row);
  if (error) return { error: "되돌리지 못했습니다. 같은 항목이 이미 있을 수 있습니다." };

  for (const [childTable, rows] of Object.entries(children)) {
    if (rows.length > 0) await supabase.from(childTable).insert(rows);
  }
  for (const ref of refs) {
    await supabase.from(ref.table).update({ [ref.column]: row.id }).in("id", ref.ids);
  }
  await supabase.from("deleted_items").delete().eq("id", trashId);
  return { ok: true, table: item.table_name };
}
