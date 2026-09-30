"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

function isUploadedFile(value: FormDataEntryValue | null): value is File {
  return (
    typeof value === "object" &&
    value !== null &&
    "arrayBuffer" in value &&
    typeof (value as File).arrayBuffer === "function" &&
    typeof (value as File).size === "number"
  );
}

async function uploadProjectPhoto(
  supabase: Awaited<ReturnType<typeof createClient>>,
  formData: FormData
): Promise<string | null> {
  const file = formData.get("photo");
  if (!isUploadedFile(file) || file.size === 0) return null;

  // Supabase Storage 오브젝트 키는 비-ASCII 문자(한글 등)를 거부하므로 안전한 키로 치환한다.
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${Date.now()}-${safeName}`;
  const { error } = await supabase.storage.from("project-photos").upload(path, file);
  if (error) return null;

  return supabase.storage.from("project-photos").getPublicUrl(path).data.publicUrl;
}

export async function addProjectPhoto(workOrderId: string, formData: FormData) {
  const supabase = await createClient();
  const imageUrl = await uploadProjectPhoto(supabase, formData);
  if (!imageUrl) return;

  await supabase.from("work_order_photos").insert({
    work_order_id: workOrderId,
    image_url: imageUrl,
    caption: String(formData.get("caption") ?? "").trim() || null,
    period_start: String(formData.get("period_start") ?? "").trim() || null,
    period_end: String(formData.get("period_end") ?? "").trim() || null,
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
  const supabase = await createClient();
  const imageUrl = await uploadProjectPhoto(supabase, formData);
  if (!imageUrl) return;

  await supabase.from("customer_project_photos").insert({
    customer_project_id: customerProjectId,
    image_url: imageUrl,
    caption: String(formData.get("caption") ?? "").trim() || null,
    period_start: String(formData.get("period_start") ?? "").trim() || null,
    period_end: String(formData.get("period_end") ?? "").trim() || null,
  });

  revalidatePath("/admin/customer-pages");
}

export async function deleteManualProjectPhoto(id: string) {
  const supabase = await createClient();
  await supabase.from("customer_project_photos").delete().eq("id", id);
  revalidatePath("/admin/customer-pages");
}
