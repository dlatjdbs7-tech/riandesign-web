"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { moveToTrash } from "@/lib/trash";
import { DEFAULT_RATES, calcEstimate, type EstimateKind } from "@/lib/estimate";

export type EstimateLineInput = {
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
};

export type EstimateHeaderInput = {
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
};

const SIMPLE_BASE_PY = 34; // 간단 양식 기본 수량의 기준 평수
const MIN_ROWS = 4; // 간단 양식에서 세부공종마다 최소로 보여줄 줄 수

// 새 견적서: 간단 양식이면 기본 품목을 평수에 맞춰 미리 체크해 둔다.
export async function createEstimate(formData: FormData) {
  const kind: EstimateKind = formData.get("kind") === "simple" ? "simple" : "detail";
  const title = String(formData.get("title") ?? "").trim() || "새 견적서";
  const areaPy = Number(String(formData.get("area_py") ?? "").replace(/,/g, "")) || null;
  const rates = DEFAULT_RATES[kind];

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: estimate, error } = await supabase
    .from("estimates")
    .insert({
      kind,
      title,
      customer_name: String(formData.get("customer_name") ?? "").trim() || null,
      area_py: areaPy,
      area_m2: areaPy ? Math.round(areaPy * 3.3058 * 100) / 100 : null,
      expense_rate: rates.expense,
      misc_rate: rates.misc,
      profit_rate: rates.profit,
      vat_rate: rates.vat,
      vat_included: rates.vatIncluded,
      notes: kind === "detail" ? "견적 외 별도\n부가세 포함" : "부가세 별도",
      created_by: user?.id,
    })
    .select("id")
    .single<{ id: string }>();
  if (error || !estimate) throw new Error("견적서를 만들지 못했습니다.");

  if (kind === "simple") {
    const { data: items } = await supabase
      .from("estimate_items")
      .select("*")
      .not("simple_qty", "is", null)
      .eq("is_active", true)
      .order("sort_order");
    const scale = areaPy ? areaPy / SIMPLE_BASE_PY : 1;
    const lines = (items ?? []).map((item, index) => {
      const basis = String(item.qty_basis ?? "");
      const scaled = basis.includes("평") || basis.includes("m2") || basis.includes("면적");
      const qty = scaled ? Math.round(Number(item.simple_qty) * scale * 10) / 10 : Number(item.simple_qty);
      return {
        estimate_id: estimate.id,
        item_id: item.id,
        category: item.category,
        subcategory: item.subcategory,
        name: item.name,
        spec: item.spec,
        unit: item.unit,
        qty,
        material_price: item.material_price,
        labor_price: item.labor_price,
        note: null,
        sort_order: index,
      };
    });
    // 줄이 적은 세부공종은 같은 종류 품목을 수량 0으로 채워 최소 MIN_ROWS줄 (비어 보이지 않게, 고르기 쉽게)
    const { data: allItems } = await supabase
      .from("estimate_items")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");
    const usedIds = new Set(lines.map((l) => l.item_id));
    const groupKeys = [...new Set(lines.map((l) => `${l.category}|${l.subcategory ?? ""}`))];
    for (const key of groupKeys) {
      const [category, sub] = key.split("|");
      const count = lines.filter((l) => l.category === category && (l.subcategory ?? "") === sub).length;
      const fillers = (allItems ?? [])
        .filter((i) => i.category === category && (i.subcategory ?? "") === sub && !usedIds.has(i.id))
        .slice(0, Math.max(0, MIN_ROWS - count));
      for (const item of fillers) {
        usedIds.add(item.id);
        lines.push({
          estimate_id: estimate.id,
          item_id: item.id,
          category: item.category,
          subcategory: item.subcategory,
          name: item.name,
          spec: item.spec,
          unit: item.unit,
          qty: 0,
          material_price: item.material_price,
          labor_price: item.labor_price,
          note: null,
          sort_order: lines.length,
        });
      }
    }
    if (lines.length > 0) await supabase.from("estimate_lines").insert(lines);
    await updateTotal(supabase, estimate.id);
  }

  revalidatePath("/admin/estimates");
  redirect(`/admin/estimates/${estimate.id}`);
}

async function updateTotal(supabase: Awaited<ReturnType<typeof createClient>>, id: string) {
  const [{ data: est }, { data: lines }] = await Promise.all([
    supabase.from("estimates").select("*").eq("id", id).single(),
    supabase.from("estimate_lines").select("category, qty, material_price, labor_price").eq("estimate_id", id),
  ]);
  if (!est) return;
  const result = calcEstimate(
    (lines ?? []).map((l) => ({ ...l, qty: Number(l.qty), material_price: Number(l.material_price), labor_price: Number(l.labor_price) })),
    {
      expense: Number(est.expense_rate),
      misc: Number(est.misc_rate),
      profit: Number(est.profit_rate),
      vat: Number(est.vat_rate),
      vatIncluded: est.vat_included,
      roundUnit: est.round_unit,
    }
  );
  await supabase.from("estimates").update({ total_amount: result.final }).eq("id", id);
}

// 견적서 저장: 머리 정보 + 체크한 품목 전체를 한 번에 저장한다.
export async function saveEstimate(id: string, header: EstimateHeaderInput, lines: EstimateLineInput[]) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("estimates")
    .update({ ...header, title: header.title.trim() || "새 견적서", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: "저장하지 못했습니다." };

  await supabase.from("estimate_lines").delete().eq("estimate_id", id);
  if (lines.length > 0) {
    const { error: lineError } = await supabase
      .from("estimate_lines")
      .insert(lines.map((line, index) => ({ ...line, estimate_id: id, sort_order: index })));
    if (lineError) return { error: "품목을 저장하지 못했습니다." };
  }
  await updateTotal(supabase, id);
  revalidatePath("/admin/estimates");
  revalidatePath(`/admin/estimates/${id}`);
  return { ok: true as const, savedAt: new Date().toISOString() };
}

// 사본 만들기 (수정 견적, 다른 안 만들 때)
export async function copyEstimate(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ data: est }, { data: lines }] = await Promise.all([
    supabase.from("estimates").select("*").eq("id", id).single(),
    supabase.from("estimate_lines").select("*").eq("estimate_id", id).order("sort_order"),
  ]);
  if (!est) return;
  /* eslint-disable @typescript-eslint/no-unused-vars */
  const { id: _id, share_token: _t, created_at: _c, updated_at: _u, ...rest } = est;
  const { data: copy } = await supabase
    .from("estimates")
    .insert({ ...rest, title: `${est.title} (수정)`, status: "draft", quote_date: new Date().toISOString().slice(0, 10), created_by: user?.id })
    .select("id")
    .single<{ id: string }>();
  if (!copy) return;
  if (lines && lines.length > 0) {
    await supabase
      .from("estimate_lines")
      .insert(lines.map(({ id: _lid, estimate_id: _eid, ...line }) => ({ ...line, estimate_id: copy.id })));
  }
  /* eslint-enable @typescript-eslint/no-unused-vars */
  revalidatePath("/admin/estimates");
  redirect(`/admin/estimates/${copy.id}`);
}

export async function deleteEstimate(id: string) {
  const supabase = await createClient();
  const trashed = await moveToTrash(supabase, "estimates", id);
  revalidatePath("/admin/estimates");
  return trashed;
}

// ── 품목 라이브러리 ─────────────────────────────────────────────

export type ItemInput = {
  category: string;
  subcategory: string | null;
  name: string;
  spec: string | null;
  unit: string | null;
  material_price: number;
  labor_price: number;
  price_kind?: string;
  note?: string | null;
};

async function nextSortOrder(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase.from("estimate_items").select("sort_order").order("sort_order", { ascending: false }).limit(1);
  return (data?.[0]?.sort_order ?? 0) + 1;
}

// 견적서에서 직접 쓴 품목을 품목 목록에 저장 (다음 견적부터 체크로 고를 수 있게)
export async function saveCustomToLibrary(input: ItemInput) {
  if (!input.name.trim()) return { error: "품명을 먼저 적어 주세요." };
  const supabase = await createClient();
  const { data: dup } = await supabase
    .from("estimate_items")
    .select("id")
    .eq("category", input.category)
    .eq("name", input.name.trim())
    .eq("spec", input.spec ?? "")
    .maybeSingle();
  if (dup) return { error: "같은 품목이 이미 목록에 있어요." };
  const { error } = await supabase.from("estimate_items").insert({
    ...input,
    name: input.name.trim(),
    price_kind: input.price_kind ?? "견적가",
    note: input.note ?? "견적서에서 직접 추가",
    source: "직접 입력",
    sort_order: await nextSortOrder(supabase),
  });
  if (error) return { error: "저장하지 못했습니다. 품목 저장은 대표·팀장만 할 수 있어요." };
  revalidatePath("/admin/estimates/items");
  return { ok: true as const };
}

// 품목 관리 화면: 새 품목
export async function createItem(formData: FormData) {
  const num = (k: string) => Number(String(formData.get(k) ?? "").replace(/,/g, "")) || 0;
  const text = (k: string) => String(formData.get(k) ?? "").trim() || null;
  const name = text("name");
  const category = text("category");
  if (!name || !category) return;
  const supabase = await createClient();
  await supabase.from("estimate_items").insert({
    category,
    subcategory: text("subcategory"),
    name,
    spec: text("spec"),
    unit: text("unit"),
    material_price: num("material_price"),
    labor_price: num("labor_price"),
    price_kind: text("price_kind") ?? "견적가",
    note: text("note"),
    source: "직접 입력",
    sort_order: await nextSortOrder(supabase),
  });
  revalidatePath("/admin/estimates/items");
}

// 품목 관리 화면: 칸 하나 고치기 (단가·이름 등)
export async function updateItemField(id: string, field: string, value: string) {
  const allowed = ["name", "spec", "unit", "subcategory", "material_price", "labor_price", "price_kind", "note"];
  if (!allowed.includes(field)) return;
  const numeric = field === "material_price" || field === "labor_price";
  const supabase = await createClient();
  await supabase
    .from("estimate_items")
    .update({ [field]: numeric ? Number(value.replace(/,/g, "")) || 0 : value.trim() || null, updated_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/admin/estimates/items");
}

export async function deleteItem(id: string) {
  const supabase = await createClient();
  const trashed = await moveToTrash(supabase, "estimate_items", id);
  revalidatePath("/admin/estimates/items");
  return trashed;
}

// ── 고객 링크 ───────────────────────────────────────────────
const SHARE_DAYS = 3; // 고객 링크 열람 기간(일)

// 고객에게 보내기: 지금부터 3일 동안 열람 가능. 고객 전화번호가 있어야 한다(열람할 때 확인).
export async function openShareLink(id: string) {
  const supabase = await createClient();
  const { data: est } = await supabase.from("estimates").select("customer_phone, status, share_token").eq("id", id).single();
  if (!est) return { error: "견적서를 찾을 수 없습니다." };
  if (!String(est.customer_phone ?? "").replace(/\D/g, "")) {
    return { error: "고객 연락처를 먼저 넣어 주세요. 고객은 전화번호 뒤 4자리를 입력해야 견적서를 볼 수 있어요." };
  }
  const expiresAt = new Date(Date.now() + SHARE_DAYS * 24 * 60 * 60 * 1000).toISOString();
  await supabase
    .from("estimates")
    .update({ share_expires_at: expiresAt, ...(est.status === "draft" ? { status: "sent" } : {}) })
    .eq("id", id);
  revalidatePath(`/admin/estimates/${id}`);
  revalidatePath("/admin/estimates");
  return { ok: true as const, token: est.share_token as string, expiresAt };
}

// 링크 바로 닫기
export async function closeShareLink(id: string) {
  const supabase = await createClient();
  await supabase.from("estimates").update({ share_expires_at: new Date().toISOString() }).eq("id", id);
  revalidatePath(`/admin/estimates/${id}`);
}
