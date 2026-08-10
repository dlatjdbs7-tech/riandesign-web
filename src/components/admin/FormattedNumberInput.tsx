"use client";

function formatWithCommas(raw: string) {
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("en-US");
}

export default function FormattedNumberInput({
  name,
  placeholder,
  defaultValue,
  className,
}: {
  name: string;
  placeholder?: string;
  defaultValue?: string;
  className?: string;
}) {
  return (
    <input
      name={name}
      type="text"
      inputMode="numeric"
      placeholder={placeholder}
      defaultValue={defaultValue ? formatWithCommas(defaultValue) : undefined}
      onInput={(event) => {
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
      }}
      className={
        className ??
        "border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-orange-400"
      }
    />
  );
}
