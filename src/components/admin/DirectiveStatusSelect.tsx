"use client";

import { useRouter } from "next/navigation";
import { updateDirectiveStatus } from "@/app/admin/work-directives/actions";
import type { WorkDirectiveStatus } from "@/lib/types";

const STATUS_LABEL: Record<WorkDirectiveStatus, string> = {
  pending: "대기",
  in_progress: "진행중",
  completed: "완료",
};

export default function DirectiveStatusSelect({
  id,
  status,
}: {
  id: string;
  status: WorkDirectiveStatus;
}) {
  const router = useRouter();

  return (
    <select
      defaultValue={status}
      onChange={async (event) => {
        await updateDirectiveStatus(id, event.target.value as WorkDirectiveStatus);
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
