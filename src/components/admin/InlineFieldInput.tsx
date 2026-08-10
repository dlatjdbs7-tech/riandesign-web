"use client";

import { useRouter } from "next/navigation";
import { updateWorkOrderField } from "@/app/admin/work-orders/actions";

type EditableField =
  | "title"
  | "contract_amount"
  | "payment_contract"
  | "payment_start"
  | "payment_interim1"
  | "payment_interim2"
  | "payment_balance"
  | "work_date"
  | "work_end_date"
  | "material_order_date";

function formatWithCommas(raw: string) {
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("en-US");
}

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
  const isNumeric = type === "number";

  return (
    <input
      key={value}
      type={isNumeric ? "text" : type}
      inputMode={isNumeric ? "numeric" : undefined}
      defaultValue={isNumeric ? formatWithCommas(value) : value}
      placeholder={placeholder}
      onInput={
        isNumeric
          ? (event) => {
              const input = event.currentTarget;
              const digitsBeforeCursor = input.value
                .slice(0, input.selectionStart ?? input.value.length)
                .replace(/[^\d]/g, "").length;
              input.value = formatWithCommas(input.value);
              let cursor = 0;
              let seenDigits = 0;
              while (cursor < input.value.length && seenDigits < digitsBeforeCursor) {
                if (/\d/.test(input.value[cursor])) seenDigits++;
                cursor++;
              }
              input.setSelectionRange(cursor, cursor);
            }
          : undefined
      }
      onBlur={async (event) => {
        const raw = isNumeric ? event.target.value.replace(/,/g, "") : event.target.value;
        if (raw === value) return;
        await updateWorkOrderField(workOrderId, field, raw);
        router.refresh();
      }}
      className={
        className ??
        "w-full border-b border-transparent bg-transparent text-right outline-none hover:border-nude focus:border-orange-400"
      }
    />
  );
}
