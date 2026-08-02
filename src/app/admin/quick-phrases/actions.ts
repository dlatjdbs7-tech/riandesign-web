"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

export async function createQuickPhrase(formData: FormData) {
  const content = String(formData.get("content") ?? "").trim();
  if (!content) return;

  const supabase = await createClient();
  await supabase.from("quick_phrases").insert({
    content,
    category: String(formData.get("category") ?? "").trim() || null,
  });

  revalidatePath("/admin/quick-phrases");
}

export async function deleteQuickPhrase(id: string) {
  const supabase = await createClient();
  await supabase.from("quick_phrases").delete().eq("id", id);
  revalidatePath("/admin/quick-phrases");
}
