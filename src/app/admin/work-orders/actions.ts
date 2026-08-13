"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import type { SiteStatus } from "@/lib/types";

// 공사 시작일~종료일을 입력하면 표준 인테리어 공정 9단계로 기간을 자동 배분해 공정표를 만든다.
// 철거가 첫 공정, 마감이 마지막 공정이어야 공사기간/위험도 계산 로직과 맞물린다.
const SCHEDULE_TEMPLATE = [
  { title: "철거", weight: 5 },
  { title: "설비(전기·배관)", weight: 10 },
  { title: "목공", weight: 20 },
  { title: "타일·욕실", weight: 15 },
  { title: "도장", weight: 10 },
  { title: "마루", weight: 10 },
  { title: "도배", weight: 10 },
  { title: "주방·가구", weight: 15 },
  { title: "마감", weight: 5 },
] as const;

function addDaysToDateString(dateStr: string, days: number) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysBetweenInclusive(startStr: string, endStr: string) {
  const s = new Date(`${startStr}T00:00:00Z`).getTime();
  const e = new Date(`${endStr}T00:00:00Z`).getTime();
  return Math.round((e - s) / 86400000) + 1;
}

async function maybeAutoGenerateSchedule(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workOrderId: string,
  startDate: string | null,
  endDate: string | null,
  userId: string | undefined
) {
  if (!startDate || !endDate || startDate >= endDate) return;

  const { count } = await supabase
    .from("work_order_tasks")
    .select("id", { count: "exact", head: true })
    .eq("work_order_id", workOrderId);
  if (count && count > 0) return; // 이미 공정표가 있으면 건드리지 않는다

  const totalDays = daysBetweenInclusive(startDate, endDate);
  if (totalDays < SCHEDULE_TEMPLATE.length) return; // 공정 수보다 기간이 짧으면 자동 생성을 생략

  const dayCounts = SCHEDULE_TEMPLATE.map((p) => Math.max(1, Math.round((totalDays * p.weight) / 100)));
  const diff = totalDays - dayCounts.reduce((a, b) => a + b, 0);
  dayCounts[dayCounts.length - 1] += diff; // 반올림 오차는 마지막 공정(마감)에서 보정

  let cursor = startDate;
  const rows = SCHEDULE_TEMPLATE.map((phase, i) => {
    const phaseStart = cursor;
    const phaseEnd = addDaysToDateString(phaseStart, dayCounts[i] - 1);
    cursor = addDaysToDateString(phaseEnd, 1);
    return {
      work_order_id: workOrderId,
      title: phase.title,
      start_date: phaseStart,
      end_date: phaseEnd,
      display_order: i + 1,
      created_by: userId,
    };
  });

  await supabase.from("work_order_tasks").insert(rows);
  revalidatePath("/admin/field-management/schedule");
}

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

  const workEndDate = String(formData.get("work_end_date") ?? "") || null;

  const { data: created } = await supabase
    .from("work_orders")
    .insert({
      title,
      customer_id: String(formData.get("customer_id") ?? "") || null,
      client_name: String(formData.get("client_name") ?? "").trim() || null,
      site_address: String(formData.get("site_address") ?? "").trim() || null,
      work_date: workDate,
      work_end_date: workEndDate,
      material_order_date: String(formData.get("material_order_date") ?? "") || null,
      description: String(formData.get("description") ?? "").trim() || null,
      assignee_id: assigneeId,
      contract_amount: contractAmount ? Number(contractAmount) : null,
      status,
      created_by: user?.id,
    })
    .select("id")
    .single();

  if (created && status === "in_progress") {
    await maybeAutoGenerateSchedule(supabase, created.id, workDate, workEndDate, user?.id);
  }

  revalidatePath("/admin/work-orders");
  revalidatePath("/admin/sites");
}

export async function updateWorkOrderStatus(id: string, status: SiteStatus) {
  const supabase = await createClient();
  await supabase.from("work_orders").update({ status }).eq("id", id);
  revalidatePath("/admin/work-orders");
  revalidatePath(`/admin/work-orders/${id}`);
  revalidatePath("/admin/sites");
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

    if (field === "work_date" || field === "work_end_date") {
      const { data: order } = await supabase
        .from("work_orders")
        .select("work_date, work_end_date")
        .eq("id", id)
        .single();
      if (order) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        await maybeAutoGenerateSchedule(supabase, id, order.work_date, order.work_end_date, user?.id);
      }
    }
  } else {
    return;
  }

  revalidatePath("/admin/sites");
  revalidatePath("/admin/work-orders");
  revalidatePath(`/admin/work-orders/${id}`);
}

export async function updateWorkOrderScheduleNotes(id: string, value: string) {
  await updateWorkOrderField(id, "schedule_notes", value);
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
