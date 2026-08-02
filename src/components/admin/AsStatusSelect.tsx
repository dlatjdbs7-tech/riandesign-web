"use client";

import { useRouter } from "next/navigation";
import { updateAsStatus } from "@/app/admin/as-requests/actions";
import type { AsStatus } from "@/lib/types";

const STATUS_LABEL: Record<AsStatus, string> = {
  received: "접수",
  in_progress: "처리중",
  completed: "완료",
};

export default function AsStatusSelect({ id, status }: { id: string; status: AsStatus }) {
  const router = useRouter();

  return (
    <select
      defaultValue={status}
      onChange={async (event) => {
        await updateAsStatus(id, event.target.value as AsStatus);
        router.refresh();
      }}
      className="border-b border-nude bg-transparent py-1 text-xs outline-none"
    >
      {Object.entries(STATUS_LABEL).map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  );
}
