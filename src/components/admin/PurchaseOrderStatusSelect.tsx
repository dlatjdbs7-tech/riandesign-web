"use client";

import { useRouter } from "next/navigation";
import { updatePurchaseOrderStatus } from "@/app/admin/field-management/purchase-orders/actions";
import type { PurchaseOrderStatus } from "@/lib/types";

const STATUS_LABEL: Record<PurchaseOrderStatus, string> = {
  ordered: "URL발주",
  pending: "URL발주대기",
  reference: "URL참조",
};

export default function PurchaseOrderStatusSelect({
  id,
  status,
}: {
  id: string;
  status: PurchaseOrderStatus;
}) {
  const router = useRouter();

  return (
    <select
      key={status}
      defaultValue={status}
      onChange={async (event) => {
        await updatePurchaseOrderStatus(id, event.target.value as PurchaseOrderStatus);
        router.refresh();
      }}
      className="border-b border-nude bg-transparent py-0.5 text-[10px] text-charcoal/60 outline-none focus:border-orange-400"
    >
      {Object.entries(STATUS_LABEL).map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  );
}
