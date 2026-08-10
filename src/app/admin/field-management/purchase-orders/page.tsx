import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import type { Profile, PurchaseOrder } from "@/lib/types";
import { createPurchaseOrder, deletePurchaseOrder } from "./actions";

export default async function PurchaseOrdersPage() {
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

  const { data: orders } = await supabase
    .from("purchase_orders")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<PurchaseOrder[]>();

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-semibold text-charcoal">발주서</h1>
        <Link href="/admin/field-management" className="text-xs text-taupe hover:text-orange-600">
          ← 현장관리
        </Link>
      </div>
      <p className="mt-2 text-sm text-charcoal/60">
        자재·시공 발주 내용을 간단히 메모로 남깁니다.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-3">
          {orders?.map((order) => (
            <div key={order.id} className="rounded-sm border border-nude/60 bg-white p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-serif text-base font-semibold text-charcoal">{order.title}</h2>
                  <p className="mt-1 text-xs text-charcoal/60">
                    {order.vendor_name ?? "거래처 미지정"} · {order.order_date ?? "날짜 미정"}
                  </p>
                  {order.site_address && (
                    <p className="mt-1 text-xs text-charcoal/50">현장주소 {order.site_address}</p>
                  )}
                </div>
                {canManage && (
                  <form action={deletePurchaseOrder.bind(null, order.id)}>
                    <button type="submit" className="text-xs text-charcoal/40 hover:text-red-600">
                      삭제
                    </button>
                  </form>
                )}
              </div>
              {order.notes && (
                <p className="mt-3 whitespace-pre-line rounded-sm bg-stone-100 p-3 text-sm text-charcoal/80">
                  {order.notes}
                </p>
              )}
            </div>
          ))}
          {(!orders || orders.length === 0) && (
            <p className="rounded-sm border border-dashed border-nude p-8 text-center text-sm text-charcoal/40">
              등록된 발주서가 없습니다.
            </p>
          )}
        </div>

        {canManage && (
          <form
            action={createPurchaseOrder}
            className="flex h-fit flex-col gap-4 rounded-sm border border-nude/60 bg-white p-6"
          >
            <input
              name="title"
              placeholder="제목 (예: 도안리슈빌 타일 발주)"
              required
              className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-orange-400"
            />
            <input
              name="vendor_name"
              placeholder="거래처"
              className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-orange-400"
            />
            <input
              name="site_address"
              placeholder="현장주소"
              className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-orange-400"
            />
            <input
              type="date"
              name="order_date"
              className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-orange-400"
            />
            <textarea
              name="notes"
              rows={4}
              placeholder="특이사항"
              className="resize-none border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-orange-400"
            />
            <button
              type="submit"
              className="self-start rounded-full bg-orange-300 px-6 py-2 text-sm tracking-wide text-orange-900 hover:bg-orange-400"
            >
              발주서 등록
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
