import { createClient } from "@/utils/supabase/server";
import type { Category } from "@/lib/types";
import { createCategory, deleteCategory } from "@/app/admin/categories/actions";

export default async function CategorySection({ type, canManage }: { type: string; canManage: boolean }) {
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .eq("type", type)
    .order("created_at", { ascending: false })
    .returns<Category[]>();

  return (
    <div className="mt-8 rounded-sm border border-nude/60 bg-white p-5">
      <h2 className="font-serif text-sm font-semibold text-charcoal">카테고리등록란</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {categories?.map((c) => (
          <div
            key={c.id}
            className="flex items-center gap-1.5 rounded-full border border-nude/60 px-3 py-1 text-xs text-charcoal"
          >
            {c.name}
            {canManage && (
              <form action={deleteCategory.bind(null, c.id)}>
                <button type="submit" className="text-charcoal/40 hover:text-red-600">
                  ×
                </button>
              </form>
            )}
          </div>
        ))}
        {(!categories || categories.length === 0) && (
          <p className="text-xs text-charcoal/40">등록된 카테고리가 없습니다.</p>
        )}
      </div>
      {canManage && (
        <form action={createCategory} className="mt-3 flex gap-2">
          <input type="hidden" name="type" value={type} />
          <input
            name="name"
            placeholder="카테고리 이름"
            required
            className="flex-1 border-b border-nude bg-transparent py-1.5 text-xs outline-none focus:border-orange-400"
          />
          <button
            type="submit"
            className="shrink-0 rounded-full border border-orange-400 px-3 py-1 text-xs text-orange-700 hover:bg-orange-100"
          >
            + 등록
          </button>
        </form>
      )}
    </div>
  );
}
