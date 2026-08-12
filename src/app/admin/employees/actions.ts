"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import type { ApprovalStatus } from "@/lib/types";

async function updateStatus(id: string, status: ApprovalStatus) {
  const supabase = await createClient();
  await supabase.from("profiles").update({ status }).eq("id", id);
  revalidatePath("/admin/employees");
}

export async function approveEmployee(id: string) {
  await updateStatus(id, "approved");
}

export async function rejectEmployee(id: string) {
  await updateStatus(id, "rejected");
}

export async function updateEmployeeDepartment(id: string, department: string) {
  const supabase = await createClient();
  await supabase.from("profiles").update({ department }).eq("id", id);
  revalidatePath("/admin/employees");
}

export async function updateEmployeeJobRank(id: string, jobRank: string) {
  const supabase = await createClient();
  await supabase
    .from("profiles")
    .update({ job_rank: jobRank || null })
    .eq("id", id);
  revalidatePath("/admin/employees");
  revalidatePath("/admin/team-permissions");
}
