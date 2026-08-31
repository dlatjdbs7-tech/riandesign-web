"use client";

import { useRouter } from "next/navigation";
import { claimTeamTodo } from "@/app/admin/todos/actions";

export default function ClaimTodoCheckbox({ id }: { id: string }) {
  const router = useRouter();

  return (
    <input
      type="checkbox"
      onClick={(event) => event.stopPropagation()}
      onChange={async () => {
        await claimTeamTodo(id);
        router.refresh();
      }}
      className="h-4 w-4 rounded border-nude text-orange-500 focus:ring-orange-400"
    />
  );
}
