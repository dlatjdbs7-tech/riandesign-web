"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

export async function createPortfolioItem(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

  const supabase = await createClient();
  await supabase.from("portfolio_items").insert({
    title,
    category: String(formData.get("category") ?? "").trim() || null,
    size_py: String(formData.get("size_py") ?? "").trim() || null,
    image_url: String(formData.get("image_url") ?? "").trim() || null,
    display_order: Number(formData.get("display_order")) || 0,
  });

  revalidatePath("/admin/portfolio");
  revalidatePath("/");
}

export async function deletePortfolioItem(id: string) {
  const supabase = await createClient();
  await supabase.from("portfolio_items").delete().eq("id", id);
  revalidatePath("/admin/portfolio");
  revalidatePath("/");
}
