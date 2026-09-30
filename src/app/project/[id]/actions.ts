"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

export async function submitPhotoComment(
  photoId: string,
  isManual: boolean,
  projectId: string,
  formData: FormData
) {
  const message = String(formData.get("message") ?? "").trim();
  if (!message) return;
  const authorName = String(formData.get("author_name") ?? "").trim() || null;

  const supabase = await createClient();
  const table = isManual ? "customer_project_photo_comments" : "work_order_photo_comments";
  const column = isManual ? "customer_project_photo_id" : "work_order_photo_id";
  await supabase.from(table).insert({ [column]: photoId, author_name: authorName, message });

  revalidatePath(`/project/${projectId}`);
}
