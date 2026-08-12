"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

export async function createVendor(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const supabase = await createClient();
  await supabase.from("vendors").insert({
    name,
    contact: String(formData.get("contact") ?? "").trim() || null,
    category: String(formData.get("category") ?? "").trim() || null,
    tier: String(formData.get("tier") ?? "").trim() || null,
    memo: String(formData.get("memo") ?? "").trim() || null,
  });

  revalidatePath("/admin/vendors");
  revalidatePath("/admin/field-management/vendors");
}

export async function updateVendor(id: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const supabase = await createClient();
  await supabase
    .from("vendors")
    .update({
      name,
      contact: String(formData.get("contact") ?? "").trim() || null,
    })
    .eq("id", id);

  revalidatePath("/admin/vendors");
  revalidatePath("/admin/field-management/vendors");
}

export async function deleteVendor(id: string) {
  const supabase = await createClient();
  await supabase.from("vendors").delete().eq("id", id);
  revalidatePath("/admin/vendors");
  revalidatePath("/admin/field-management/vendors");
}
