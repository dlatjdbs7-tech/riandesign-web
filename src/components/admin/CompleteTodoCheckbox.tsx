"use client";

import { useRouter } from "next/navigation";
import { updateTodoStatus } from "@/app/admin/todos/actions";
import type { TodoStatus } from "@/lib/types";

export default function CompleteTodoCheckbox({ id, status }: { id: string; status: TodoStatus }) {
  const router = useRouter();

  return (
    <input
      type="checkbox"
      defaultChecked={status === "done"}
      onClick={(event) => event.stopPropagation()}
      onChange={async (event) => {
        await updateTodoStatus(id, event.target.checked ? "done" : "pending");
        router.refresh();
      }}
      className="h-4 w-4 rounded border-nude text-orange-500 focus:ring-orange-400"
    />
  );
}
