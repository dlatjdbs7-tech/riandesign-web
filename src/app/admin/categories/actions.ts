"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

function revalidateCategoryPages() {
  revalidatePath("/admin/categories");
  revalidatePath("/admin/employees");
  revalidatePath("/admin/vendors");
  revalidatePath("/admin/customers");
}

export async function createCategory(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const supabase = await createClient();
  await supabase.from("categories").insert({
    name,
    type: String(formData.get("type") ?? "").trim() || null,
  });

  revalidateCategoryPages();
}

export async function deleteCategory(id: string) {
  const supabase = await createClient();
  await supabase.from("categories").delete().eq("id", id);
  revalidateCategoryPages();
}
