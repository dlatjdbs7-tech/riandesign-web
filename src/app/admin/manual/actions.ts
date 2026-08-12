"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export async function createManual(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  if (!title || !content) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase.from("manuals").insert({ title, content, created_by: user?.id });

  revalidatePath("/admin/manual");
  redirect("/admin/manual");
}

export async function updateManual(id: string, formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  if (!title || !content) return;

  const supabase = await createClient();
  await supabase
    .from("manuals")
    .update({ title, content, updated_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/admin/manual");
}

export async function deleteManual(id: string) {
  const supabase = await createClient();
  await supabase.from("manuals").delete().eq("id", id);
  revalidatePath("/admin/manual");
}
