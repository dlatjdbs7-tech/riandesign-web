"use client";

function formatPhoneNumber(raw: string) {
  const digits = raw.replace(/[^\d]/g, "").slice(0, 11);
  if (!digits) return "";
  if (digits.startsWith("02")) {
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    if (digits.length <= 9) return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6, 10)}`;
  }
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  if (digits.length <= 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
}

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
