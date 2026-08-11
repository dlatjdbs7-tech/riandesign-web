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
    <label className="flex cursor-pointer items-center justify-end gap-1 text-[11px] text-charcoal/50">
      <span>{checked ? "부가세 포함" : "부가세 별도"}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={async (event) => {
          await updateWorkOrderField(workOrderId, field, event.target.checked ? "true" : "false");
          router.refresh();
        }}
        className="h-3.5 w-3.5 accent-red-500"
      />
    </label>
  );
}
