"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import type { WorkDirectiveStatus } from "@/lib/types";

export async function createDirective(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase.from("work_directives").insert({
    title,
    content: String(formData.get("content") ?? "").trim() || null,
    assignee_id: String(formData.get("assignee_id") ?? "") || null,
    due_date: String(formData.get("due_date") ?? "") || null,
    created_by: user?.id,
  });

  revalidatePath("/admin/work-directives");
}

export async function updateDirectiveStatus(id: string, status: WorkDirectiveStatus) {
  const supabase = await createClient();
  await supabase.from("work_directives").update({ status }).eq("id", id);
  revalidatePath("/admin/work-directives");
  revalidatePath("/admin/notification-center");
}

export async function deleteDirective(id: string) {
  const supabase = await createClient();
  await supabase.from("work_directives").delete().eq("id", id);
  revalidatePath("/admin/work-directives");
}
