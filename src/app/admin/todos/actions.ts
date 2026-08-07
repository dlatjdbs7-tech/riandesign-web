"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import type { TodoStatus } from "@/lib/types";

export async function createTodo(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase.from("todos").insert({
    title,
    assignee_id: String(formData.get("assignee_id") ?? "") || null,
    due_date: String(formData.get("due_date") ?? "") || null,
    created_by: user?.id,
  });

  revalidatePath("/admin/todos");
}

export async function updateTodoStatus(id: string, status: TodoStatus) {
  const supabase = await createClient();
  await supabase.from("todos").update({ status }).eq("id", id);
  revalidatePath("/admin/todos");
}

export async function deleteTodo(id: string) {
  const supabase = await createClient();
  await supabase.from("todos").delete().eq("id", id);
  revalidatePath("/admin/todos");
}
