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
  revalidatePath("/admin/calendar");
}

// 담당자 없는 팀 할일을 캘린더 위젯에서 체크하면 내 담당으로 가져오고 진행중으로 전환한다.
export async function claimTeamTodo(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("todos").update({ assignee_id: user.id, status: "in_progress" }).eq("id", id);
  revalidatePath("/admin/todos");
  revalidatePath("/admin/calendar");
}

export async function createQuickTodo(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("todos").insert({ title, assignee_id: user.id, created_by: user.id });
  revalidatePath("/admin/todos");
  revalidatePath("/admin/calendar");
}

export async function deleteTodo(id: string) {
  const supabase = await createClient();
  await supabase.from("todos").delete().eq("id", id);
  revalidatePath("/admin/todos");
}
