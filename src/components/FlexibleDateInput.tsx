"use client";

import { useRef, useState, type ChangeEvent } from "react";

export default function FlexibleDateInput({
  id,
  name,
  required,
}: {
  id: string;
  name: string;
  required?: boolean;
}) {
  const [value, setValue] = useState("");
  const hiddenDateRef = useRef<HTMLInputElement>(null);

  function openPicker() {
    hiddenDateRef.current?.showPicker?.();
  }

  function handleHiddenDateChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.value) setValue(event.target.value);
  }

  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type="text"
        required={required}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="년-월-일 (직접 입력 가능)"
        className="w-full rounded border border-nude bg-transparent px-4 py-2 pr-10 text-sm text-charcoal outline-none focus:border-gold"
      />
      <button
        type="button"
        onClick={openPicker}
        aria-label="달력에서 선택"
        className="absolute right-2 top-1/2 -translate-y-1/2 text-charcoal/50 hover:text-gold"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M8 3v4M16 3v4M3 10h18" strokeLinecap="round" />
        </svg>
      </button>
      <input
        ref={hiddenDateRef}
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        onChange={handleHiddenDateChange}
        className="absolute h-0 w-0 opacity-0"
      />
    </div>
  );
}
