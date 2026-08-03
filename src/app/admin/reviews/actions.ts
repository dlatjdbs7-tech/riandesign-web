"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

export async function createReview(formData: FormData) {
  const authorName = String(formData.get("author_name") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  if (!authorName || !content) return;

  const rating = Math.min(5, Math.max(1, Number(formData.get("rating")) || 5));

  const supabase = await createClient();
  await supabase.from("reviews").insert({
    author_name: authorName,
    project_label: String(formData.get("project_label") ?? "").trim() || null,
    rating,
    content,
    display_order: Number(formData.get("display_order")) || 0,
  });

  revalidatePath("/admin/reviews");
  revalidatePath("/");
  revalidatePath("/review");
}

export async function deleteReview(id: string) {
  const supabase = await createClient();
  await supabase.from("reviews").delete().eq("id", id);
  revalidatePath("/admin/reviews");
  revalidatePath("/");
  revalidatePath("/review");
}
