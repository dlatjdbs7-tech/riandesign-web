"use server";

import { moveToTrash } from "@/lib/trash";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import type { AsStatus } from "@/lib/types";

function readAsFields(formData: FormData) {
  return {
    title: String(formData.get("title") ?? "").trim(),
    customer_id: String(formData.get("customer_id") ?? "") || null,
    caller_name: String(formData.get("caller_name") ?? "").trim() || null,
    phone: String(formData.get("phone") ?? "").trim() || null,
    address: String(formData.get("address") ?? "").trim() || null,
    description: String(formData.get("description") ?? "").trim() || null,
    request_date:
      String(formData.get("request_date") ?? "") || new Date().toISOString().slice(0, 10),
  };
}

export async function createAsRequest(formData: FormData) {
  const fields = readAsFields(formData);
  if (!fields.title) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase.from("as_requests").insert({ ...fields, created_by: user?.id });

  revalidatePath("/admin/as-requests");
}

// 등록된 AS 요청 내용을 직접 고친다. 저장 후 수정 창을 닫고 목록으로 돌아간다.
export async function updateAsRequest(id: string, formData: FormData) {
  const fields = readAsFields(formData);
  if (!fields.title) return;

  const supabase = await createClient();
  await supabase.from("as_requests").update(fields).eq("id", id);

  revalidatePath("/admin/as-requests");
  redirect("/admin/as-requests");
}

export async function updateAsStatus(id: string, status: AsStatus) {
  const supabase = await createClient();
  await supabase.from("as_requests").update({ status }).eq("id", id);
  revalidatePath("/admin/as-requests");
}

// 목록의 "긴급" 칸에서 바로 켜고 끈다.
export async function updateAsUrgent(id: string, isUrgent: boolean) {
  const supabase = await createClient();
  await supabase.from("as_requests").update({ is_urgent: isUrgent }).eq("id", id);
  revalidatePath("/admin/as-requests");
}

export async function deleteAsRequest(id: string) {
  const supabase = await createClient();
  const trashed = await moveToTrash(supabase, "as_requests", id);
  revalidatePath("/admin/as-requests");
  return trashed;
}
