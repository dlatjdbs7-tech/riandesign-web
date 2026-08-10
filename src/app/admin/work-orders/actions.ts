"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import type { WorkOrderStatus } from "@/lib/types";

export async function createWorkOrder(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const assigneeId = String(formData.get("assignee_id") ?? "") || null;
  const workDate = String(formData.get("work_date") ?? "") || null;

  await supabase.from("work_orders").insert({
    title,
    customer_id: String(formData.get("customer_id") ?? "") || null,
    client_name: String(formData.get("client_name") ?? "").trim() || null,
    site_address: String(formData.get("site_address") ?? "").trim() || null,
    work_date: workDate,
    description: String(formData.get("description") ?? "").trim() || null,
    assignee_id: assigneeId,
    created_by: user?.id,
  });

  revalidatePath("/admin/work-orders");
}

export async function updateWorkOrderStatus(id: string, status: WorkOrderStatus) {
  const supabase = await createClient();
  await supabase.from("work_orders").update({ status }).eq("id", id);
  revalidatePath("/admin/work-orders");
  revalidatePath(`/admin/work-orders/${id}`);
}

export async function updateWorkOrderAssignee(id: string, formData: FormData) {
  const assigneeId = String(formData.get("assignee_id") ?? "") || null;
  const supabase = await createClient();
  await supabase.from("work_orders").update({ assignee_id: assigneeId }).eq("id", id);
  revalidatePath("/admin/work-orders");
  revalidatePath(`/admin/work-orders/${id}`);
}

export async function updateWorkOrderProgress(id: string, formData: FormData) {
  const percent = Math.max(0, Math.min(100, Number(formData.get("progress_percent")) || 0));
  const supabase = await createClient();
  await supabase.from("work_orders").update({ progress_percent: percent }).eq("id", id);
  revalidatePath("/admin/work-orders");
  revalidatePath(`/admin/work-orders/${id}`);
  revalidatePath("/admin");
}

export async function deleteWorkOrder(id: string) {
  const supabase = await createClient();
  await supabase.from("work_orders").delete().eq("id", id);
  revalidatePath("/admin/work-orders");
  redirect("/admin/work-orders");
}

export async function addWorkLog(workOrderId: string | null, formData: FormData) {
  const content = String(formData.get("content") ?? "").trim();
  if (!content) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase.from("work_logs").insert({
    work_order_id: workOrderId,
    author_id: user?.id,
    log_date: String(formData.get("log_date") ?? "") || new Date().toISOString().slice(0, 10),
    content,
  });

  revalidatePath("/admin/work-logs");
  if (workOrderId) revalidatePath(`/admin/work-orders/${workOrderId}`);
}
