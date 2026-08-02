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
