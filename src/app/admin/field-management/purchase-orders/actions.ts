"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import type { PurchaseOrderStatus } from "@/lib/types";

export async function createPurchaseOrder(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const status = String(formData.get("status") ?? "pending") as PurchaseOrderStatus;
  if (!title) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase.from("purchase_orders").insert({
    title,
    status,
    created_by: user?.id,
  });

  revalidatePath("/admin/field-management/purchase-orders");
}

export async function updatePurchaseOrderStatus(id: string, status: PurchaseOrderStatus) {
  const supabase = await createClient();
  await supabase.from("purchase_orders").update({ status }).eq("id", id);
  revalidatePath("/admin/field-management/purchase-orders");
}

export async function deletePurchaseOrder(id: string) {
  const supabase = await createClient();
  await supabase.from("purchase_orders").delete().eq("id", id);
  revalidatePath("/admin/field-management/purchase-orders");
}
