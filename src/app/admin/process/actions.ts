"use server";

import { moveToTrash } from "@/lib/trash";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

export async function createProcessStep(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

  const supabase = await createClient();
  await supabase.from("process_steps").insert({
    step_number: Number(formData.get("step_number")) || 0,
    title,
    description: String(formData.get("description") ?? "").trim() || null,
    display_order: Number(formData.get("display_order")) || 0,
  });

  revalidatePath("/admin/process");
  revalidatePath("/");
  revalidatePath("/process");
}

export async function deleteProcessStep(id: string) {
  const supabase = await createClient();
  const trashed = await moveToTrash(supabase, "process_steps", id);
  revalidatePath("/admin/process");
  revalidatePath("/");
  revalidatePath("/process");
  return trashed;
}
