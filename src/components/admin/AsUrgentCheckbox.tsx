"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateAsUrgent } from "@/app/admin/as-requests/actions";

// AS 목록의 "긴급" 칸 체크박스. 누르는 즉시 저장되고 목록 순서가 다시 정렬된다.
export default function AsUrgentCheckbox({ id, isUrgent }: { id: string; isUrgent: boolean }) {
  const router = useRouter();
  const [checked, setChecked] = useState(isUrgent);
  const [isPending, startTransition] = useTransition();

  return (
    <label
      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors ${
        checked
          ? "border-red-600 bg-red-600 text-white"
          : "border-nude text-charcoal/50 hover:border-red-300 hover:text-red-600"
      } ${isPending ? "opacity-60" : ""}`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={isPending}
        onChange={(event) => {
          const next = event.target.checked;
          setChecked(next);
          startTransition(async () => {
            await updateAsUrgent(id, next);
            router.refresh();
          });
        }}
        className="h-3.5 w-3.5 accent-red-600"
      />
      긴급
    </label>
  );
}
