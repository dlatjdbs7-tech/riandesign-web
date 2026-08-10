"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import type { PurchaseOrderStatus } from "@/lib/types";

export async function createQuickLink(formData: FormData) {
  const url = String(formData.get("url") ?? "").trim();
  const status = String(formData.get("status") ?? "pending") as PurchaseOrderStatus;
  if (!url) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase.from("quick_links").insert({
    title: url,
    url,
    status,
    created_by: user?.id,
  });

  revalidatePath("/admin/field-management/quick-links");
}

export async function updateQuickLinkStatus(id: string, status: PurchaseOrderStatus) {
  const supabase = await createClient();
  await supabase.from("quick_links").update({ status }).eq("id", id);
  revalidatePath("/admin/field-management/quick-links");
}

export async function deleteQuickLink(id: string) {
  const supabase = await createClient();
  await supabase.from("quick_links").delete().eq("id", id);
  revalidatePath("/admin/field-management/quick-links");
}
