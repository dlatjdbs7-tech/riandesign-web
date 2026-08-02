import { createClient } from "@/utils/supabase/server";
import type { Customer, Profile } from "@/lib/types";
import { createCustomer, deleteCustomer } from "./actions";

export default async function CustomersPage() {
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

  const { data: customers } = await supabase
    .from("customers")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<Customer[]>();

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-charcoal">고객관리</h1>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="overflow-x-auto rounded-sm border border-nude/60 bg-white">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-nude/60 text-xs tracking-wide text-charcoal/60">
              <tr>
                <th className="px-4 py-3">이름</th>
                <th className="px-4 py-3">연락처</th>
                <th className="px-4 py-3">주소</th>
                {canManage && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody>
              {customers?.map((c) => (
                <tr key={c.id} className="border-b border-nude/30 last:border-0">
                  <td className="px-4 py-3">{c.name}</td>
                  <td className="px-4 py-3 text-charcoal/70">{c.phone ?? "-"}</td>
                  <td className="px-4 py-3 text-charcoal/70">{c.address ?? "-"}</td>
                  {canManage && (
                    <td className="px-4 py-3">
                      <form action={deleteCustomer.bind(null, c.id)}>
                        <button type="submit" className="text-xs text-red-700 underline hover:no-underline">
                          삭제
                        </button>
                      </form>
                    </td>
                  )}
                </tr>
              ))}
              {(!customers || customers.length === 0) && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-charcoal/50">
                    등록된 고객이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {canManage && (
          <form
            action={createCustomer}
            className="flex h-fit flex-col gap-4 rounded-sm border border-nude/60 bg-white p-6"
          >
            <input name="name" placeholder="이름" required className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-gold" />
            <input name="phone" placeholder="연락처" className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-gold" />
            <input name="email" placeholder="이메일" className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-gold" />
            <input name="address" placeholder="주소" className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-gold" />
            <textarea name="memo" placeholder="메모" rows={3} className="resize-none border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-gold" />
            <button type="submit" className="self-start rounded-full bg-charcoal px-6 py-2 text-sm tracking-wide text-cream hover:bg-gold">
              고객 등록
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
