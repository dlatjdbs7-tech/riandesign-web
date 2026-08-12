"use client";

import { useRouter } from "next/navigation";
import { updateInquiryField } from "@/app/admin/sites/actions";
import { formatPhoneNumber, formatWithCommas } from "@/lib/format";

const FORMATTERS = { phone: formatPhoneNumber, number: formatWithCommas };

export default function InlineInquiryFieldInput({
  inquiryId,
  field,
  value,
  placeholder,
  format,
  className,
}: {
  inquiryId: string;
  field: "name" | "address" | "size_py" | "floor_plan_type" | "phone" | "budget" | "message";
  value: string;
  placeholder?: string;
  format?: "phone" | "number";
  className?: string;
}) {
  const router = useRouter();
  const formatValue = format ? FORMATTERS[format] : null;

  return (
    <input
      key={value}
      type="text"
      inputMode={formatValue ? "numeric" : undefined}
      defaultValue={formatValue ? formatValue(value) : value}
      placeholder={placeholder}
      onClick={(event) => event.stopPropagation()}
      onInput={
        formatValue
          ? (event) => {
              const input = event.currentTarget;
              const digitsBeforeCursor = input.value
                .slice(0, input.selectionStart ?? input.value.length)
                .replace(/[^\d]/g, "").length;
              input.value = formatValue(input.value);
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
        const raw = event.target.value.trim();
        const comparisonValue = formatValue ? formatValue(value) : value;
        if (raw === comparisonValue) return;
        await updateInquiryField(inquiryId, field, raw);
        router.refresh();
      }}
      className={
        className ??
        "border-b border-transparent bg-transparent outline-none hover:border-nude focus:border-orange-400"
      }
    />
  );
}
