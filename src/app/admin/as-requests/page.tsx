import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import type { AsRequest, Customer, Profile } from "@/lib/types";
import { createAsRequest, deleteAsRequest } from "./actions";
import AsStatusSelect from "@/components/admin/AsStatusSelect";
import FormattedPhoneInput from "@/components/admin/FormattedPhoneInput";

type AsRequestRow = AsRequest & { customers: Pick<Customer, "name"> | null };

export default async function AsRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const params = await searchParams;
  const showCreateForm = params.new === "1";

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
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-semibold text-charcoal">AS관리</h1>
        {canManage && (
          <Link
            href={showCreateForm ? "/admin/as-requests" : "/admin/as-requests?new=1"}
            className="rounded-full bg-charcoal px-4 py-2 text-xs font-medium text-cream hover:bg-charcoal/80"
          >
            + AS 접수
          </Link>
        )}
      </div>

      {showCreateForm && canManage && (
        <form
          action={createAsRequest}
          className="mt-6 grid gap-3 rounded-sm border border-nude/60 bg-white p-5 sm:grid-cols-2 lg:grid-cols-4"
        >
          <p className="text-xs text-charcoal/50 lg:col-span-4">
            전화로 AS 접수가 오면 여기에 바로 적어두세요.
          </p>
          <input
            name="title"
            placeholder="제목 (예: 싱크대 누수)"
            required
            className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-gold"
          />
          <select
            name="customer_id"
            className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-gold"
          >
            <option value="">등록된 고객 중 선택</option>
            {customers?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            name="caller_name"
            placeholder="전화 건 분 이름 (등록 고객 아닐 때)"
            className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-gold"
          />
          <FormattedPhoneInput
            name="phone"
            placeholder="연락처"
            className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-gold"
          />
          <input
            name="address"
            placeholder="현장 주소 (선택)"
            className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-gold"
          />
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-charcoal/50">접수일</label>
            <input
              name="request_date"
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
              className="border-b border-nude bg-transparent py-1 text-sm outline-none focus:border-gold"
            />
          </div>
          <textarea
            name="description"
            placeholder={"내용 - 어떤 문제인지 / 언제부터인지 / 발생 위치 / 요청 사항 / 기타"}
            rows={2}
            className="resize-none border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-gold lg:col-span-3"
          />
          <button
            type="submit"
            className="self-start rounded-full bg-charcoal px-6 py-2 text-sm tracking-wide text-cream hover:bg-gold lg:col-span-4"
          >
            AS 요청 등록
          </button>
        </form>
      )}

      <div className="mt-6 overflow-x-auto rounded-sm border border-nude/60 bg-white">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="border-b border-nude/60 text-xs tracking-wide text-charcoal/60">
            <tr>
              <th className="px-4 py-3">제목</th>
              <th className="px-4 py-3">고객</th>
              <th className="px-4 py-3">연락처</th>
              <th className="px-4 py-3">날짜</th>
              <th className="px-4 py-3">상태</th>
              {canManage && <th className="px-4 py-3" />}
            </tr>
          </thead>
          <tbody>
            {requests?.map((r) => (
              <tr key={r.id} className="border-b border-nude/30 last:border-0 align-top">
                <td className="px-4 py-3">
                  <p>{r.title}</p>
                  {r.description && (
                    <p className="mt-1 max-w-xs whitespace-pre-wrap text-xs text-charcoal/50">
                      {r.description}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 text-charcoal/70">{r.customers?.name ?? r.caller_name ?? "-"}</td>
                <td className="px-4 py-3 text-charcoal/70">{r.phone ?? "-"}</td>
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
                <td colSpan={6} className="px-4 py-6 text-center text-charcoal/50">
                  등록된 AS 요청이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
