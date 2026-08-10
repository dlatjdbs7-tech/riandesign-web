"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import {
  deleteWorkOrderTask,
  moveWorkOrderTask,
  setWorkOrderTaskAutoStatus,
  setWorkOrderTaskManualStatus,
  updateWorkOrderTaskDetails,
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
  autoStatus,
  isFirst,
  isLast,
}: {
  id: string;
  workOrderId: string;
  title: string;
  startDate: string | null;
  endDate: string | null;
  status: WorkOrderStatus;
  autoStatus: boolean;
  isFirst: boolean;
  isLast: boolean;
}) {
  const router = useRouter();
  const isInProgress = status === "in_progress";

  const titleRef = useRef<HTMLInputElement>(null);
  const startRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLInputElement>(null);

  async function saveDetails() {
    const newTitle = titleRef.current?.value.trim() ?? "";
    const newStart = startRef.current?.value ?? "";
    const newEnd = endRef.current?.value ?? "";
    if (!newTitle) return;
    if (newTitle === title && newStart === (startDate ?? "") && newEnd === (endDate ?? "")) return;

    const formData = new FormData();
    formData.set("title", newTitle);
    formData.set("start_date", newStart);
    formData.set("end_date", newEnd);
    await updateWorkOrderTaskDetails(id, formData);
    router.refresh();
  }

  return (
    <tr
      className={`border-b border-nude/30 last:border-0 ${
        isInProgress ? "bg-orange-50" : ""
      }`}
    >
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
      <td
        className={`border-l-4 py-2 pr-3 pl-2 ${
          isInProgress ? "border-orange-400" : "border-transparent"
        }`}
      >
        <input
          key={title}
          ref={titleRef}
          defaultValue={title}
          onBlur={saveDetails}
          className={`w-32 border-b border-transparent bg-transparent text-sm outline-none hover:border-nude focus:border-orange-400 ${
            isInProgress ? "font-semibold text-orange-700" : "text-charcoal"
          }`}
        />
      </td>
      <td className="py-2 pr-3 text-xs text-charcoal/60">
        <input
          key={startDate}
          ref={startRef}
          type="date"
          defaultValue={startDate ?? ""}
          onBlur={saveDetails}
          className="border-b border-transparent bg-transparent text-xs outline-none hover:border-nude focus:border-orange-400"
        />
      </td>
      <td className="py-2 pr-3 text-xs text-charcoal/60">
        <input
          key={endDate}
          ref={endRef}
          type="date"
          defaultValue={endDate ?? ""}
          onBlur={saveDetails}
          className="border-b border-transparent bg-transparent text-xs outline-none hover:border-nude focus:border-orange-400"
        />
      </td>
      <td className="py-2 pr-3">
        <div className="flex items-center gap-2">
          <select
            key={`${status}-${autoStatus}`}
            defaultValue={status}
            onChange={async (event) => {
              await setWorkOrderTaskManualStatus(id, event.target.value as WorkOrderStatus);
              router.refresh();
            }}
            className={`border-b bg-transparent py-1 text-xs outline-none ${
              isInProgress ? "border-orange-400 font-medium text-orange-700" : "border-nude"
            }`}
          >
            {Object.entries(STATUS_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {autoStatus ? (
            <span className="text-[10px] text-charcoal/40">자동</span>
          ) : (
            <button
              type="button"
              onClick={async () => {
                await setWorkOrderTaskAutoStatus(id);
                router.refresh();
              }}
              className="text-[10px] text-taupe hover:text-orange-600"
            >
              자동으로
            </button>
          )}
        </div>
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
