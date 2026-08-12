"use client";

import { formatPhoneNumber } from "@/lib/format";

export default function FormattedPhoneInput({
  name,
  required,
  placeholder,
  defaultValue,
  className,
}: {
  name: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
  className?: string;
}) {
  return (
    <input
      name={name}
      type="text"
      inputMode="numeric"
      required={required}
      placeholder={placeholder}
      defaultValue={defaultValue ? formatPhoneNumber(defaultValue) : undefined}
      onInput={(event) => {
        const input = event.currentTarget;
        const digitsBeforeCursor = input.value
          .slice(0, input.selectionStart ?? input.value.length)
          .replace(/[^\d]/g, "").length;
        input.value = formatPhoneNumber(input.value);
        let cursor = 0;
        let seenDigits = 0;
        while (cursor < input.value.length && seenDigits < digitsBeforeCursor) {
          if (/\d/.test(input.value[cursor])) seenDigits++;
          cursor++;
        }
        input.setSelectionRange(cursor, cursor);
      }}
      className={
        className ??
        "border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-orange-400"
      }
    />
  );
}
