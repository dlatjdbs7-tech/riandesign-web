"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

export async function createQuickLink(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  if (!title || !url) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase.from("quick_links").insert({
    title,
    url,
    category: String(formData.get("category") ?? "").trim() || null,
    created_by: user?.id,
  });

  revalidatePath("/admin/field-management/quick-links");
}

export async function deleteQuickLink(id: string) {
  const supabase = await createClient();
  await supabase.from("quick_links").delete().eq("id", id);
  revalidatePath("/admin/field-management/quick-links");
}
