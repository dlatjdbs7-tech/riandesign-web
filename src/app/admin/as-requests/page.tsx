import { createClient } from "@/utils/supabase/server";
import type { AsRequest, Customer, Profile } from "@/lib/types";
import { createAsRequest, deleteAsRequest } from "./actions";
import AsStatusSelect from "@/components/admin/AsStatusSelect";

type AsRequestRow = AsRequest & { customers: Pick<Customer, "name"> | null };

export default async function AsRequestsPage() {
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

  const { data: requests } = await supabase
    .from("as_requests")
    .select("*, customers(name)")
    .order("request_date", { ascending: false })
    .returns<AsRequestRow[]>();

  const { data: customers } = canManage
    ? await supabase.from("customers").select("id, name").order("name").returns<Pick<Customer, "id" | "name">[]>()
    : { data: null };

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-charcoal">AS관리</h1>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="overflow-x-auto rounded-sm border border-nude/60 bg-white">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-nude/60 text-xs tracking-wide text-charcoal/60">
              <tr>
                <th className="px-4 py-3">제목</th>
                <th className="px-4 py-3">고객</th>
                <th className="px-4 py-3">날짜</th>
                <th className="px-4 py-3">상태</th>
                {canManage && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody>
              {requests?.map((r) => (
                <tr key={r.id} className="border-b border-nude/30 last:border-0">
                  <td className="px-4 py-3">{r.title}</td>
                  <td className="px-4 py-3 text-charcoal/70">{r.customers?.name ?? "-"}</td>
                  <td className="px-4 py-3 text-charcoal/70">{r.request_date}</td>
                  <td className="px-4 py-3">
                    {canManage ? <AsStatusSelect id={r.id} status={r.status} /> : r.status}
                  </td>
                  {canManage && (
                    <td className="px-4 py-3">
                      <form action={deleteAsRequest.bind(null, r.id)}>
                        <button type="submit" className="text-xs text-red-700 underline hover:no-underline">
                          삭제
                        </button>
                      </form>
                    </td>
                  )}
                </tr>
              ))}
              {(!requests || requests.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-charcoal/50">
                    등록된 AS 요청이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {canManage && (
          <form action={createAsRequest} className="flex h-fit flex-col gap-4 rounded-sm border border-nude/60 bg-white p-6">
            <input name="title" placeholder="제목" required className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-gold" />
            <select name="customer_id" className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-gold">
              <option value="">고객 선택 안 함</option>
              {customers?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <input name="request_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-gold" />
            <textarea name="description" placeholder="내용" rows={3} className="resize-none border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-gold" />
            <button type="submit" className="self-start rounded-full bg-charcoal px-6 py-2 text-sm tracking-wide text-cream hover:bg-gold">
              AS 요청 등록
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
