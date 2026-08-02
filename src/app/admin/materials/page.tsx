import { createClient } from "@/utils/supabase/server";
import type { Material, Profile } from "@/lib/types";
import { createMaterial, deleteMaterial } from "./actions";

export default async function MaterialsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single<Profile>();
  const canManage = me?.role === "owner" || me?.role === "manager";

  const { data: materials } = await supabase
    .from("materials")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<Material[]>();

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-charcoal">자재리스트</h1>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="overflow-x-auto rounded-sm border border-nude/60 bg-white">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-nude/60 text-xs tracking-wide text-charcoal/60">
              <tr>
                <th className="px-4 py-3">품명</th>
                <th className="px-4 py-3">규격</th>
                <th className="px-4 py-3">단위</th>
                <th className="px-4 py-3">단가</th>
                <th className="px-4 py-3">거래처</th>
                {canManage && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody>
              {materials?.map((m) => (
                <tr key={m.id} className="border-b border-nude/30 last:border-0">
                  <td className="px-4 py-3">{m.name}</td>
                  <td className="px-4 py-3 text-charcoal/70">{m.spec ?? "-"}</td>
                  <td className="px-4 py-3 text-charcoal/70">{m.unit ?? "-"}</td>
                  <td className="px-4 py-3 text-charcoal/70">
                    {m.unit_price ? `${m.unit_price.toLocaleString()}원` : "-"}
                  </td>
                  <td className="px-4 py-3 text-charcoal/70">{m.supplier ?? "-"}</td>
                  {canManage && (
                    <td className="px-4 py-3">
                      <form action={deleteMaterial.bind(null, m.id)}>
                        <button type="submit" className="text-xs text-red-700 underline hover:no-underline">
                          삭제
                        </button>
                      </form>
                    </td>
                  )}
                </tr>
              ))}
              {(!materials || materials.length === 0) && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-charcoal/50">
                    등록된 자재가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {canManage && (
          <form action={createMaterial} className="flex h-fit flex-col gap-4 rounded-sm border border-nude/60 bg-white p-6">
            <input name="name" placeholder="품명" required className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-gold" />
            <input name="spec" placeholder="규격" className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-gold" />
            <input name="unit" placeholder="단위 (예: EA, m)" className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-gold" />
            <input name="unit_price" type="number" placeholder="단가" className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-gold" />
            <input name="supplier" placeholder="거래처" className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-gold" />
            <button type="submit" className="self-start rounded-full bg-charcoal px-6 py-2 text-sm tracking-wide text-cream hover:bg-gold">
              자재 등록
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
