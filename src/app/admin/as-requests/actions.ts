"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import type { AsStatus } from "@/lib/types";

export async function createAsRequest(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase.from("as_requests").insert({
    title,
    customer_id: String(formData.get("customer_id") ?? "") || null,
    description: String(formData.get("description") ?? "").trim() || null,
    request_date:
      String(formData.get("request_date") ?? "") || new Date().toISOString().slice(0, 10),
    created_by: user?.id,
  });

  revalidatePath("/admin/as-requests");
}

export async function updateAsStatus(id: string, status: AsStatus) {
  const supabase = await createClient();
  await supabase.from("as_requests").update({ status }).eq("id", id);
  revalidatePath("/admin/as-requests");
}

export async function deleteAsRequest(id: string) {
  const supabase = await createClient();
  await supabase.from("as_requests").delete().eq("id", id);
  revalidatePath("/admin/as-requests");
}
