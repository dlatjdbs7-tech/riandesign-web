import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { ESTIMATE_CATEGORIES, categoryLabel, type EstimateItem } from "@/lib/estimate";
import { createItem, deleteItem } from "../actions";
import ItemCell from "@/components/admin/estimate/ItemCell";
import DeleteButton from "@/components/admin/DeleteButton";

// 견적 품목 관리: 품목을 직접 만들고, 단가를 고치고, 안 쓰는 품목은 지운다(휴지통).
export default async function EstimateItemsPage({ searchParams }: { searchParams: Promise<{ cat?: string; q?: string }> }) {
  const sp = await searchParams;
  const cat = ESTIMATE_CATEGORIES.some((c) => c.key === sp.cat) ? sp.cat! : ESTIMATE_CATEGORIES[0].key;
  const q = (sp.q ?? "").trim();

  const supabase = await createClient();
  let query = supabase.from("estimate_items").select("*").eq("is_active", true).order("sort_order");
  query = q ? query.or(`name.ilike.%${q.replace(/[%,()]/g, "")}%,spec.ilike.%${q.replace(/[%,()]/g, "")}%`) : query.eq("category", cat);
  const [{ data: items }, { data: counts }] = await Promise.all([
    query.returns<EstimateItem[]>(),
    supabase.from("estimate_items").select("category").eq("is_active", true).returns<{ category: string }[]>(),
  ]);
  const countBy = new Map<string, number>();
  for (const r of counts ?? []) countBy.set(r.category, (countBy.get(r.category) ?? 0) + 1);
  const subcategories = [...new Set((items ?? []).map((i) => i.subcategory).filter(Boolean))] as string[];

  const field = "rounded-lg border border-nude px-3 py-2 text-sm outline-none focus:border-orange-400";

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/estimates" className="text-sm text-charcoal/50 hover:text-orange-600">
            ← 견적서
          </Link>
          <h1 className="mt-1 font-serif text-2xl font-semibold text-charcoal">견적 품목 관리</h1>
          <p className="mt-1 text-sm text-charcoal/50">견적서에서 체크로 고르는 품목 목록입니다. 칸을 눌러 고치면 바로 저장됩니다(이미 만든 견적서 금액은 바뀌지 않아요).</p>
        </div>
        <form className="flex gap-2">
          <input name="q" defaultValue={q} placeholder="전체에서 품목 검색" className={field} />
          <button className="rounded-lg bg-charcoal px-4 py-2 text-sm text-cream">검색</button>
        </form>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {ESTIMATE_CATEGORIES.map((c) => (
          <Link
            key={c.key}
            href={`/admin/estimates/items?cat=${c.key}`}
            className={`rounded-lg border px-3 py-1.5 text-sm ${
              !q && cat === c.key ? "border-orange-400 bg-orange-50 font-semibold text-orange-700" : "border-nude/70 bg-white text-charcoal/60 hover:border-orange-300"
            }`}
          >
            {c.no}. {c.label} <span className="text-xs text-charcoal/40">{countBy.get(c.key) ?? 0}</span>
          </Link>
        ))}
      </div>

      {/* 새 품목 */}
      <form action={createItem} className="mt-4 rounded-xl border-2 border-dashed border-orange-200 bg-white p-4">
        <p className="text-sm font-semibold text-charcoal">+ 새 품목 직접 만들기</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1.4fr_1.2fr_70px_110px_110px_100px_auto]">
          <select name="category" defaultValue={q ? ESTIMATE_CATEGORIES[0].key : cat} className={field}>
            {ESTIMATE_CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
          <input name="subcategory" list="subcats" placeholder="세부공종 (예: 5-2 도배)" className={field} />
          <datalist id="subcats">
            {subcategories.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
          <input name="name" required placeholder="품명 *" className={field} />
          <input name="spec" placeholder="규격" className={field} />
          <input name="unit" placeholder="단위" className={field} />
          <input name="material_price" inputMode="numeric" placeholder="재료 단가" className={`${field} text-right`} />
          <input name="labor_price" inputMode="numeric" placeholder="노무 단가" className={`${field} text-right`} />
          <select name="price_kind" className={field}>
            <option>견적가</option>
            <option>매입가</option>
            <option>업체가</option>
          </select>
          <button className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600">추가</button>
        </div>
      </form>

      <div className="mt-4 overflow-x-auto rounded-xl border border-nude/60 bg-white">
        <table className="w-full min-w-[960px] text-sm">
          <thead className="border-b border-nude/60 bg-stone-50 text-xs text-charcoal/55">
            <tr>
              {q && <th className="px-2 py-2 text-left font-medium">공종</th>}
              <th className="w-40 px-2 py-2 text-left font-medium">세부공종</th>
              <th className="px-2 py-2 text-left font-medium">품명</th>
              <th className="px-2 py-2 text-left font-medium">규격</th>
              <th className="w-16 px-2 py-2 font-medium">단위</th>
              <th className="w-28 px-2 py-2 text-right font-medium">재료 단가</th>
              <th className="w-28 px-2 py-2 text-right font-medium">노무 단가</th>
              <th className="w-20 px-2 py-2 font-medium">단가 종류</th>
              <th className="w-12 px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {items?.map((i) => (
              <tr key={i.id} className="border-b border-nude/30 last:border-0">
                {q && <td className="px-2 py-1 text-xs text-charcoal/55">{categoryLabel(i.category)}</td>}
                <td className="px-1 py-1">
                  <ItemCell id={i.id} field="subcategory" value={i.subcategory} className="text-xs text-charcoal/60" />
                </td>
                <td className="px-1 py-1">
                  <ItemCell id={i.id} field="name" value={i.name} className="font-medium" />
                </td>
                <td className="px-1 py-1">
                  <ItemCell id={i.id} field="spec" value={i.spec} className="text-xs text-charcoal/60" />
                </td>
                <td className="px-1 py-1">
                  <ItemCell id={i.id} field="unit" value={i.unit} className="text-center text-xs" />
                </td>
                <td className="px-1 py-1">
                  <ItemCell id={i.id} field="material_price" value={i.material_price} numeric />
                </td>
                <td className="px-1 py-1">
                  <ItemCell id={i.id} field="labor_price" value={i.labor_price} numeric />
                </td>
                <td className="px-1 py-1">
                  <ItemCell id={i.id} field="price_kind" value={i.price_kind} className="text-center text-xs" />
                </td>
                <td className="px-2 py-1 text-right">
                  <DeleteButton action={deleteItem.bind(null, i.id)} className="text-xs text-charcoal/40 hover:text-red-600" />
                </td>
              </tr>
            ))}
            {(!items || items.length === 0) && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-charcoal/45">
                  품목이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
