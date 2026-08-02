import { createClient } from "@/utils/supabase/server";
import type { Category, Profile } from "@/lib/types";
import { createCategory, deleteCategory } from "./actions";

export default async function CategoriesPage() {
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

  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<Category[]>();

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-charcoal">카테고리</h1>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="overflow-x-auto rounded-sm border border-nude/60 bg-white">
          <table className="w-full min-w-[400px] text-left text-sm">
            <thead className="border-b border-nude/60 text-xs tracking-wide text-charcoal/60">
              <tr>
                <th className="px-4 py-3">이름</th>
                <th className="px-4 py-3">구분</th>
                {canManage && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody>
              {categories?.map((c) => (
                <tr key={c.id} className="border-b border-nude/30 last:border-0">
                  <td className="px-4 py-3">{c.name}</td>
                  <td className="px-4 py-3 text-charcoal/70">{c.type ?? "-"}</td>
                  {canManage && (
                    <td className="px-4 py-3">
                      <form action={deleteCategory.bind(null, c.id)}>
                        <button type="submit" className="text-xs text-red-700 underline hover:no-underline">
                          삭제
                        </button>
                      </form>
                    </td>
                  )}
                </tr>
              ))}
              {(!categories || categories.length === 0) && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-charcoal/50">
                    등록된 카테고리가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {canManage && (
          <form action={createCategory} className="flex h-fit flex-col gap-4 rounded-sm border border-nude/60 bg-white p-6">
            <input name="name" placeholder="이름" required className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-gold" />
            <input name="type" placeholder="구분 (예: 자재, 고객)" className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-gold" />
            <button type="submit" className="self-start rounded-full bg-charcoal px-6 py-2 text-sm tracking-wide text-cream hover:bg-gold">
              카테고리 등록
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
