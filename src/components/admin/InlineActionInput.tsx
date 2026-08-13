"use client";

import { useRouter } from "next/navigation";

export default function InlineActionInput({
  id,
  value,
  placeholder,
  action,
  multiline,
  rows,
  className,
}: {
  id: string;
  value: string;
  placeholder?: string;
  action: (id: string, value: string) => Promise<void>;
  multiline?: boolean;
  rows?: number;
  className?: string;
}) {
  const router = useRouter();
  const defaultClassName =
    "border-b border-transparent bg-transparent outline-none hover:border-nude focus:border-orange-400";

  const handleBlur = async (event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const raw = event.target.value.trim();
    if (raw === value) return;
    await action(id, raw);
    router.refresh();
  };

  if (multiline) {
    return (
      <textarea
        key={value}
        defaultValue={value}
        placeholder={placeholder}
        rows={rows ?? 3}
        onClick={(event) => event.stopPropagation()}
        onBlur={handleBlur}
        className={`resize-none ${className ?? defaultClassName}`}
      />
    );
  }

  return (
    <input
      key={value}
      type="text"
      defaultValue={value}
      placeholder={placeholder}
      onClick={(event) => event.stopPropagation()}
      onBlur={handleBlur}
      className={className ?? defaultClassName}
    />
  );
}
