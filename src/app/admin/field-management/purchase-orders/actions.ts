"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

export async function createPurchaseOrder(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase.from("purchase_orders").insert({
    title,
    vendor_name: String(formData.get("vendor_name") ?? "").trim() || null,
    site_address: String(formData.get("site_address") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
    order_date: String(formData.get("order_date") ?? "") || null,
    created_by: user?.id,
  });

  revalidatePath("/admin/field-management/purchase-orders");
}

export async function deletePurchaseOrder(id: string) {
  const supabase = await createClient();
  await supabase.from("purchase_orders").delete().eq("id", id);
  revalidatePath("/admin/field-management/purchase-orders");
}
