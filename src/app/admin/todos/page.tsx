import { createClient } from "@/utils/supabase/server";
import type { Profile, Todo } from "@/lib/types";
import { createTodo, deleteTodo } from "./actions";
import TodoStatusSelect from "@/components/admin/TodoStatusSelect";

type TodoRow = Todo & { profiles: Pick<Profile, "full_name"> | null };

export default async function TodosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: todos } = await supabase
    .from("todos")
    .select("*, profiles!todos_assignee_id_fkey(full_name)")
    .order("status", { ascending: true })
    .order("due_date", { ascending: true, nullsFirst: false })
    .returns<TodoRow[]>();

  const { data: employees } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("status", "approved")
    .order("full_name")
    .returns<Pick<Profile, "id" | "full_name">[]>();

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-charcoal">할일</h1>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="overflow-x-auto rounded-sm border border-nude/60 bg-white">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-nude/60 text-xs tracking-wide text-charcoal/60">
              <tr>
                <th className="px-4 py-3">할일</th>
                <th className="px-4 py-3">담당자</th>
                <th className="px-4 py-3">마감일</th>
                <th className="px-4 py-3">상태</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {todos?.map((todo) => {
                const canManageRow = todo.created_by === user?.id || todo.assignee_id === user?.id;
                return (
                  <tr key={todo.id} className="border-b border-nude/30 last:border-0">
                    <td className={`px-4 py-3 ${todo.status === "done" ? "text-charcoal/40 line-through" : ""}`}>
                      {todo.title}
                    </td>
                    <td className="px-4 py-3 text-charcoal/70">{todo.profiles?.full_name ?? "-"}</td>
                    <td className="px-4 py-3 text-charcoal/70">{todo.due_date ?? "-"}</td>
                    <td className="px-4 py-3">
                      <TodoStatusSelect id={todo.id} status={todo.status} />
                    </td>
                    <td className="px-4 py-3">
                      {canManageRow && (
                        <form action={deleteTodo.bind(null, todo.id)}>
                          <button type="submit" className="text-xs text-red-700 underline hover:no-underline">
                            삭제
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
              {(!todos || todos.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-charcoal/50">
                    등록된 할일이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <form action={createTodo} className="flex h-fit flex-col gap-4 rounded-sm border border-nude/60 bg-white p-6">
          <input
            name="title"
            placeholder="할일 내용"
            required
            className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-gold"
          />
          <select
            name="assignee_id"
            className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-gold"
          >
            <option value="">담당자 없음</option>
            {employees?.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.full_name}
              </option>
            ))}
          </select>
          <input
            name="due_date"
            type="date"
            className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-gold"
          />
          <button
            type="submit"
            className="self-start rounded-full bg-charcoal px-6 py-2 text-sm tracking-wide text-cream hover:bg-gold"
          >
            할일 등록
          </button>
        </form>
      </div>
    </div>
  );
}
