import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import type { Customer, Profile, Transaction } from "@/lib/types";
import { createTransaction, deleteTransaction } from "./actions";
import TransactionStatusSelect from "@/components/admin/TransactionStatusSelect";

type TransactionRow = Transaction & { customers: Pick<Customer, "name"> | null };

export default async function TransactionsPage() {
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

  const { data: transactions } = await supabase
    .from("transactions")
    .select("*, customers(name)")
    .order("transaction_date", { ascending: false })
    .returns<TransactionRow[]>();

  const { data: customers } = canManage
    ? await supabase.from("customers").select("id, name").order("name").returns<Pick<Customer, "id" | "name">[]>()
    : { data: null };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-semibold text-charcoal">거래명세서</h1>
        <Link href="/admin/field-management" className="text-xs text-taupe hover:text-orange-600">
          ← 시공관리
        </Link>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="overflow-x-auto rounded-sm border border-nude/60 bg-white">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-nude/60 text-xs tracking-wide text-charcoal/60">
              <tr>
                <th className="px-4 py-3">제목</th>
                <th className="px-4 py-3">고객</th>
                <th className="px-4 py-3">날짜</th>
                <th className="px-4 py-3">금액</th>
                <th className="px-4 py-3">상태</th>
                <th className="px-4 py-3">첨부파일</th>
                {canManage && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody>
              {transactions?.map((t) => (
                <tr key={t.id} className="border-b border-nude/30 last:border-0">
                  <td className="px-4 py-3">
                    <p className="text-charcoal">{t.title}</p>
                    {t.memo && <p className="mt-1 text-xs text-charcoal/50">{t.memo}</p>}
                  </td>
                  <td className="px-4 py-3 text-charcoal/70">{t.customers?.name ?? "-"}</td>
                  <td className="px-4 py-3 text-charcoal/70">{t.transaction_date}</td>
                  <td className="px-4 py-3 text-charcoal/70">{t.amount.toLocaleString()}원</td>
                  <td className="px-4 py-3">
                    {canManage ? <TransactionStatusSelect id={t.id} status={t.status} /> : t.status}
                  </td>
                  <td className="px-4 py-3">
                    {t.attachment_url ? (
                      <a
                        href={t.attachment_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-orange-600 hover:underline"
                      >
                        {t.attachment_name ?? "파일 보기"}
                      </a>
                    ) : (
                      <span className="text-xs text-charcoal/30">-</span>
                    )}
                  </td>
                  {canManage && (
                    <td className="px-4 py-3">
                      <form action={deleteTransaction.bind(null, t.id)}>
                        <button type="submit" className="text-xs text-red-700 underline hover:no-underline">
                          삭제
                        </button>
                      </form>
                    </td>
                  )}
                </tr>
              ))}
              {(!transactions || transactions.length === 0) && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-charcoal/50">
                    등록된 거래명세서가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {canManage && (
          <form
            action={createTransaction}
            className="flex h-fit flex-col gap-4 rounded-sm border border-nude/60 bg-white p-6"
          >
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-charcoal/50">제목</label>
              <input
                name="title"
                placeholder="제목"
                required
                className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-orange-400"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-charcoal/50">고객</label>
              <select
                name="customer_id"
                className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-orange-400"
              >
                <option value="">고객 선택 안 함</option>
                {customers?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-charcoal/50">날짜</label>
              <input
                name="transaction_date"
                type="date"
                defaultValue={new Date().toISOString().slice(0, 10)}
                className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-orange-400"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-charcoal/50">금액</label>
              <input
                name="amount"
                type="number"
                placeholder="금액"
                className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-orange-400"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-charcoal/50">내용</label>
              <textarea
                name="memo"
                placeholder="거래 내용을 적어주세요"
                rows={3}
                className="resize-none border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-orange-400"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-charcoal/50">첨부파일</label>
              <input
                name="attachment"
                type="file"
                className="text-xs text-charcoal/70 file:mr-3 file:rounded-full file:border file:border-nude file:bg-white file:px-3 file:py-1 file:text-xs file:text-charcoal hover:file:border-orange-400"
              />
            </div>
            <button
              type="submit"
              className="self-start rounded-full bg-orange-300 px-6 py-2 text-sm font-medium tracking-wide text-orange-900 hover:bg-orange-400"
            >
              거래명세서 등록
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
