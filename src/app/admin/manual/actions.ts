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

  const { data: created } = await supabase
    .from("manuals")
    .insert({ title, content, created_by: user?.id })
    .select("id")
    .single();

  revalidatePath("/admin/manual");
  if (created) redirect(`/admin/manual?id=${created.id}`);
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
