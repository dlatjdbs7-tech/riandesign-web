"use client";

import { useRouter } from "next/navigation";
import {
  deleteWorkOrderTask,
  moveWorkOrderTask,
  updateWorkOrderTaskStatus,
} from "@/app/admin/field-management/schedule/actions";
import type { WorkOrderStatus } from "@/lib/types";

const STATUS_LABEL: Record<WorkOrderStatus, string> = {
  pending: "대기",
  in_progress: "진행중",
  completed: "완료",
};

export default function WorkOrderTaskRow({
  id,
  workOrderId,
  title,
  startDate,
  endDate,
  status,
  isFirst,
  isLast,
}: {
  id: string;
  workOrderId: string;
  title: string;
  startDate: string | null;
  endDate: string | null;
  status: WorkOrderStatus;
  isFirst: boolean;
  isLast: boolean;
}) {
  const router = useRouter();

  return (
    <tr className="border-b border-nude/30 last:border-0">
      <td className="py-2 pr-3">
        <div className="flex flex-col gap-0.5">
          <button
            type="button"
            disabled={isFirst}
            onClick={async () => {
              await moveWorkOrderTask(id, workOrderId, "up");
              router.refresh();
            }}
            className="text-[10px] text-charcoal/40 hover:text-orange-600 disabled:opacity-20"
          >
            ▲
          </button>
          <button
            type="button"
            disabled={isLast}
            onClick={async () => {
              await moveWorkOrderTask(id, workOrderId, "down");
              router.refresh();
            }}
            className="text-[10px] text-charcoal/40 hover:text-orange-600 disabled:opacity-20"
          >
            ▼
          </button>
        </div>
      </td>
      <td className="py-2 pr-3 text-sm text-charcoal">{title}</td>
      <td className="py-2 pr-3 text-xs text-charcoal/60">{startDate ?? "-"}</td>
      <td className="py-2 pr-3 text-xs text-charcoal/60">{endDate ?? "-"}</td>
      <td className="py-2 pr-3">
        <select
          defaultValue={status}
          onChange={async (event) => {
            await updateWorkOrderTaskStatus(id, event.target.value as WorkOrderStatus);
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
      </td>
      <td className="py-2 text-right">
        <button
          type="button"
          onClick={async () => {
            await deleteWorkOrderTask(id);
            router.refresh();
          }}
          className="text-xs text-charcoal/40 hover:text-red-600"
        >
          삭제
        </button>
      </td>
    </tr>
  );
}
