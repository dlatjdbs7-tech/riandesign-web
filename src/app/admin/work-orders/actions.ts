"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import type { SiteStatus } from "@/lib/types";

export async function createWorkOrder(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const assigneeId = String(formData.get("assignee_id") ?? "") || null;
  const workDate = String(formData.get("work_date") ?? "") || null;
  const contractAmount = String(formData.get("contract_amount") ?? "").replace(/,/g, "").trim();
  const status = (String(formData.get("status") ?? "").trim() || "pending") as SiteStatus;

  await supabase.from("work_orders").insert({
    title,
    customer_id: String(formData.get("customer_id") ?? "") || null,
    client_name: String(formData.get("client_name") ?? "").trim() || null,
    site_address: String(formData.get("site_address") ?? "").trim() || null,
    work_date: workDate,
    work_end_date: String(formData.get("work_end_date") ?? "") || null,
    material_order_date: String(formData.get("material_order_date") ?? "") || null,
    description: String(formData.get("description") ?? "").trim() || null,
    assignee_id: assigneeId,
    contract_amount: contractAmount ? Number(contractAmount) : null,
    status,
    created_by: user?.id,
  });

  revalidatePath("/admin/work-orders");
  revalidatePath("/admin/sites");
}

export async function updateWorkOrderStatus(id: string, status: SiteStatus) {
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

export async function updateWorkOrderClientName(id: string, clientName: string) {
  const supabase = await createClient();
  await supabase
    .from("work_orders")
    .update({ client_name: clientName.trim() || null })
    .eq("id", id);
  revalidatePath("/admin/work-orders");
  revalidatePath(`/admin/work-orders/${id}`);
  revalidatePath("/admin/field-management/schedule");
  revalidatePath("/admin/customer-pages");
}

const EDITABLE_TEXT_FIELDS = ["title", "schedule_notes"] as const;
const EDITABLE_NUMBER_FIELDS = [
  "contract_amount",
  "payment_contract",
  "payment_start",
  "payment_interim1",
  "payment_interim2",
  "payment_balance",
] as const;
const EDITABLE_DATE_FIELDS = [
  "work_date",
  "work_end_date",
  "material_order_date",
  "payment_contract_date",
  "payment_start_date",
  "payment_interim1_date",
  "payment_interim2_date",
  "payment_balance_date",
] as const;
export async function updateWorkOrderField(
  id: string,
  field:
    | (typeof EDITABLE_TEXT_FIELDS)[number]
    | (typeof EDITABLE_NUMBER_FIELDS)[number]
    | (typeof EDITABLE_DATE_FIELDS)[number],
  value: string
) {
  const supabase = await createClient();

  if ((EDITABLE_TEXT_FIELDS as readonly string[]).includes(field)) {
    const trimmed = value.trim();
    if (field === "title" && !trimmed) return;
    await supabase.from("work_orders").update({ [field]: trimmed || null }).eq("id", id);
  } else if ((EDITABLE_NUMBER_FIELDS as readonly string[]).includes(field)) {
    const trimmed = value.replace(/,/g, "").trim();
    await supabase
      .from("work_orders")
      .update({ [field]: trimmed ? Number(trimmed) : null })
      .eq("id", id);
  } else if ((EDITABLE_DATE_FIELDS as readonly string[]).includes(field)) {
    await supabase.from("work_orders").update({ [field]: value || null }).eq("id", id);
  } else {
    return;
  }

  revalidatePath("/admin/sites");
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
