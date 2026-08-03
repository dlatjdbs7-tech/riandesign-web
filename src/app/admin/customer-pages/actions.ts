"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

export async function addProjectPhoto(workOrderId: string, formData: FormData) {
  const imageUrl = String(formData.get("image_url") ?? "").trim();
  if (!imageUrl) return;

  const supabase = await createClient();
  await supabase.from("work_order_photos").insert({
    work_order_id: workOrderId,
    image_url: imageUrl,
    caption: String(formData.get("caption") ?? "").trim() || null,
  });

  revalidatePath("/admin/customer-pages");
}

export async function deleteProjectPhoto(id: string) {
  const supabase = await createClient();
  await supabase.from("work_order_photos").delete().eq("id", id);
  revalidatePath("/admin/customer-pages");
}
