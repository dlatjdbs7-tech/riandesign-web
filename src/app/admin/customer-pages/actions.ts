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

export async function createManualProject(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase.from("customer_projects").insert({
    title,
    customer_name: String(formData.get("customer_name") ?? "").trim() || null,
    work_date: String(formData.get("work_date") ?? "") || null,
    created_by: user?.id,
  });

  revalidatePath("/admin/customer-pages");
}

export async function deleteManualProject(id: string) {
  const supabase = await createClient();
  await supabase.from("customer_projects").delete().eq("id", id);
  revalidatePath("/admin/customer-pages");
}

export async function addManualProjectPhoto(customerProjectId: string, formData: FormData) {
  const imageUrl = String(formData.get("image_url") ?? "").trim();
  if (!imageUrl) return;

  const supabase = await createClient();
  await supabase.from("customer_project_photos").insert({
    customer_project_id: customerProjectId,
    image_url: imageUrl,
    caption: String(formData.get("caption") ?? "").trim() || null,
  });

  revalidatePath("/admin/customer-pages");
}

export async function deleteManualProjectPhoto(id: string) {
  const supabase = await createClient();
  await supabase.from("customer_project_photos").delete().eq("id", id);
  revalidatePath("/admin/customer-pages");
}
