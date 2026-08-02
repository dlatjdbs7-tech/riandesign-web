import { createClient } from "@/utils/supabase/server";
import type { Profile, QuickPhrase } from "@/lib/types";
import { createQuickPhrase, deleteQuickPhrase } from "./actions";

export default async function QuickPhrasesPage() {
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

  const { data: phrases } = await supabase
    .from("quick_phrases")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<QuickPhrase[]>();

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-charcoal">자주 쓰는 문구</h1>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-3">
          {phrases?.map((p) => (
            <div key={p.id} className="flex items-start justify-between rounded-sm border border-nude/60 bg-white p-4 text-sm">
              <div>
                {p.category && <p className="text-xs text-taupe">{p.category}</p>}
                <p className="mt-1 whitespace-pre-line text-charcoal/80">{p.content}</p>
              </div>
              {canManage && (
                <form action={deleteQuickPhrase.bind(null, p.id)}>
                  <button type="submit" className="text-xs text-red-700 underline hover:no-underline">
                    삭제
                  </button>
                </form>
              )}
            </div>
          ))}
          {(!phrases || phrases.length === 0) && (
            <p className="text-sm text-charcoal/50">등록된 문구가 없습니다.</p>
          )}
        </div>

        {canManage && (
          <form action={createQuickPhrase} className="flex h-fit flex-col gap-4 rounded-sm border border-nude/60 bg-white p-6">
            <input name="category" placeholder="분류 (예: 견적 안내)" className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-gold" />
            <textarea name="content" placeholder="문구 내용" rows={4} required className="resize-none border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-gold" />
            <button type="submit" className="self-start rounded-full bg-charcoal px-6 py-2 text-sm tracking-wide text-cream hover:bg-gold">
              문구 등록
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
