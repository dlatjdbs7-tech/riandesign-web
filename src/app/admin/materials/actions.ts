"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

export async function createMaterial(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const supabase = await createClient();
  await supabase.from("materials").insert({
    name,
    spec: String(formData.get("spec") ?? "").trim() || null,
    unit: String(formData.get("unit") ?? "").trim() || null,
    unit_price: Number(formData.get("unit_price")) || null,
    supplier: String(formData.get("supplier") ?? "").trim() || null,
  });

  revalidatePath("/admin/materials");
}

export async function deleteMaterial(id: string) {
  const supabase = await createClient();
  await supabase.from("materials").delete().eq("id", id);
  revalidatePath("/admin/materials");
}
