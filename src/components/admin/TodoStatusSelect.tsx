"use client";

import { useRouter } from "next/navigation";
import { updateTodoStatus } from "@/app/admin/todos/actions";
import type { TodoStatus } from "@/lib/types";

const STATUS_LABEL: Record<TodoStatus, string> = {
  pending: "대기",
  in_progress: "진행중",
  done: "완료",
};

export default function TodoStatusSelect({ id, status }: { id: string; status: TodoStatus }) {
  const router = useRouter();

  return (
    <select
      defaultValue={status}
      onChange={async (event) => {
        await updateTodoStatus(id, event.target.value as TodoStatus);
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
