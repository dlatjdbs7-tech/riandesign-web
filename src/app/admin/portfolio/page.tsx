import { createClient } from "@/utils/supabase/server";
import type { PortfolioItem, Profile } from "@/lib/types";
import { createPortfolioItem, deletePortfolioItem } from "./actions";

export default async function PortfolioPage() {
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

  const { data: items } = await supabase
    .from("portfolio_items")
    .select("*")
    .order("display_order")
    .returns<PortfolioItem[]>();

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-charcoal">포트폴리오</h1>
      <p className="mt-2 text-sm text-charcoal/60">
        여기서 등록한 항목이 홈페이지 시공 사례 섹션에 그대로 표시됩니다.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="overflow-x-auto rounded-sm border border-nude/60 bg-white">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead className="border-b border-nude/60 text-xs tracking-wide text-charcoal/60">
              <tr>
                <th className="px-4 py-3">제목</th>
                <th className="px-4 py-3">분류</th>
                <th className="px-4 py-3">순서</th>
                {canManage && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody>
              {items?.map((item) => (
                <tr key={item.id} className="border-b border-nude/30 last:border-0">
                  <td className="px-4 py-3">{item.title}</td>
                  <td className="px-4 py-3 text-charcoal/70">{item.category ?? "-"}</td>
                  <td className="px-4 py-3 text-charcoal/70">{item.display_order}</td>
                  {canManage && (
                    <td className="px-4 py-3">
                      <form action={deletePortfolioItem.bind(null, item.id)}>
                        <button type="submit" className="text-xs text-red-700 underline hover:no-underline">
                          삭제
                        </button>
                      </form>
                    </td>
                  )}
                </tr>
              ))}
              {(!items || items.length === 0) && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-charcoal/50">
                    등록된 포트폴리오가 없습니다. (등록 전까지는 홈페이지에 임시 이미지가 표시됩니다)
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {canManage && (
          <form action={createPortfolioItem} className="flex h-fit flex-col gap-4 rounded-sm border border-nude/60 bg-white p-6">
            <input name="title" placeholder="제목" required className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-gold" />
            <input name="category" placeholder="분류 (예: 주거공간)" className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-gold" />
            <input name="image_url" placeholder="이미지 URL (선택)" className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-gold" />
            <input name="display_order" type="number" placeholder="표시 순서" defaultValue={0} className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-gold" />
            <button type="submit" className="self-start rounded-full bg-charcoal px-6 py-2 text-sm tracking-wide text-cream hover:bg-gold">
              포트폴리오 등록
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
