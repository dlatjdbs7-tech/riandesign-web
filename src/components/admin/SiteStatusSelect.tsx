"use client";

import { useRouter } from "next/navigation";
import { updateWorkOrderStatus } from "@/app/admin/work-orders/actions";
import type { SiteStatus } from "@/lib/types";

const STATUS_LABEL: Record<SiteStatus, string> = {
  pending: "대기",
  in_progress: "진행중",
  completed: "완료",
  on_hold: "보류",
  cancelled: "취소",
};

export default function SiteStatusSelect({ id, status }: { id: string; status: SiteStatus }) {
  const router = useRouter();

  return (
    <select
      key={status}
      defaultValue={status}
      onChange={async (event) => {
        await updateWorkOrderStatus(id, event.target.value as SiteStatus);
        router.refresh();
      }}
      className="border-b border-nude bg-transparent py-0.5 text-xs text-charcoal/70 outline-none focus:border-orange-400"
    >
      {Object.entries(STATUS_LABEL).map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  );
}
