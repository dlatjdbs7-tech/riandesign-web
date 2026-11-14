"use client";

import { useState } from "react";
import { updateItemField } from "@/app/admin/estimates/actions";

// 품목 관리 표의 칸: 고치고 칸을 벗어나면 바로 저장
export default function ItemCell({
  id,
  field,
  value,
  numeric,
  className = "",
}: {
  id: string;
  field: string;
  value: string | number | null;
  numeric?: boolean;
  className?: string;
}) {
  const initial = value === null ? "" : numeric ? Number(value).toLocaleString("ko-KR") : String(value);
  const [text, setText] = useState(initial);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");

  return (
    <input
      value={text}
      inputMode={numeric ? "numeric" : undefined}
      onChange={(e) => setText(numeric ? e.target.value.replace(/[^\d,]/g, "") : e.target.value)}
      onBlur={async () => {
        if (text === initial) return;
        setState("saving");
        await updateItemField(id, field, text);
        if (numeric) setText((Number(text.replace(/,/g, "")) || 0).toLocaleString("ko-KR"));
        setState("saved");
        setTimeout(() => setState("idle"), 1200);
      }}
      className={`w-full rounded border bg-transparent px-1.5 py-1 outline-none focus:border-orange-400 focus:bg-white ${
        state === "saved" ? "border-emerald-400" : "border-transparent hover:border-nude"
      } ${numeric ? "text-right tabular-nums" : ""} ${className}`}
    />
  );
}
