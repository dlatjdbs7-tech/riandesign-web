"use client";

import { useRouter } from "next/navigation";
import { updateWorkOrderField } from "@/app/admin/work-orders/actions";

type VatField =
  | "payment_contract_vat_included"
  | "payment_start_vat_included"
  | "payment_interim1_vat_included"
  | "payment_interim2_vat_included"
  | "payment_balance_vat_included";

export default function VatToggle({
  workOrderId,
  field,
  checked,
}: {
  workOrderId: string;
  field: VatField;
  checked: boolean;
}) {
  const router = useRouter();

  return (
    <label className="flex shrink-0 cursor-pointer items-center gap-1 whitespace-nowrap text-[10px] text-charcoal/50">
      <input
        type="checkbox"
        checked={checked}
        onChange={async (event) => {
          await updateWorkOrderField(workOrderId, field, event.target.checked ? "true" : "false");
          router.refresh();
        }}
        className="h-3 w-3 accent-red-500"
      />
      <span>{checked ? "포함" : "별도"}</span>
    </label>
  );
}
