"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import type { WorkOrderStatus } from "@/lib/types";

export async function createWorkOrderTask(formData: FormData) {
  const workOrderId = String(formData.get("work_order_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  if (!workOrderId || !title) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: last } = await supabase
    .from("work_order_tasks")
    .select("display_order")
    .eq("work_order_id", workOrderId)
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  await supabase.from("work_order_tasks").insert({
    work_order_id: workOrderId,
    title,
    start_date: String(formData.get("start_date") ?? "") || null,
    end_date: String(formData.get("end_date") ?? "") || null,
    display_order: (last?.display_order ?? 0) + 1,
    created_by: user?.id,
  });

  revalidatePath("/admin/field-management/schedule");
}

export async function setWorkOrderTaskManualStatus(id: string, status: WorkOrderStatus) {
  const supabase = await createClient();
  await supabase.from("work_order_tasks").update({ status, auto_status: false }).eq("id", id);
  revalidatePath("/admin/field-management/schedule");
}

export async function setWorkOrderTaskAutoStatus(id: string) {
  const supabase = await createClient();
  await supabase.from("work_order_tasks").update({ auto_status: true }).eq("id", id);
  revalidatePath("/admin/field-management/schedule");
}

export async function deleteWorkOrderTask(id: string) {
  const supabase = await createClient();
  await supabase.from("work_order_tasks").delete().eq("id", id);
  revalidatePath("/admin/field-management/schedule");
}

export async function moveWorkOrderTask(id: string, workOrderId: string, direction: "up" | "down") {
  const supabase = await createClient();
  const { data: tasks } = await supabase
    .from("work_order_tasks")
    .select("id, display_order")
    .eq("work_order_id", workOrderId)
    .order("display_order", { ascending: true });

  if (!tasks) return;
  const index = tasks.findIndex((t) => t.id === id);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || swapIndex < 0 || swapIndex >= tasks.length) return;

  const current = tasks[index];
  const swap = tasks[swapIndex];

  await Promise.all([
    supabase.from("work_order_tasks").update({ display_order: swap.display_order }).eq("id", current.id),
    supabase.from("work_order_tasks").update({ display_order: current.display_order }).eq("id", swap.id),
  ]);

  revalidatePath("/admin/field-management/schedule");
}
