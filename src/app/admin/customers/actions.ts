"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

export async function createCustomer(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase.from("customers").insert({
    name,
    phone: String(formData.get("phone") ?? "").trim() || null,
    email: String(formData.get("email") ?? "").trim() || null,
    address: String(formData.get("address") ?? "").trim() || null,
    memo: String(formData.get("memo") ?? "").trim() || null,
    created_by: user?.id,
  });

  revalidatePath("/admin/customers");
}

export async function deleteCustomer(id: string) {
  const supabase = await createClient();
  await supabase.from("customers").delete().eq("id", id);
  revalidatePath("/admin/customers");
}
