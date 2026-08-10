"use client";

import { useRouter } from "next/navigation";
import { updateWorkOrderField } from "@/app/admin/work-orders/actions";

type EditableField = "title" | "contract_amount" | "paid_amount" | "work_date" | "work_end_date" | "material_order_date";

export default function InlineFieldInput({
  workOrderId,
  field,
  value,
  type = "text",
  placeholder,
  className,
}: {
  workOrderId: string;
  field: EditableField;
  value: string;
  type?: "text" | "number" | "date";
  placeholder?: string;
  className?: string;
}) {
  const router = useRouter();

  return (
    <input
      key={value}
      type={type}
      defaultValue={value}
      placeholder={placeholder}
      onBlur={async (event) => {
        if (event.target.value === value) return;
        await updateWorkOrderField(workOrderId, field, event.target.value);
        router.refresh();
      }}
      className={
        className ??
        "w-full border-b border-transparent bg-transparent text-right outline-none hover:border-nude focus:border-orange-400"
      }
    />
  );
}
