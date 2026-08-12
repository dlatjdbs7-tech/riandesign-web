import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import type { Profile, Vendor } from "@/lib/types";
import { createVendor, deleteVendor } from "../../vendors/actions";
import VendorTierCell from "@/components/admin/VendorTierCell";

const TRADE_ORDER = [
  "철거",
  "설비",
  "폐기물",
  "전기",
  "목공",
  "타일",
  "필름",
  "도장",
  "마루",
  "욕실셋팅",
  "가구",
  "도배",
  "유리·실리콘",
  "청소",
];
const TIERS = ["메인", "서브A", "서브B"];
const MATERIAL_ORDER = ["마루자재", "타일자재", "조명자재", "가구자재", "도배·필름자재", "욕실자재", "기타자재"];

export default async function FieldManagementVendorsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = await supabase.from("profiles").select("*").eq("id", user!.id).single<Profile>();
  const canManage = me?.role === "owner" || me?.role === "manager";

  const { data: vendors } = await supabase
    .from("vendors")
    .select("*")
    .order("created_at", { ascending: true })
    .returns<Vendor[]>();

  const tradeCell = new Map<string, Vendor>();
  const grouped = new Map<string, Vendor[]>();
  for (const v of vendors ?? []) {
    const key = v.category?.trim() || "기타";
    if (TRADE_ORDER.includes(key)) {
      const cellKey = `${key}|${v.tier ?? "메인"}`;
      if (!tradeCell.has(cellKey)) tradeCell.set(cellKey, v);
    } else {
      grouped.set(key, [...(grouped.get(key) ?? []), v]);
    }
  }

  const knownCategories = new Set(MATERIAL_ORDER);
  const extraCategories = Array.from(grouped.keys())
    .filter((c) => !knownCategories.has(c) && c !== "기타")
    .sort((a, b) => a.localeCompare(b, "ko"));
  const etcOrder = [...extraCategories, "기타"];

  function renderCategoryCell(category: string) {
    const items = (grouped.get(category) ?? []).sort((a, b) => a.name.localeCompare(b.name, "ko"));
    if (category === "기타" && items.length === 0) return null;

    return (
      <div key={category} className="flex flex-col rounded-sm border border-nude/60 bg-white">
        <div className="border-b border-nude/50 bg-sky-50 px-3 py-2">
          <p className="font-serif text-sm font-semibold text-charcoal">{category}</p>
        </div>

        <div className="flex flex-1 flex-col gap-1.5 p-3">
          {items.length === 0 && <p className="py-2 text-center text-xs text-charcoal/30">등록된 업체 없음</p>}
          {items.map((v) => (
            <div
              key={v.id}
              className="group flex items-center justify-between gap-2 rounded-sm border border-nude/40 bg-stone-50 px-2.5 py-1.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-charcoal">{v.name}</p>
                {v.contact && <p className="truncate text-xs text-charcoal/50">{v.contact}</p>}
              </div>
              {canManage && (
                <form action={deleteVendor.bind(null, v.id)}>
                  <button
                    type="submit"
                    className="shrink-0 text-xs text-charcoal/30 opacity-0 hover:text-red-600 group-hover:opacity-100"
                  >
                    삭제
                  </button>
                </form>
              )}
            </div>
          ))}
        </div>

        {canManage && (
          <form action={createVendor} className="flex items-center gap-1.5 border-t border-nude/40 p-2">
            <input type="hidden" name="category" value={category === "기타" ? "" : category} />
            <input
              name="name"
              required
              placeholder="업체명"
              className="w-0 flex-1 border-b border-nude bg-transparent py-1 text-xs outline-none focus:border-orange-400"
            />
            <input
              name="contact"
              placeholder="연락처"
              className="w-16 border-b border-nude bg-transparent py-1 text-xs outline-none focus:border-orange-400"
            />
            <button
              type="submit"
              className="shrink-0 rounded-sm bg-orange-300 px-2 py-1 text-xs font-medium text-orange-900 hover:bg-orange-400"
            >
              +
            </button>
          </form>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-charcoal">협력업체</h1>
          <p className="mt-2 text-sm text-charcoal/60">공정별 협력업체 연락처를 정리합니다.</p>
        </div>
        <Link href="/admin/field-management" className="text-xs text-taupe hover:text-orange-600">
          ← 시공관리
        </Link>
      </div>

      <h2 className="mt-6 font-serif text-base font-semibold text-charcoal">시공팀 협력업체</h2>
      <div className="mt-3 overflow-x-auto rounded-sm border border-nude/60 bg-white">
        <table className="w-full min-w-[560px] table-fixed text-left">
          <thead>
            <tr className="border-b-2 border-nude/60 bg-stone-50 text-xs text-charcoal/60">
              <th className="w-20 px-3 py-2 font-normal">공정</th>
              {TIERS.map((tier) => (
                <th key={tier} className="px-3 py-2 font-normal">
                  {tier}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TRADE_ORDER.map((trade) => (
              <tr key={trade} className="border-b border-nude/30 last:border-0">
                <td className="px-3 py-2 align-top text-sm font-medium text-charcoal">{trade}</td>
                {TIERS.map((tier) => (
                  <td key={tier} className="px-3 py-2 align-top">
                    <VendorTierCell
                      vendor={tradeCell.get(`${trade}|${tier}`) ?? null}
                      category={trade}
                      tier={tier}
                      canManage={canManage}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <hr className="my-8 border-t-2 border-dashed border-nude" />

      <h2 className="font-serif text-base font-semibold text-charcoal">자재</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {MATERIAL_ORDER.map(renderCategoryCell)}
      </div>

      {etcOrder.some((c) => (grouped.get(c) ?? []).length > 0) && (
        <>
          <hr className="my-8 border-t-2 border-dashed border-nude" />
          <h2 className="font-serif text-base font-semibold text-charcoal">기타</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {etcOrder.map(renderCategoryCell)}
          </div>
        </>
      )}
    </div>
  );
}
